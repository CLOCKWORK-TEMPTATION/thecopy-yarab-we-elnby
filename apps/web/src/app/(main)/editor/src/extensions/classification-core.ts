import {
  createConfidenceDropDetector,
  createContentTypeMismatchDetector,
  createReversePatternMismatchDetector,
  createSequenceViolationDetector,
  createSourceHintMismatchDetector,
  createSplitCharacterFragmentDetector,
  createStatisticalAnomalyDetector,
  type SuspicionDetector,
} from "./classification-detectors";
import {
  calculateTotalSuspicion,
  computeEscalationScore,
  extractContextWindow,
  isCriticalMismatchFromFindings,
} from "./classification-scoring";
import { extractTextFeatures } from "./classification-text-features";

import type {
  ClassifiedLine,
  DetectorFinding,
  LLMReviewPacket,
  SuspicionRoutingBand,
  SuspiciousLine,
} from "./classification-types";
import type { SequenceDisagreement } from "./structural-sequence-optimizer";

export interface ReviewerConfig {
  readonly contextRadius: number;
  readonly passBandUpperBound: number;
  readonly localReviewUpperBound: number;
  readonly agentForcedLowerBound: number;
  readonly enabledDetectors: ReadonlySet<string>;
  /** اختلافات Viterbi — بتتحقن كـ findings إضافية لو موجودة */
  readonly viterbiDisagreements?: readonly SequenceDisagreement[];
}

const DEFAULT_CONFIG: ReviewerConfig = {
  contextRadius: 5,
  passBandUpperBound: 65,
  localReviewUpperBound: 80,
  agentForcedLowerBound: 90,
  enabledDetectors: new Set([
    "sequence-violation",
    "source-hint-mismatch",
    "content-type-mismatch",
    "split-character-fragment",
    "statistical-anomaly",
    "confidence-drop",
    "reverse-pattern-mismatch",
    "viterbi-disagreement",
  ]),
};

export class PostClassificationReviewer {
  private readonly config: ReviewerConfig;
  private readonly detectors: readonly SuspicionDetector[];

  constructor(config?: Partial<ReviewerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.detectors = this.initializeDetectors();
  }

  private routeSuspicionBand(score: number): SuspicionRoutingBand {
    if (score < this.config.passBandUpperBound) return "pass";
    if (score < this.config.localReviewUpperBound) return "local-review";
    if (score < this.config.agentForcedLowerBound) return "agent-candidate";
    return "agent-forced";
  }

  private buildSuspicionRecord(
    line: ClassifiedLine,
    findings: readonly DetectorFinding[],
    context: readonly ClassifiedLine[]
  ): SuspiciousLine | null {
    const totalSuspicion = calculateTotalSuspicion(findings);
    const { score, breakdown } = computeEscalationScore(
      line,
      findings,
      totalSuspicion
    );
    const routingBand = this.routeSuspicionBand(score);
    if (routingBand === "pass") return null;

    const distinctDetectors = new Set(
      findings.map((finding) => finding.detectorId)
    ).size;
    const criticalMismatch = isCriticalMismatchFromFindings(findings);

    return {
      line,
      totalSuspicion,
      findings,
      contextLines: context,
      routingBand,
      escalationScore: score,
      distinctDetectors,
      criticalMismatch,
      breakdown,
    };
  }

  private initializeDetectors(): readonly SuspicionDetector[] {
    const allDetectors: readonly SuspicionDetector[] = [
      createSequenceViolationDetector(),
      createSourceHintMismatchDetector(),
      createContentTypeMismatchDetector(),
      createSplitCharacterFragmentDetector(),
      createStatisticalAnomalyDetector(),
      createConfidenceDropDetector(),
      createReversePatternMismatchDetector(),
    ];

    return allDetectors.filter((detector) =>
      this.config.enabledDetectors.has(detector.id)
    );
  }

  review(classifiedLines: readonly ClassifiedLine[]): LLMReviewPacket {
    if (classifiedLines.length === 0) {
      return {
        totalSuspicious: 0,
        totalReviewed: 0,
        suspicionRate: 0,
        suspiciousLines: [],
      };
    }

    const viterbiLookup = new Map<number, DetectorFinding>();
    if (
      this.config.viterbiDisagreements &&
      this.config.enabledDetectors.has("viterbi-disagreement")
    ) {
      for (const d of this.config.viterbiDisagreements) {
        viterbiLookup.set(d.lineIndex, {
          detectorId: "viterbi-disagreement",
          suspicionScore: d.disagreementStrength,
          reason: `Viterbi يقترح "${d.viterbiType}" بدل "${d.forwardType}" — تحسين تسلسلي عالمي`,
          suggestedType: d.viterbiType,
        });
      }
    }

    const rawSuspicious: SuspiciousLine[] = [];

    for (let i = 0; i < classifiedLines.length; i++) {
      const line = classifiedLines[i];
      if (!line) continue;
      const features = extractTextFeatures(line.text);
      const context = extractContextWindow(
        classifiedLines,
        i,
        this.config.contextRadius
      );
      const linePositionInContext =
        i - Math.max(0, i - this.config.contextRadius);

      const findings: DetectorFinding[] = [];
      for (const detector of this.detectors) {
        const finding = detector.detect(
          line,
          features,
          context,
          linePositionInContext
        );
        if (finding) findings.push(finding);
      }

      const viterbiFinding = viterbiLookup.get(line.lineIndex);
      if (viterbiFinding) findings.push(viterbiFinding);

      const suspicious = this.buildSuspicionRecord(line, findings, context);
      if (suspicious) rawSuspicious.push(suspicious);
    }

    const sorted = rawSuspicious.sort(
      (a, b) => b.escalationScore - a.escalationScore
    );

    return {
      totalSuspicious: sorted.length,
      totalReviewed: classifiedLines.length,
      suspicionRate: sorted.length / classifiedLines.length,
      suspiciousLines: sorted,
    };
  }

  reviewSingleLine(
    line: ClassifiedLine,
    surroundingLines: readonly ClassifiedLine[]
  ): SuspiciousLine | null {
    const features = extractTextFeatures(line.text);
    const linePosition = surroundingLines.findIndex(
      (item) => item.lineIndex === line.lineIndex
    );
    if (linePosition === -1) return null;

    const findings: DetectorFinding[] = [];
    for (const detector of this.detectors) {
      const finding = detector.detect(
        line,
        features,
        surroundingLines,
        linePosition
      );
      if (finding) findings.push(finding);
    }
    return this.buildSuspicionRecord(line, findings, surroundingLines);
  }

  formatForLLM(packet: LLMReviewPacket): string {
    if (packet.suspiciousLines.length === 0) return "";

    const sections: string[] = [
      `<review_request count="${packet.totalSuspicious}" total_lines="${packet.totalReviewed}">`,
    ];

    for (const suspicious of packet.suspiciousLines) {
      const {
        line,
        totalSuspicion,
        escalationScore,
        routingBand,
        findings,
        contextLines,
      } = suspicious;

      const contextStr = contextLines
        .map((contextLine) => {
          const marker =
            contextLine.lineIndex === line.lineIndex ? ">>>" : "   ";
          return `${marker} L${contextLine.lineIndex}|${contextLine.assignedType}|${contextLine.text}`;
        })
        .join("\n");

      const reasons = findings.map((finding) => finding.reason).join("؛ ");
      const suggested =
        findings.find((finding) => finding.suggestedType !== null)
          ?.suggestedType ?? "";

      sections.push(
        `<suspect line="${line.lineIndex}" current="${line.assignedType}" suspicion="${totalSuspicion}" escalation="${escalationScore}" band="${routingBand}" suggested="${suggested}">`,
        `<reasons>${reasons}</reasons>`,
        `<context>\n${contextStr}\n</context>`,
        "</suspect>"
      );
    }

    sections.push("</review_request>");
    return sections.join("\n");
  }
}

export default PostClassificationReviewer;

import { buildSuspicionCase } from "@editor/suspicion-engine/aggregation/suspicion-case-builder";
import { createWeightPolicy } from "@editor/suspicion-engine/config";
import { detectCharacterFlow } from "@editor/suspicion-engine/detectors/context/character-flow.detector";
import { detectOrphanDialogue } from "@editor/suspicion-engine/detectors/context/orphan-dialogue.detector";
import { detectSequenceViolation } from "@editor/suspicion-engine/detectors/context/sequence-violation.detector";
import { detectContractBasmalaUniqueness } from "@editor/suspicion-engine/detectors/contract/contract-basmala-uniqueness.detector";
import { detectContractCharacterShape } from "@editor/suspicion-engine/detectors/contract/contract-character-shape.detector";
import { detectContractParentheticalPosition } from "@editor/suspicion-engine/detectors/contract/contract-parenthetical-position.detector";
import { detectContractSceneHeaderSequence } from "@editor/suspicion-engine/detectors/contract/contract-scene-header-sequence.detector";
import { detectContractTransitionIsolation } from "@editor/suspicion-engine/detectors/contract/contract-transition-isolation.detector";
import { detectOcrArtifact } from "@editor/suspicion-engine/detectors/corruption/ocr-artifact.detector";
import { detectSplitCharacter } from "@editor/suspicion-engine/detectors/corruption/split-character.detector";
import { detectWrappedDialogue } from "@editor/suspicion-engine/detectors/corruption/wrapped-dialogue.detector";
import { detectConfidenceAmbiguity } from "@editor/suspicion-engine/detectors/cross-pass/confidence-ambiguity.detector";
import { detectMultiOverride } from "@editor/suspicion-engine/detectors/cross-pass/multi-override.detector";
import { detectReverseConflict } from "@editor/suspicion-engine/detectors/cross-pass/reverse-conflict.detector";
import { detectViterbiConflict } from "@editor/suspicion-engine/detectors/cross-pass/viterbi-conflict.detector";
import { detectActionGateBreak } from "@editor/suspicion-engine/detectors/gate-break/action-gate.detector";
import { detectCharacterGateBreak } from "@editor/suspicion-engine/detectors/gate-break/character-gate.detector";
import { detectDialogueGateBreak } from "@editor/suspicion-engine/detectors/gate-break/dialogue-gate.detector";
import { detectImportProfile } from "@editor/suspicion-engine/detectors/source/import-profile.detector";
import { detectQualityRisk } from "@editor/suspicion-engine/detectors/source/quality-risk.detector";
import { detectSchemaSeedConflict } from "@editor/suspicion-engine/detectors/source/schema-seed-conflict.detector";
import { detectSourceHintMismatch } from "@editor/suspicion-engine/detectors/source/source-hint-mismatch.detector";
import { assembleSuspicionFeatures } from "@editor/suspicion-engine/features/feature-assembler";
import { localDeterministicResolver } from "@editor/suspicion-engine/resolvers/local-deterministic-resolver";
import { localRepairResolver } from "@editor/suspicion-engine/resolvers/local-repair-resolver";
import { noopResolver } from "@editor/suspicion-engine/resolvers/noop-resolver";
import { ResolutionCoordinator } from "@editor/suspicion-engine/resolvers/resolution-coordinator";

import type {
  DetectorFn,
  DetectorContext,
} from "@editor/suspicion-engine/detectors/detector-interface";
import type {
  SuspicionEngineInput,
  SuspicionEngineOutput,
  SuspicionWeightPolicy,
  SuspicionSignal,
  RoutingSummary,
  WeightPolicyProfile,
} from "@editor/suspicion-engine/types";

// ── جميع الكاشفات في ترتيب ثابت ──
const ALL_DETECTORS: readonly DetectorFn[] = [
  detectOrphanDialogue,
  detectCharacterFlow,
  detectSequenceViolation,
  detectDialogueGateBreak,
  detectActionGateBreak,
  detectCharacterGateBreak,
  detectSplitCharacter,
  detectOcrArtifact,
  detectWrappedDialogue,
  detectReverseConflict,
  detectViterbiConflict,
  detectMultiOverride,
  detectConfidenceAmbiguity,
  detectQualityRisk,
  detectImportProfile,
  detectSourceHintMismatch,
  detectSchemaSeedConflict,
  // ── عقد arabic-screenplay-classifier: كاشفات بنيوية صارمة ──
  detectContractCharacterShape,
  detectContractParentheticalPosition,
  detectContractBasmalaUniqueness,
  detectContractSceneHeaderSequence,
  detectContractTransitionIsolation,
];

// ── عدد الجيران لكل اتجاه ──
const NEIGHBOR_WINDOW = 3;

/**
 * @class SuspicionEngine
 * @description
 * المنسّق الرئيسي لمحرك الاشتباه — يُشغّل جميع الكاشفات على كل سطر مصنَّف،
 * يُجمّع الإشارات، يبني حالات الاشتباه، ثم يُحيلها إلى منسّق القرار.
 */
export class SuspicionEngine {
  private readonly detectors: readonly DetectorFn[];
  private readonly policy: SuspicionWeightPolicy;

  constructor(params: {
    readonly detectors: readonly DetectorFn[];
    readonly policy: SuspicionWeightPolicy;
  }) {
    this.detectors = params.detectors;
    this.policy = params.policy;
  }

  analyze(input: SuspicionEngineInput): SuspicionEngineOutput {
    const {
      classifiedLines,
      traces,
      sequenceOptimization,
      extractionQuality: _extractionQuality,
    } = input;
    const totalLines = classifiedLines.length;

    // ── الخطوة 1: تشغيل الكاشفات على كل سطر ──────────────────────────────
    const signalsByLine = new Map<number, SuspicionSignal[]>();

    for (let i = 0; i < totalLines; i++) {
      const line = classifiedLines[i];
      if (line === undefined) continue;
      const trace = traces.get(i);

      // تخطي السطور التي لا تملك trace
      if (trace === undefined) continue;

      // بناء قائمة الجيران (3 قبل + 3 بعد)
      const neighborStart = Math.max(0, i - NEIGHBOR_WINDOW);
      const neighborEnd = Math.min(totalLines - 1, i + NEIGHBOR_WINDOW);
      const neighbors = classifiedLines
        .slice(neighborStart, neighborEnd + 1)
        .filter((_, idx) => idx !== i - neighborStart);

      // جمع traces الجيران
      const neighborTraces = neighbors
        .map((_, idx) => {
          const neighborAbsIdx =
            idx < i - neighborStart
              ? neighborStart + idx
              : neighborStart + idx + 1;
          return traces.get(neighborAbsIdx);
        })
        .filter((t): t is NonNullable<typeof t> => t !== undefined);

      // تجميع المعلومات: دمج disagreements من sequenceOptimization في السياق
      const features = assembleSuspicionFeatures(
        trace,
        i,
        neighbors,
        totalLines
      );

      // بناء DetectorContext
      const detectorContext: DetectorContext = {
        lineIndex: i,
        totalLines,
        neighbors,
        neighborTraces,
        features,
      };

      // تشغيل جميع الكاشفات وجمع الإشارات
      const lineSignals: SuspicionSignal[] = [];
      for (const detector of this.detectors) {
        const signals = detector(trace, line, detectorContext);
        for (const signal of signals) {
          lineSignals.push(signal);
        }
      }

      // إضافة إشارة viterbi-conflict يدوياً من sequenceOptimization إذا لزم
      // (الكاشف detectViterbiConflict يتعامل مع بيانات الـ trace مباشرة —
      //  نتأكد فقط أن السياق يشمل disagreements المتاحة)
      if (lineSignals.length > 0) {
        signalsByLine.set(i, lineSignals);
      }
    }

    // ── الخطوة 2: بناء حالات الاشتباه لكل سطر يحمل إشارات ────────────────
    const cases = Array.from(signalsByLine.entries()).map(
      ([lineIndex, signals]) => {
        const classifiedLine = classifiedLines[lineIndex];
        const trace = traces.get(lineIndex);

        // trace مضمون لأننا نخطي السطور التي لا تملكه في الخطوة 1
        if (trace === undefined || classifiedLine === undefined) {
          throw new Error(
            `[SuspicionEngine] trace or classifiedLine missing for lineIndex ${lineIndex}`
          );
        }

        return buildSuspicionCase({
          lineIndex,
          classifiedLine,
          trace,
          signals,
          policy: this.policy,
        });
      }
    );

    // ── الخطوة 3: إنشاء منسّق القرار وتشغيله ─────────────────────────────
    const coordinator = new ResolutionCoordinator([
      localDeterministicResolver,
      localRepairResolver,
      noopResolver,
    ]);

    const actions = coordinator.resolvePreRender(cases);

    // ── الخطوة 4: بناء ملخص التوجيه ──────────────────────────────────────
    const routing: RoutingSummary = coordinator.buildRoutingSummary(
      cases,
      actions
    );

    // suppressor: sequenceOptimization متاح في input للكاشفات عبر traces
    void sequenceOptimization;

    return { cases, routing, actions };
  }
}

/**
 * مصنع المحرك الافتراضي — يُسجّل جميع الكاشفات مع السياسة المحددة.
 *
 * @param profileName - اسم البروفايل (افتراضي: 'balanced-paste')
 */
export function createDefaultSuspicionEngine(
  profileName: WeightPolicyProfile = "balanced-paste"
): SuspicionEngine {
  const policy = createWeightPolicy(profileName);
  return new SuspicionEngine({
    detectors: ALL_DETECTORS,
    policy,
  });
}

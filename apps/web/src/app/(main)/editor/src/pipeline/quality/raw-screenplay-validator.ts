import { normalizeLine } from "../../extensions/text-utils";

import type {
  ClassifiedLine,
  ElementType,
} from "../../extensions/classification-types";

export type ValidatorSeverity = "low" | "medium" | "high";

export type ValidatorIssueCode =
  | "empty-line"
  | "page-number-artifact"
  | "header-footer-artifact"
  | "garbled-symbol-ratio"
  | "broken-arabic-tokenization"
  | "repeated-punctuation-noise"
  | "suspicious-dialogue-cue-missing-colon"
  | "merged-speaker-dialogue-action"
  | "merged-action-dialogue"
  | "very-short-fragment"
  | "latin-heavy-in-arabic-context";

export interface PipelineLineRef {
  readonly lineIndex: number;
  readonly text: string;
  readonly pageIndex?: number;
  readonly pageLineIndex?: number;
}

export interface LineQualitySignals {
  readonly normalized: string;
  readonly length: number;
  readonly tokenCount: number;
  readonly arabicCharCount: number;
  readonly latinCharCount: number;
  readonly digitCount: number;
  readonly punctuationCount: number;
  readonly symbolNoiseCount: number;
  readonly arabicRatio: number;
  readonly symbolNoiseRatio: number;
  readonly repeatedPunctuationRuns: number;
  readonly brokenArabicSpacingHits: number;
}

export interface ValidatorIssue {
  readonly lineIndex: number;
  readonly pageIndex?: number;
  readonly pageLineIndex?: number;
  readonly code: ValidatorIssueCode;
  readonly severity: ValidatorSeverity;
  readonly score: number; // 0..100
  readonly reason: string;
  readonly suggestedType?: ElementType;
}

export interface RawValidationResult {
  readonly issues: ValidatorIssue[];
  readonly suspiciousLineIndexes: number[];
  readonly lineScores: ReadonlyMap<number, number>;
  readonly scoreByPageIndex: ReadonlyMap<number, number>;
}

export interface ValidateRawLinesOptions {
  /**
   * لو true سيضيف قواعد أكثر صرامة مناسبة لملفات PDF المولّدة من OCR.
   */
  readonly pdfMode?: boolean;
  /** حد التصعيد النهائي للسطر ليُعتبر مشبوهاً */
  readonly suspiciousThreshold?: number;
  /** خطوط متوقعة أنها هيدر/فوتر ثابت لتقليل الضوضاء */
  readonly knownHeaderFooterLines?: readonly string[];
  /**
   * نافذة مرجعية للسياق (اختياري) — إذا أُرسلت نتائج التصنيف يمكننا تحسين كشف دمج الحوار/الأكشن.
   */
  readonly classifiedLines?: readonly ClassifiedLine[];
}

const ARABIC_CHAR_RE = /[؀-ۿ]/g;
const LATIN_CHAR_RE = /[A-Za-z]/g;
const DIGIT_RE = /[0-9٠-٩]/g;
const PUNCT_RE = /[.,،؛;:!?؟()\x5B\x5D{}"'«»…\-–—]/g;
const SYMBOL_NOISE_RE =
  /[^؀-ۿA-Za-z0-9٠-٩\s.,،؛;:!?؟()\x5B\x5D{}"'«»…\-–—/\\]/g;
const PAGE_NUMBER_ONLY_RE = /^\s*(?:صفحة\s*)?\d{1,4}\s*(?:\/\s*\d{1,4})?\s*$/;
const HEADER_FOOTER_LIKE_RE =
  /^(?:copyright|all rights reserved|www\.|https?:\/\/|\d{1,2}\s*[-–/]\s*\d{1,2}\s*[-–/]\s*\d{2,4})$/i;
const REPEATED_PUNCT_RE = /([.!?؟،,:;…\-–—])\1{2,}/g;

const COMMON_ARABIC_GARBLED_SEPARATION_RE =
  /(?:\b[اأإآبتثجحخدذرزسشصضطظعغفقكلمنهوي]{1}\s){3,}[اأإآبتثجحخدذرزسشصضطظعغفقكلمنهوي]{1}\b/;

const SPEAKER_NAME_WITHOUT_COLON_RE =
  /^(?:[اأإآء-ي]{2,}(?:\s+[اأإآء-ي]{2,}){0,3})\s+(?:بيقول|قال|تقول|يقول|ترد|يرد|تسأل|يسأل|بص|بصي|اسمع|اسمعي)\b/;

const EMBEDDED_SPEAKER_COLON_RE =
  /\b[اأإآء-ي]{2,}(?:\s+[اأإآء-ي]{2,}){0,3}\s*:\s+/;

const ACTION_VERB_AFTER_THEN_RE =
  /\b(?:ثم|و(?:هو|هي)?|ف(?:هو|هي)?)\s+(?:ي|ت)[اأإآء-ي]{2,}\b/;

function countMatches(input: string, re: RegExp): number {
  const matches = input.match(re);
  return matches ? matches.length : 0;
}

export function computeLineQualitySignals(text: string): LineQualitySignals {
  const normalized = normalizeLine(text ?? "");
  const length = normalized.length;
  const tokenCount = normalized
    ? normalized.split(/\s+/).filter(Boolean).length
    : 0;
  const arabicCharCount = countMatches(normalized, ARABIC_CHAR_RE);
  const latinCharCount = countMatches(normalized, LATIN_CHAR_RE);
  const digitCount = countMatches(normalized, DIGIT_RE);
  const punctuationCount = countMatches(normalized, PUNCT_RE);
  const symbolNoiseCount = countMatches(normalized, SYMBOL_NOISE_RE);

  const nonSpaceLength = Math.max(1, normalized.replace(/\s+/g, "").length);
  const arabicRatio = arabicCharCount / nonSpaceLength;
  const symbolNoiseRatio = symbolNoiseCount / nonSpaceLength;
  const repeatedPunctuationRuns = countMatches(normalized, REPEATED_PUNCT_RE);
  const brokenArabicSpacingHits = COMMON_ARABIC_GARBLED_SEPARATION_RE.test(
    normalized
  )
    ? 1
    : 0;

  return {
    normalized,
    length,
    tokenCount,
    arabicCharCount,
    latinCharCount,
    digitCount,
    punctuationCount,
    symbolNoiseCount,
    arabicRatio,
    symbolNoiseRatio,
    repeatedPunctuationRuns,
    brokenArabicSpacingHits,
  };
}

export function looksLikePageNumberArtifact(text: string): boolean {
  const normalized = normalizeLine(text);
  if (!normalized) return false;
  return PAGE_NUMBER_ONLY_RE.test(normalized);
}

export function looksLikeHeaderFooterArtifact(
  text: string,
  knownHeaderFooterLines: readonly string[] = []
): boolean {
  const normalized = normalizeLine(text);
  if (!normalized) return false;

  if (knownHeaderFooterLines.some((x) => normalizeLine(x) === normalized)) {
    return true;
  }
  if (HEADER_FOOTER_LIKE_RE.test(normalized)) return true;

  // هيدر/فوتر شائع: سطر قصير جدًا يحتوي اسم ملف/رابط/تاريخ فقط
  if (
    normalized.length <= 40 &&
    /(\.pdf\b|\.docx\b|@|https?:\/\/|www\.)/i.test(normalized)
  ) {
    return true;
  }

  return false;
}

export function looksLikeMergedSpeakerDialogueAction(text: string): boolean {
  const normalized = normalizeLine(text);
  if (!normalized) return false;
  if (!EMBEDDED_SPEAKER_COLON_RE.test(normalized)) return false;

  const hasActionTail =
    /\b(?:وهو|وهي|ثم|فت|فيقوم|فتقوم|ينهض|تنهض|يتجه|تتجه|ينظر|تنظر|يخرج|تخرج)\b/.test(
      normalized
    ) || ACTION_VERB_AFTER_THEN_RE.test(normalized);

  if (!hasActionTail) return false;

  // مسافة آمنة لتجنب false positives في الحوارات القصيرة
  return normalized.length >= 60;
}

export function looksLikeMergedActionDialogue(text: string): boolean {
  const normalized = normalizeLine(text);
  if (!normalized) return false;

  // أكشن طويل ثم اسم شخصية + نقطتين في المنتصف
  const hasEmbeddedSpeaker = EMBEDDED_SPEAKER_COLON_RE.test(normalized);
  if (!hasEmbeddedSpeaker) return false;

  const startsLikeAction =
    /^(?:ثم|و|ف)?\s*(?:ي|ت)[اأإآء-ي]{2,}\b/.test(normalized) ||
    /^(?:ترفع|ينظر|تنهض|يجلس|تجلس|يدخل|تدخل|يخرج|تخرج)\b/.test(normalized);

  return startsLikeAction && normalized.length >= 50;
}

interface PushIssueInput {
  code: ValidatorIssueCode;
  severity: ValidatorSeverity;
  score: number;
  reason: string;
  suggestedType?: ElementType;
}

function pushIssue(
  bucket: ValidatorIssue[],
  ref: PipelineLineRef,
  issue: PushIssueInput
): void {
  bucket.push({
    lineIndex: ref.lineIndex,
    ...(ref.pageIndex !== undefined ? { pageIndex: ref.pageIndex } : {}),
    ...(ref.pageLineIndex !== undefined
      ? { pageLineIndex: ref.pageLineIndex }
      : {}),
    code: issue.code,
    severity: issue.severity,
    score: issue.score,
    reason: issue.reason,
    ...(issue.suggestedType !== undefined
      ? { suggestedType: issue.suggestedType }
      : {}),
  });
}

function checkStructuralArtifacts(
  bucket: ValidatorIssue[],
  ref: PipelineLineRef,
  normalized: string,
  knownHeaderFooterLines: readonly string[] | undefined
): void {
  if (looksLikePageNumberArtifact(normalized)) {
    pushIssue(bucket, ref, {
      code: "page-number-artifact",
      severity: "medium",
      score: 28,
      reason: "يبدو رقم صفحة/ترقيمًا دخيلًا",
    });
  }

  if (looksLikeHeaderFooterArtifact(normalized, knownHeaderFooterLines)) {
    pushIssue(bucket, ref, {
      code: "header-footer-artifact",
      severity: "medium",
      score: 25,
      reason: "يبدو هيدر/فوتر متكررًا",
    });
  }
}

function checkNoiseSignals(
  bucket: ValidatorIssue[],
  ref: PipelineLineRef,
  signals: LineQualitySignals,
  pdfMode: boolean
): void {
  if (signals.symbolNoiseRatio >= 0.18 && signals.length >= 8) {
    pushIssue(bucket, ref, {
      code: "garbled-symbol-ratio",
      severity: signals.symbolNoiseRatio >= 0.28 ? "high" : "medium",
      score: Math.min(80, Math.round(signals.symbolNoiseRatio * 220)),
      reason: `نسبة رموز/أحرف غير متوقعة مرتفعة (${signals.symbolNoiseRatio.toFixed(2)})`,
    });
  }

  if (signals.brokenArabicSpacingHits > 0) {
    pushIssue(bucket, ref, {
      code: "broken-arabic-tokenization",
      severity: "high",
      score: 60,
      reason: "تفكيك عربي غير منطقي (غالبًا OCR فصل الحروف/الكلمات بشكل خاطئ)",
    });
  }

  if (signals.repeatedPunctuationRuns > 0 && signals.length <= 14) {
    pushIssue(bucket, ref, {
      code: "repeated-punctuation-noise",
      severity: "medium",
      score: 24,
      reason: "علامات ترقيم متكررة بشكل ضوضائي في سطر قصير",
    });
  }

  if (
    signals.tokenCount <= 2 &&
    signals.length > 0 &&
    signals.length <= 3 &&
    signals.arabicCharCount > 0
  ) {
    pushIssue(bucket, ref, {
      code: "very-short-fragment",
      severity: "low",
      score: 12,
      reason: "شظية قصيرة جدًا قد تكون نتيجة قص/فصل OCR",
    });
  }

  if (
    pdfMode &&
    signals.arabicCharCount > 0 &&
    signals.latinCharCount >= 4 &&
    signals.latinCharCount > signals.arabicCharCount
  ) {
    pushIssue(bucket, ref, {
      code: "latin-heavy-in-arabic-context",
      severity: "medium",
      score: 22,
      reason: "هيمنة أحرف لاتينية في سطر عربي محتمل (قد تكون قراءة OCR خاطئة)",
    });
  }
}

function checkMergePatterns(
  bucket: ValidatorIssue[],
  ref: PipelineLineRef,
  normalized: string
): void {
  if (SPEAKER_NAME_WITHOUT_COLON_RE.test(normalized)) {
    pushIssue(bucket, ref, {
      code: "suspicious-dialogue-cue-missing-colon",
      severity: "medium",
      score: 32,
      reason:
        "اسم شخصية/صيغة حوار متوقعة بدون ':' — قد يكون فقدان علامات أثناء الاستخراج",
      suggestedType: "character",
    });
  }

  if (looksLikeMergedSpeakerDialogueAction(normalized)) {
    pushIssue(bucket, ref, {
      code: "merged-speaker-dialogue-action",
      severity: "high",
      score: 72,
      reason: "يبدو أن الحوار والوصف مدموجان في سطر واحد",
      suggestedType: "dialogue",
    });
  }

  if (looksLikeMergedActionDialogue(normalized)) {
    pushIssue(bucket, ref, {
      code: "merged-action-dialogue",
      severity: "high",
      score: 70,
      reason: "يبدو أن سطر أكشن يحتوي اسم شخصية/حوار مدموجًا داخله",
      suggestedType: "action",
    });
  }
}

function checkClassificationContext(
  bucket: ValidatorIssue[],
  ref: PipelineLineRef,
  normalized: string,
  classified: ClassifiedLine | undefined
): void {
  if (!classified) return;

  if (
    classified.assignedType === "action" &&
    looksLikeMergedActionDialogue(normalized)
  ) {
    pushIssue(bucket, ref, {
      code: "merged-action-dialogue",
      severity: "high",
      score: 78,
      reason: "التصنيف Action + وجود اسم شخصية/نقطتين داخليًا يشير لدمج OCR",
      suggestedType: "action",
    });
  }
  if (
    classified.assignedType === "dialogue" &&
    ACTION_VERB_AFTER_THEN_RE.test(normalized) &&
    normalized.length >= 50
  ) {
    pushIssue(bucket, ref, {
      code: "merged-speaker-dialogue-action",
      severity: "high",
      score: 68,
      reason:
        "التصنيف Dialogue لكن السطر يحتوي امتدادًا وصفيًا قويًا (ثم/وهي + فعل)",
    });
  }
}

export function validateRawScreenplayLines(
  inputLines: readonly (string | PipelineLineRef)[],
  options: ValidateRawLinesOptions = {}
): RawValidationResult {
  const refs: PipelineLineRef[] = inputLines.map((item, idx) =>
    typeof item === "string"
      ? { lineIndex: idx, text: item }
      : {
          lineIndex: item.lineIndex ?? idx,
          text: item.text,
          ...(item.pageIndex !== undefined
            ? { pageIndex: item.pageIndex }
            : {}),
          ...(item.pageLineIndex !== undefined
            ? { pageLineIndex: item.pageLineIndex }
            : {}),
        }
  );

  const issues: ValidatorIssue[] = [];
  const lineScores = new Map<number, number>();
  const pageScoreAccum = new Map<number, number>();
  const suspiciousThreshold = options.suspiciousThreshold ?? 35;
  const classifiedByIndex = new Map<number, ClassifiedLine>();
  (options.classifiedLines ?? []).forEach((c) =>
    classifiedByIndex.set(c.lineIndex, c)
  );

  for (const ref of refs) {
    const normalized = normalizeLine(ref.text);
    const signals = computeLineQualitySignals(normalized);

    if (!normalized) {
      pushIssue(issues, ref, {
        code: "empty-line",
        severity: "low",
        score: 5,
        reason: "سطر فارغ بعد التطبيع",
      });
      continue;
    }

    checkStructuralArtifacts(
      issues,
      ref,
      normalized,
      options.knownHeaderFooterLines
    );
    checkNoiseSignals(issues, ref, signals, options.pdfMode ?? false);
    checkMergePatterns(issues, ref, normalized);
    checkClassificationContext(
      issues,
      ref,
      normalized,
      classifiedByIndex.get(ref.lineIndex)
    );
  }

  // تجميع السكور النهائي لكل سطر مع قصّ أعلى 100
  for (const issue of issues) {
    const prev = lineScores.get(issue.lineIndex) ?? 0;
    const next = Math.min(100, prev + issue.score);
    lineScores.set(issue.lineIndex, next);

    if (typeof issue.pageIndex === "number") {
      const pagePrev = pageScoreAccum.get(issue.pageIndex) ?? 0;
      pageScoreAccum.set(issue.pageIndex, pagePrev + issue.score);
    }
  }

  const suspiciousLineIndexes = Array.from(lineScores.entries())
    .filter(([, score]) => score >= suspiciousThreshold)
    .sort((a, b) => a[0] - b[0])
    .map(([lineIndex]) => lineIndex);

  return {
    issues,
    suspiciousLineIndexes,
    lineScores,
    scoreByPageIndex: pageScoreAccum,
  };
}

export function collectRepeatedHeaderFooterCandidates(
  lines: readonly (string | PipelineLineRef)[],
  minRepeats = 2
): string[] {
  const counts = new Map<string, number>();
  for (const item of lines) {
    const text = typeof item === "string" ? item : item.text;
    const normalized = normalizeLine(text);
    if (!normalized) continue;
    if (normalized.length > 80) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= minRepeats)
    .map(([line]) => line);
}

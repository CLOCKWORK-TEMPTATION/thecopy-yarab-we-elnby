/**
 * @module extensions/self-reflection-pass
 * @description
 * طبقة مراجعة ذاتية دورية أثناء الـ forward pass.
 *
 * كل 6-10 أسطر (أو عند scene break)، النظام يوقف ويراجع الـ chunk الأخير
 * بالسياق المتراكم الجديد. الفرق عن الـ retroactive corrector:
 * الـ self-reflection بتحصل **أثناء** التصنيف — فـ التصحيحات بتأثر على الأسطر اللي بعدها.
 *
 * يُصدّر:
 * - {@link SELF_REFLECTION_CHUNK_SIZE} — حجم الـ chunk الافتراضي
 * - {@link shouldReflect} — هل حان وقت المراجعة؟
 * - {@link reflectOnChunk} — مراجعة chunk من الأسطر المصنّفة
 *
 * يُستهلك في {@link PasteClassifier} → `classifyLines()` داخل الـ forward loop.
 */

import { logger } from "../utils/logger";

import { collectActionEvidence } from "./action";
import { CLASSIFICATION_VALID_SEQUENCES } from "./classification-sequence-rules";
import { hasDirectDialogueCues } from "./dialogue";
import { pipelineRecorder } from "./pipeline-recorder";
import {
  normalizeLine,
  normalizeCharacterName,
  isActionVerbStart,
  hasActionVerbStructure,
  isActionCueLine,
  startsWithBullet,
} from "./text-utils";

import type { ClassifiedDraft, ElementType } from "./classification-types";
import type { ContextMemoryManager } from "./context-memory-manager";
import type { DocumentContextGraph } from "./document-context-graph";

const reflectionLogger = logger.createScope("self-reflection");

// ─── ثوابت ─────────────────────────────────────────────────────────

/** حجم الـ chunk الافتراضي — كل 8 أسطر نراجع */
export const SELF_REFLECTION_CHUNK_SIZE = 8;

/** أقل عدد أسطر في chunk يستحق مراجعة */
const MIN_CHUNK_FOR_REFLECTION = 3;

// ─── أدوات مساعدة ──────────────────────────────────────────────────

/** عدد كلمات السطر */
const wordCount = (text: string): number =>
  normalizeLine(text).split(/\s+/).filter(Boolean).length;

/** هل السطر فيه مؤشرات action قوية جداً (dash/bullet/cue)؟ */
const hasVeryStrongActionSignal = (text: string): boolean => {
  const normalized = normalizeLine(text);
  if (!normalized) return false;
  if (/^[-–—]/.test(normalized)) return true;
  if (startsWithBullet(normalized)) return true;
  return isActionCueLine(normalized);
};

/** هل هناك character قريب (خلال lookback أسطر للخلف)؟ */
const lookBackForCharacter = (
  classified: readonly ClassifiedDraft[],
  fromIndex: number,
  lookback: number
): boolean => {
  const start = Math.max(0, fromIndex - lookback);
  for (let i = fromIndex - 1; i >= start; i--) {
    const item = classified[i];
    if (item?.type === "character") return true;
  }
  return false;
};

/** هل النوع الجديد يعدّي sequence rules بالنسبة للنوع السابق؟ */
const isValidSequenceTransition = (
  prevType: ElementType | null,
  newType: ElementType
): boolean => {
  if (!prevType) return true;
  const validNext = CLASSIFICATION_VALID_SEQUENCES.get(prevType);
  if (!validNext) return true;
  return validNext.has(newType);
};

/** فحص سريع: هل السطر عنده evidence لنوع معين؟ */
const quickEvidenceCheck = (
  line: string,
  candidateType: ElementType
): number => {
  const normalized = normalizeLine(line);
  if (!normalized) return 0;

  if (candidateType === "action") {
    const ev = collectActionEvidence(normalized);
    let score = 0;
    if (ev.byVerb) score += 2;
    if (ev.byStructure) score += 1;
    if (ev.byPattern) score += 1;
    if (ev.byDash) score += 2;
    return score;
  }

  if (candidateType === "dialogue") {
    let score = 0;
    if (hasDirectDialogueCues(normalized)) score += 3;
    if (/[؟?!]/.test(normalized)) score += 1;
    return score;
  }

  return 0;
};

// ─── إنشاء draft مُصحّح ───────────────────────────────────────────

const correctedDraft = (
  original: ClassifiedDraft,
  newType: ElementType,
  confidenceBoost: number
): ClassifiedDraft => ({
  ...original,
  type: newType,
  confidence: Math.min(95, original.confidence + confidenceBoost),
  classificationMethod: "context",
});

// ─── الدوال المُصدّرة ─────────────────────────────────────────────

/**
 * هل حان وقت المراجعة الذاتية؟
 *
 * @param classifiedInChunk - عدد الأسطر المصنّفة في الـ chunk الحالي
 * @param lastClassifiedType - آخر نوع تم تصنيفه
 * @param chunkSize - حجم الـ chunk (افتراضي 8)
 * @returns `true` إذا لازم نراجع
 */
export const shouldReflect = (
  classifiedInChunk: number,
  lastClassifiedType: ElementType,
  chunkSize: number = SELF_REFLECTION_CHUNK_SIZE
): boolean => {
  // مراجعة عند حد الـ chunk
  if (classifiedInChunk >= chunkSize) return true;
  // مراجعة إجبارية عند scene break (لو عدّينا الحد الأدنى)
  if (
    lastClassifiedType === "scene_header_top_line" &&
    classifiedInChunk >= MIN_CHUNK_FOR_REFLECTION
  ) {
    return true;
  }
  return false;
};

const applyDialogueWithoutSpeakerCorrection = (
  classified: ClassifiedDraft[],
  index: number,
  draft: ClassifiedDraft,
  line: string
): boolean => {
  if (draft.type !== "dialogue") return false;

  const hasNearbyCharacter = lookBackForCharacter(classified, index, 5);
  if (
    hasNearbyCharacter ||
    (!isActionVerbStart(line) && !hasActionVerbStructure(line)) ||
    hasDirectDialogueCues(line) ||
    wordCount(line) < 3
  ) {
    return false;
  }

  classified[index] = correctedDraft(draft, "action", 5);
  return true;
};

const applyActionAfterCharacterCorrection = (
  classified: ClassifiedDraft[],
  index: number,
  draft: ClassifiedDraft,
  line: string
): boolean => {
  if (draft.type !== "action" || index <= 0) return false;

  const prev = classified[index - 1];
  if (prev?.type !== "character" || hasVeryStrongActionSignal(line)) {
    return false;
  }

  classified[index] = correctedDraft(draft, "dialogue", 4);
  return true;
};

interface UnconfirmedCharacterCorrectionContext {
  classified: ClassifiedDraft[];
  index: number;
  chunkEnd: number;
  draft: ClassifiedDraft;
  line: string;
  memoryManager: ContextMemoryManager;
}

const applyUnconfirmedCharacterCorrection = ({
  classified,
  index,
  chunkEnd,
  draft,
  line,
  memoryManager,
}: UnconfirmedCharacterCorrectionContext): boolean => {
  if (draft.type !== "character" || index + 1 >= chunkEnd) return false;

  const next = classified[index + 1];
  const name = normalizeCharacterName(line);
  const isConfirmed = name ? memoryManager.isConfirmedCharacter(name) : false;
  const hasDialogueFollower =
    next?.type === "dialogue" || next?.type === "parenthetical";

  if (isConfirmed || hasDialogueFollower) return false;
  if (!hasActionVerbStructure(line) && wordCount(line) < 5) return false;

  classified[index] = correctedDraft(draft, "action", 3);
  return true;
};

const applyConfidenceDropCorrection = (
  classified: ClassifiedDraft[],
  index: number,
  chunkEnd: number,
  draft: ClassifiedDraft,
  line: string
): boolean => {
  if (draft.confidence >= 78 || index <= 0 || index + 1 >= chunkEnd) {
    return false;
  }

  const prev = classified[index - 1];
  const next = classified[index + 1];
  const neighborType = prev?.type;
  if (
    !prev ||
    !next ||
    neighborType !== next.type ||
    prev.confidence < 85 ||
    next.confidence < 85 ||
    neighborType === draft.type
  ) {
    return false;
  }

  const prevPrev = index > 1 ? classified[index - 2] : null;
  const seqValid = isValidSequenceTransition(
    prevPrev ? prevPrev.type : null,
    neighborType
  );
  const evidence = seqValid ? quickEvidenceCheck(line, neighborType) : 0;
  if (evidence <= 0) return false;

  classified[index] = correctedDraft(draft, neighborType, 3);
  return true;
};

/**
 * مراجعة ذاتية على chunk من الأسطر المصنّفة.
 *
 * 4 فحوصات:
 * 1. Dialogue بدون Speaker + فيه action verb → action
 * 2. Action بعد Character مباشرة بدون strong signal → dialogue
 * 3. Character غير مؤكد بدون حوار بعده → action
 * 4. Confidence Drop: سطر ضعيف محاط بجيران متفقين → نوع الجيران
 *
 * @param classified - المصفوفة الكاملة (بيتعدّل in-place)
 * @param chunkStart - بداية الـ chunk (inclusive)
 * @param chunkEnd - نهاية الـ chunk (exclusive)
 * @param memoryManager - مدير الذاكرة (لتحديث بعد التصحيح)
 * @param _dcg - خريطة سياق المستند (محجوز للاستخدام المستقبلي)
 * @returns عدد التصحيحات
 */
export const reflectOnChunk = (
  classified: ClassifiedDraft[],
  chunkStart: number,
  chunkEnd: number,
  memoryManager: ContextMemoryManager,
  _dcg?: DocumentContextGraph
): number => {
  pipelineRecorder.trackFile("self-reflection-pass.ts");
  if (chunkEnd - chunkStart < MIN_CHUNK_FOR_REFLECTION) return 0;

  let corrections = 0;

  for (let i = chunkStart; i < chunkEnd; i++) {
    const draft = classified[i];
    if (draft?.text === undefined) continue;
    const line = normalizeLine(draft.text);
    if (!line) continue;

    const corrected =
      applyDialogueWithoutSpeakerCorrection(classified, i, draft, line) ||
      applyActionAfterCharacterCorrection(classified, i, draft, line) ||
      applyUnconfirmedCharacterCorrection({
        classified,
        index: i,
        chunkEnd,
        draft,
        line,
        memoryManager,
      }) ||
      applyConfidenceDropCorrection(classified, i, chunkEnd, draft, line);
    if (corrected) corrections++;
  }

  if (corrections > 0) {
    memoryManager.rebuildFromCorrectedDrafts(classified);
    reflectionLogger.info("chunk-reflected", {
      chunkStart,
      chunkEnd,
      corrections,
    });
  }

  return corrections;
};

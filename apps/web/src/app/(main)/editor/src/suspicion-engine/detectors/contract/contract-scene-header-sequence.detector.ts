import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import type { ContextContradictionEvidence } from "@editor/suspicion-engine/types";
import type { ElementType } from "@editor/extensions/classification-types";
import { createSignal } from "@editor/suspicion-engine/helpers";

/**
 * @module contract/contract-scene-header-sequence.detector
 * @description
 * كاشف عقد تسلسل رؤوس المشهد — يُترجم بنية رؤوس المشهد من عقد
 * `arabic-screenplay-classifier`:
 *
 *   SCENE-HEADER-1 = "مشهد N"          (رقم المشهد)
 *   SCENE-HEADER-2 = "<زمن> - <داخلي/خارجي>"
 *   SCENE-HEADER-3 = "<وصف المكان>"
 *
 * الترتيب الحاكم داخل حزمة رأس المشهد هو H1 → H2 → H3.
 * كل رأس اختياري لكنه إن ظهر وجب أن يكون بعد الرتبة الأقل منه مباشرةً
 * أو يتصدّر الحزمة.
 *
 * الخروقات التي يرصدها الكاشف:
 *
 *  1. `scene_header_2` يسبقه نوع غير `scene_header_1` ولا `action` ولا سطر أول
 *     → المفترض أن يتصل مباشرة برأس-1 أو يكون بداية حزمة جديدة.
 *
 *  2. `scene_header_3` يسبقه نوع غير `scene_header_2` ولا `scene_header_1`
 *     ولا سطر أول → كسر للتسلسل.
 *
 *  3. `scene_header_1` ظهر بعد رأس-2 أو رأس-3 في نفس الحزمة المباشرة
 *     → عكس الترتيب (يعني أن رأس-1 تأخر داخل نفس الحزمة).
 *
 * الفكرة: نفحص الجار السابق المباشر فقط. إذا كان هو أيضًا رأس مشهد
 * من رتبة أعلى أو مساوية، فهذا خرق تسلسلي.
 */

const SCENE_HEADER_RANK: ReadonlyMap<ElementType, number> = new Map<
  ElementType,
  number
>([
  ["scene_header_1", 1],
  ["scene_header_2", 2],
  ["scene_header_3", 3],
]);

function isSceneHeader(type: ElementType | null): boolean {
  return type !== null && SCENE_HEADER_RANK.has(type);
}

export const detectContractSceneHeaderSequence: DetectorFn = (
  trace,
  line,
  context
) => {
  const rank = SCENE_HEADER_RANK.get(line.type);
  if (rank === undefined) return [];

  const { lineIndex } = trace;

  const previousNeighbor = context.neighbors.find(
    (_, idx) => context.neighborTraces[idx]?.lineIndex === lineIndex - 1
  );
  const previousType = previousNeighbor?.type ?? null;

  // ── حالة 1: رأس-2 أو رأس-3 دون سابق منطقي ──
  // رأس-2 يجوز أن يسبقه رأس-1 أو بداية حزمة (action/transition/basmala/null).
  // رأس-3 يجوز أن يسبقه رأس-1 أو رأس-2 أو بداية حزمة.
  if (rank >= 2) {
    const allowedPrecedingRanks: readonly number[] = rank === 2 ? [1] : [1, 2];

    const previousRank = SCENE_HEADER_RANK.get(
      (previousType ?? "") as ElementType
    );

    // إذا كان السابق رأس مشهد لكنه رتبة أعلى أو مساوية ⇒ خرق
    if (previousRank !== undefined && previousRank >= rank) {
      const evidence: ContextContradictionEvidence = {
        signalType: "context-contradiction",
        contradictionType: "scene-header-sequence",
        expectedPrecedingType: rank === 2 ? "scene_header_1" : "scene_header_2",
        actualPrecedingType: previousType,
        windowSize: 1,
      };

      return [
        createSignal<ContextContradictionEvidence>({
          lineIndex,
          family: "context",
          signalType: "context-contradiction",
          score: 0.7,
          reasonCode: "CONTRACT_SCENE_HEADER_OUT_OF_ORDER",
          message: `رأس-${rank} يسبقه رأس-${previousRank} — كسر لترتيب H1→H2→H3`,
          suggestedType: null,
          evidence,
          debug: {
            currentRank: rank,
            previousRank,
            previousType: previousType ?? "none",
          },
        }),
      ];
    }

    // إذا كان السابق رأس مشهد لكنه ليس من الرتب المسموح بها (مثلاً رأس-3 قبل رأس-2)
    if (
      previousRank !== undefined &&
      !allowedPrecedingRanks.includes(previousRank)
    ) {
      const evidence: ContextContradictionEvidence = {
        signalType: "context-contradiction",
        contradictionType: "scene-header-sequence",
        expectedPrecedingType: rank === 2 ? "scene_header_1" : "scene_header_2",
        actualPrecedingType: previousType,
        windowSize: 1,
      };

      return [
        createSignal<ContextContradictionEvidence>({
          lineIndex,
          family: "context",
          signalType: "context-contradiction",
          score: 0.65,
          reasonCode: "CONTRACT_SCENE_HEADER_RANK_SKIP",
          message: `رأس-${rank} لا يتصل بالرتبة الصحيحة المسبقة — السابق رأس-${previousRank}`,
          suggestedType: null,
          evidence,
          debug: {
            currentRank: rank,
            previousRank,
            previousType: previousType ?? "none",
          },
        }),
      ];
    }
  }

  // ── حالة 2: رأس-1 ظهر بعد رأس-2 أو رأس-3 مباشرة داخل نفس الحزمة ──
  if (rank === 1 && isSceneHeader(previousType)) {
    const previousRank = SCENE_HEADER_RANK.get(previousType as ElementType);
    if (previousRank !== undefined && previousRank > rank) {
      const evidence: ContextContradictionEvidence = {
        signalType: "context-contradiction",
        contradictionType: "scene-header-sequence",
        expectedPrecedingType: null,
        actualPrecedingType: previousType,
        windowSize: 1,
      };

      return [
        createSignal<ContextContradictionEvidence>({
          lineIndex,
          family: "context",
          signalType: "context-contradiction",
          score: 0.75,
          reasonCode: "CONTRACT_SCENE_HEADER_1_AFTER_HIGHER_RANK",
          message: `رأس-1 ظهر بعد رأس-${previousRank} مباشرة — عكس ترتيب الحزمة`,
          suggestedType: null,
          evidence,
          debug: {
            currentRank: rank,
            previousRank,
            previousType: previousType ?? "none",
          },
        }),
      ];
    }
  }

  return [];
};

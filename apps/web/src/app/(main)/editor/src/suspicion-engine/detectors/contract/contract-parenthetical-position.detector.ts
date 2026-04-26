import { createSignal } from "@editor/suspicion-engine/helpers";

import type { ElementType } from "@editor/extensions/classification-types";
import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import type { ContextContradictionEvidence } from "@editor/suspicion-engine/types";

/**
 * @module contract/contract-parenthetical-position.detector
 * @description
 * كاشف عقد موضع الـ parenthetical — يُترجم البند الحاكم في عقد
 * `arabic-screenplay-classifier`:
 *
 *   "يظهر عادة قبل سطر DIALOGUE التابع لنفس المتكلم،
 *    ويرتبط بالشخصية السابقة مباشرة ولا يُعتبر CHARACTER جديدًا."
 *
 * يعني ذلك أن السطر المصنّف `parenthetical` يجب أن يسبقه أحد الأنواع التالية
 * مباشرةً (في نافذة جار واحد):
 *
 *   - `character`     → أكثر الحالات طبيعية
 *   - `parenthetical` → إرشاد ثاني متراكم لنفس المتكلم
 *   - `dialogue`      → إرشاد مقحم وسط حوار لنفس المتكلم
 *
 * يرصد هذا الكاشف سطر `parenthetical` يسبقه مباشرة نوع غير صالح
 * (مثل `action` أو `scene_header_*` أو `transition` أو `basmala`) ويُطلق
 * إشارة تناقض سياقي بدرجة مرتفعة لأن هذا الخرق يكسر أحد أصلب
 * بنود العقد البنيوية.
 */

const VALID_PRECEDING_PARENTHETICAL_TYPES: ReadonlySet<ElementType> =
  new Set<ElementType>(["character", "parenthetical", "dialogue"]);

export const detectContractParentheticalPosition: DetectorFn = (
  trace,
  line,
  context
) => {
  if (line.type !== "parenthetical") return [];

  const { lineIndex } = trace;

  // نبحث عن الجار السابق المباشر فقط (lineIndex - 1)
  const previousNeighborIndex = context.neighbors.findIndex(
    (_, idx) => context.neighborTraces[idx]?.lineIndex === lineIndex - 1
  );

  const previousNeighbor =
    previousNeighborIndex >= 0
      ? context.neighbors[previousNeighborIndex]
      : undefined;

  // لا يوجد سطر سابق — يعني أن الـ parenthetical في بداية النص تمامًا،
  // وهذا خرق بحد ذاته لكنه يُغطى عبر اعتبار previousType = null.
  const previousType = previousNeighbor?.type ?? null;

  // إذا كان السابق ضمن الأنواع الصالحة، لا إشارة.
  if (
    previousType !== null &&
    VALID_PRECEDING_PARENTHETICAL_TYPES.has(previousType)
  ) {
    return [];
  }

  const evidence: ContextContradictionEvidence = {
    signalType: "context-contradiction",
    contradictionType: "missing-character-before-dialogue",
    expectedPrecedingType: "character",
    actualPrecedingType: previousType,
    windowSize: 1,
  };

  // درجة مرتفعة لأن موضع الـ parenthetical جزء من العقد البنيوي الصارم.
  return [
    createSignal<ContextContradictionEvidence>({
      lineIndex,
      family: "context",
      signalType: "context-contradiction",
      score: 0.75,
      reasonCode: "CONTRACT_PARENTHETICAL_WRONG_PRECEDING_TYPE",
      message: `إرشاد أدائي (parenthetical) يسبقه نوع غير صالح "${previousType ?? "none"}" — يجب أن يسبقه character/parenthetical/dialogue`,
      suggestedType: "action",
      evidence,
      debug: {
        previousType: previousType ?? "none",
        lineIndex,
      },
    }),
  ];
};

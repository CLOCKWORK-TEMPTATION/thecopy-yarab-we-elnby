import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import type { ContextContradictionEvidence } from "@editor/suspicion-engine/types";
import { createSignal } from "@editor/suspicion-engine/helpers";

/**
 * @module contract/contract-basmala-uniqueness.detector
 * @description
 * كاشف عقد تفرّد البسملة — يُترجم البند الحاكم في عقد
 * `arabic-screenplay-classifier`:
 *
 *   "BASMALA فقط عند غيابها تمامًا يُشار إليها… ولا تكتب «لا يوجد»
 *    داخل التدفق إلا لها."
 *
 * ضمنيًا: في أي نص درامي عربي، البسملة عنصر افتتاحي فريد:
 *
 *  1. تظهر مرة واحدة على الأكثر — أي تكرار لها بعد السطر الأول
 *     هو خرق بنيوي يستوجب مراجعة.
 *
 *  2. تظهر كأول عنصر غير فارغ (lineIndex = 0) — أي بسملة في موضع
 *     متأخر هي إما نص ديكوري مقحم أو خطأ تصنيف.
 *
 * الكاشف يعمل على سطر مُصنَّف `basmala` فقط. يفحص:
 *
 *   - إذا `lineIndex > 0` ⇒ خرق موضع (درجة عالية)
 *   - إذا سبقته بسملة أخرى في الجيران ⇒ خرق تفرّد (درجة قصوى)
 */

export const detectContractBasmalaUniqueness: DetectorFn = (
  trace,
  line,
  context
) => {
  if (line.type !== "basmala") return [];

  const signals = [];
  const { lineIndex } = trace;

  // ── قاعدة 1: البسملة في غير بداية النص ──
  if (lineIndex > 0) {
    const previousNeighbor = context.neighbors.find(
      (_, idx) => context.neighborTraces[idx]?.lineIndex === lineIndex - 1
    );
    const previousType = previousNeighbor?.type ?? null;

    const evidence: ContextContradictionEvidence = {
      signalType: "context-contradiction",
      contradictionType: "scene-header-sequence",
      expectedPrecedingType: null,
      actualPrecedingType: previousType,
      windowSize: lineIndex,
    };

    signals.push(
      createSignal<ContextContradictionEvidence>({
        lineIndex,
        family: "context",
        signalType: "context-contradiction",
        score: 0.85,
        reasonCode: "CONTRACT_BASMALA_NOT_AT_START",
        message: `بسملة في موضع متأخر (lineIndex=${lineIndex}) — يجب أن تكون أول عنصر في النص`,
        suggestedType: "action",
        evidence,
        debug: {
          lineIndex,
          previousType: previousType ?? "none",
        },
      })
    );
  }

  // ── قاعدة 2: بسملة مكررة — نفحص الجيران السابقين ──
  const duplicateBasmalaInNeighbors = context.neighbors.some(
    (neighbor, idx) => {
      const neighborIndex = context.neighborTraces[idx]?.lineIndex ?? -1;
      return neighborIndex < lineIndex && neighbor.type === "basmala";
    }
  );

  if (duplicateBasmalaInNeighbors) {
    const evidence: ContextContradictionEvidence = {
      signalType: "context-contradiction",
      contradictionType: "scene-header-sequence",
      expectedPrecedingType: null,
      actualPrecedingType: "basmala",
      windowSize: context.neighbors.length,
    };

    signals.push(
      createSignal<ContextContradictionEvidence>({
        lineIndex,
        family: "context",
        signalType: "context-contradiction",
        score: 0.95,
        reasonCode: "CONTRACT_BASMALA_DUPLICATE",
        message: `بسملة مكررة في النص — يجب أن تكون البسملة فريدة ضمن السيناريو`,
        suggestedType: "action",
        evidence,
        debug: {
          lineIndex,
        },
      })
    );
  }

  return signals;
};

/**
 * @module extensions/retroactive-corrector
 * @description
 * ممر تصحيح رجعي — يعيد فحص التصنيفات السابقة بناءً على أنماط هيكلية.
 *
 * يعمل بعد الممر الأمامي (forward pass) وقبل نظام الشبهات.
 * لا يستخدم قوائم كلمات ثابتة — كل القواعد مبنية على بنية النص فقط.
 *
 * الأنماط التسعة:
 * 1. action ينتهي بـ `:` + أسطر لاحقة بدون مؤشرات وصف قوية → character + dialogue
 * 2. character متتالية → الثانية dialogue (أو action إذا فيها مؤشرات)
 * 3. dialogue معزول بدون character سابق → فحص الأسطر السابقة لشخصية مخفية
 * 4. كتلة action طويلة (5+) مع سطر ينتهي بـ `:` → character + dialogue
 * 5. character غير مؤكد (مرة واحدة + مش مبذور) + تجمّع → dialogue
 * 6-9. أنماط جديدة (تُفعَّل بـ enableNewPatterns)
 *
 * يُصدّر:
 * - {@link retroactiveCorrectionPass} — الدالة الرئيسية
 */

import { logger } from "../utils/logger";

import { pipelineRecorder } from "./pipeline-recorder";
import {
  applyPattern1_ActionEndingWithColon,
  applyPattern2_ConsecutiveCharacters,
  applyPattern3_IsolatedDialogue,
  applyPattern4_LongActionBlockWithColon,
  applyPattern5_UnconfirmedCharacterCluster,
} from "./retroactive-corrector-patterns-1-5";
import {
  applyPattern6_ActionVerbInDialogueFlow,
  applyPattern7_OrphanedParenthetical,
  applyPattern8_LongTransition,
  applyPattern9_DialogueAfterSceneBreak,
} from "./retroactive-corrector-patterns-6-9";

import type { ClassifiedDraft } from "./classification-types";
import type { ContextMemoryManager } from "./context-memory-manager";

const correctorLogger = logger.createScope("retroactive-corrector");

// ─── الدالة الرئيسية ──────────────────────────────────────────────

/**
 * ممر التصحيح الرجعي — يعيد فحص التصنيفات بعد الممر الأمامي.
 *
 * يُطبّق 9 أنماط بالترتيب (6-9 تحتاج enableNewPatterns=true).
 *
 * @param classified - مصفوفة المسودات المصنفة (تُعدّل في المكان)
 * @param memoryManager - مدير ذاكرة السياق (اختياري)
 * @param enableNewPatterns - تفعيل الأنماط 6–9 (افتراضي: false)
 * @returns عدد التصحيحات الكلية
 */
export const retroactiveCorrectionPass = (
  classified: ClassifiedDraft[],
  memoryManager?: ContextMemoryManager,
  enableNewPatterns = false
): number => {
  pipelineRecorder.trackFile("retroactive-corrector.ts");
  if (classified.length < 2) return 0;

  const before = classified.map((d) => d.type).join(",");

  const preSeeded = memoryManager
    ? memoryManager.getPreSeededCharacters()
    : new Set<string>();

  const c1 = applyPattern1_ActionEndingWithColon(classified, preSeeded);
  const c2 = applyPattern2_ConsecutiveCharacters(classified);
  const c3 = applyPattern3_IsolatedDialogue(classified);
  const c4 = applyPattern4_LongActionBlockWithColon(classified, preSeeded);
  const c5 = applyPattern5_UnconfirmedCharacterCluster(classified, preSeeded);
  const c6 = enableNewPatterns
    ? applyPattern6_ActionVerbInDialogueFlow(classified)
    : 0;
  const c7 = enableNewPatterns
    ? applyPattern7_OrphanedParenthetical(classified)
    : 0;
  const c8 = enableNewPatterns ? applyPattern8_LongTransition(classified) : 0;
  const c9 = enableNewPatterns
    ? applyPattern9_DialogueAfterSceneBreak(classified)
    : 0;

  const totalCorrections = c1 + c2 + c3 + c4 + c5 + c6 + c7 + c8 + c9;

  if (totalCorrections > 0) {
    const after = classified.map((d) => d.type).join(",");
    correctorLogger.info("retroactive-pass-complete", {
      totalCorrections,
      pattern1: c1,
      pattern2: c2,
      pattern3: c3,
      pattern4: c4,
      pattern5: c5,
      pattern6: c6,
      pattern7: c7,
      pattern8: c8,
      pattern9: c9,
      before,
      after,
    });

    if (memoryManager) {
      memoryManager.rebuildFromCorrectedDrafts(classified);
    }
  }

  return totalCorrections;
};

/**
 * @module extensions/paste-classifier/trace-helpers
 *
 * مساعدات تسجيل آثار التصنيف داخل traceCollector:
 * - toRepairRecords: استخراج سجلات الإصلاح من الذاكرة الحية.
 * - recordStageVotes: تسجيل قرار كل سطر كصوت لمرحلة محددة.
 */

import {
  traceCollector,
} from "@editor/suspicion-engine/trace/trace-collector";
import type { LineRepairRecord } from "@editor/suspicion-engine/adapters/from-classifier";
import type { PassStage } from "@editor/suspicion-engine/types";

import type { ClassifiedDraft } from "../classification-types";

/**
 * تحويل خريطة الإصلاحات الحية إلى مصفوفة سجلات قابلة للتمرير
 * إلى محرك الاشتباه.
 */
export const toRepairRecords = (): LineRepairRecord[] => {
  const records: LineRepairRecord[] = [];
  for (const [lineIndex, repairs] of traceCollector.getAllRepairs()) {
    for (const repair of repairs) {
      records.push({ lineIndex, repair });
    }
  }
  return records;
};

/**
 * تسجيل قرار كل سطر مصنف كصوت ضمن مرحلة محددة من passes.
 */
export const recordStageVotes = (
  classified: readonly ClassifiedDraft[],
  stage: PassStage
): void => {
  for (let i = 0; i < classified.length; i++) {
    const line = classified[i]!;
    traceCollector.addVote(i, {
      stage,
      suggestedType: line.type,
      confidence: line.confidence,
      reasonCode: line.classificationMethod,
      metadata: {},
    });
  }
};

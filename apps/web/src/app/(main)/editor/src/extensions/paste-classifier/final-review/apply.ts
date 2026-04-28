/**
 * @module extensions/paste-classifier/final-review/apply
 *
 * تطبيق طبقة المراجعة النهائية على عناصر مصنفة:
 * - normalizeReviewCommandConfidence: تطبيع الثقة لقيم آمنة 0..1.
 * - applyFinalReviewCommand: تطبيق أمر relabel واحد على مصفوفة العناصر.
 * - applyFinalReviewLayer: تنسيق الاستدعاء HTTP وتطبيق commands المُعادة
 *   مع الالتزام الصارم بقواعد الفشل والاستجابات غير القاتلة.
 */

import { formatFinalReviewPacketText } from "@editor/final-review/payload-builder";

import {
  DEFAULT_FINAL_REVIEW_SCHEMA_HINTS,
  FINAL_REVIEW_ENDPOINT,
} from "../../paste-classifier-config";
import { NON_FATAL_FINAL_REVIEW_STATUSES } from "../constants";
import { ProgressivePipelineStageError } from "../errors";

import { selectFinalReviewPayloads } from "./routing";

import type { ClassifiedDraftWithId } from "../../paste-classifier-helpers";
import type {
  AgentCommand,
  FinalReviewRequestPayload,
  FinalReviewResponsePayload,
  FinalReviewSuspiciousLinePayload,
} from "@editor/types/final-review";

/**
 * تطبيع قيمة ثقة قادمة من أمر مراجعة. غير المالية يُعاد fallback.
 */
const normalizeReviewCommandConfidence = (
  confidence: number | undefined,
  fallback: number
): number =>
  typeof confidence === "number" && Number.isFinite(confidence)
    ? Math.max(0, Math.min(1, confidence))
    : fallback;

/**
 * تطبيق أمر relabel واحد. يُرجع true إذا طُبِّق فعلياً.
 */
const applyFinalReviewCommand = (
  drafts: ClassifiedDraftWithId[],
  command: AgentCommand
): boolean => {
  const targetIndex = drafts.findIndex(
    (item) => item._itemId === command.itemId
  );
  if (targetIndex < 0) return false;

  const original = drafts[targetIndex];
  if (!original) return false;

  if (command.op === "relabel") {
    drafts[targetIndex] = {
      ...original,
      type: command.newType,
      confidence: normalizeReviewCommandConfidence(
        command.confidence,
        original.confidence
      ),
      classificationMethod: "ml",
    };
    return true;
  }
  return false;
};

/**
 * طبقة المراجعة النهائية:
 * - لا تفعل شيئاً إذا لا يوجد suspicious lines أو suspiciousLines الفارغ.
 * - تفشل صراحة إذا غاب FINAL_REVIEW_ENDPOINT.
 * - تختار الأهم بـ selectFinalReviewPayloads.
 * - تُعيد المصفوفة الأصلية إذا لم يُطبَّق أي command.
 */
export const applyFinalReviewLayer = async (
  classified: ClassifiedDraftWithId[],
  suspiciousLines: readonly FinalReviewSuspiciousLinePayload[],
  importOpId: string,
  sessionId: string
): Promise<ClassifiedDraftWithId[]> => {
  if (suspiciousLines.length === 0) {
    return classified;
  }
  if (!FINAL_REVIEW_ENDPOINT) {
    throw new ProgressivePipelineStageError(
      "final-review",
      "نقطة /api/final-review غير مضبوطة بينما المراجعة النهائية مطلوبة."
    );
  }

  const selected = selectFinalReviewPayloads(
    suspiciousLines,
    classified.length
  );
  if (selected.length === 0) {
    return classified;
  }

  const requiredItemIds = selected.map((line) => line.itemId);
  const forcedItemIds = selected
    .filter((line) => line.routingBand === "agent-forced")
    .map((line) => line.itemId);

  const requestPayload: FinalReviewRequestPayload = {
    packetVersion: "suspicion-final-review-v1",
    schemaVersion: "arabic-screenplay-classifier-output-v1",
    importOpId,
    sessionId,
    totalReviewed: classified.length,
    suspiciousLines: selected,
    requiredItemIds,
    forcedItemIds,
    schemaHints: DEFAULT_FINAL_REVIEW_SCHEMA_HINTS,
    reviewPacketText: formatFinalReviewPacketText({
      totalReviewed: classified.length,
      requiredItemIds,
      forcedItemIds,
      suspiciousLines,
    }),
  };

  try {
    const { default: axios } = await import("axios");
    const response = await axios.post<FinalReviewResponsePayload>(
      FINAL_REVIEW_ENDPOINT,
      requestPayload,
      { timeout: 180_000 }
    );

    const data = response.data;
    if (!NON_FATAL_FINAL_REVIEW_STATUSES.has(data.status)) {
      throw new ProgressivePipelineStageError(
        "final-review",
        data.message ||
          `المراجعة النهائية أعادت حالة غير مدعومة: ${data.status}`
      );
    }
    if (!data.commands || data.commands.length === 0) {
      return classified;
    }

    const result: ClassifiedDraftWithId[] = [...classified];
    let appliedCommandCount = 0;
    for (const command of data.commands) {
      if (applyFinalReviewCommand(result, command)) {
        appliedCommandCount += 1;
      }
    }

    if (appliedCommandCount === 0) {
      return classified;
    }

    return result;
  } catch (error) {
    throw new ProgressivePipelineStageError(
      "final-review",
      error instanceof Error ? error.message : "فشلت طبقة المراجعة النهائية."
    );
  }
};

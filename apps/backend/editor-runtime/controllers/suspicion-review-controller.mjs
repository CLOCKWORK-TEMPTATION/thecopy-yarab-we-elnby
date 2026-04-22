/**
 * @description متحكم طبقة الشك بالنموذج
 */

import { randomUUID } from "node:crypto";
import {
  SuspicionReviewValidationError,
  requestSuspicionReview,
} from "../suspicion-review.mjs";
import {
  isHttpTypedError,
  readJsonBody,
  sendJson,
} from "../utils/http-helpers.mjs";

export const handleSuspicionReview = async (req, res) => {
  let importOpId = null;
  try {
    const rawBody = await readJsonBody(req);
    importOpId =
      typeof rawBody?.importOpId === "string" ? rawBody.importOpId : null;
    const response = await requestSuspicionReview(rawBody);
    sendJson(res, 200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode =
      error instanceof SuspicionReviewValidationError || isHttpTypedError(error)
        ? error.statusCode
        : 500;
    sendJson(res, statusCode, {
      apiVersion: "1.0",
      importOpId: importOpId ?? "unknown",
      requestId: randomUUID(),
      status: "error",
      reviewedLines: [],
      discoveredLines: [],
      message,
      latencyMs: 0,
    });
  }
};

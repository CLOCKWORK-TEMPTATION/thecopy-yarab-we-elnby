import { randomUUID } from "node:crypto";
import { AgentReviewValidationError, requestReview } from "../agent-review.mjs";
import { isHttpTypedError, readJsonBody, sendJson } from "../utils/http-helpers.mjs";

export const handleAgentReview = async (req, res) => {
  let importOpId = null;

  try {
    const rawBody = await readJsonBody(req);
    importOpId =
      typeof rawBody?.importOpId === "string" ? rawBody.importOpId : null;
    const response = await requestReview(rawBody);
    const httpStatus =
      response.status === "error" &&
      typeof response.providerStatusCode === "number" &&
      response.providerStatusCode >= 400
        ? response.providerStatusCode
        : 200;
    sendJson(res, httpStatus, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const statusCode =
      error instanceof AgentReviewValidationError || isHttpTypedError(error)
        ? error.statusCode
        : 500;

    sendJson(res, statusCode, {
      apiVersion: "2.0",
      mode: "auto-apply",
      importOpId: importOpId ?? "unknown",
      requestId: randomUUID(),
      status: "error",
      commands: [],
      message,
      latencyMs: 0,
    });
  }
};

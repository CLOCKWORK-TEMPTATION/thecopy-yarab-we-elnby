import { test } from "node:test";
import assert from "node:assert/strict";

import {
  requestSuspicionReview,
  validateSuspicionReviewRequestBody,
} from "../suspicion-review.mjs";
import { resolveReviewChannelConfig } from "../provider-config.mjs";

const buildReviewLine = (index, routingBand = "local-review") => ({
  itemId: `item-${index}`,
  lineIndex: index,
  text: `سطر اختبار ${index}`,
  assignedType: "action",
  originalConfidence: 0.6,
  suspicionScore: 40,
  routingBand,
  critical: false,
  primarySuggestedType: "dialogue",
  reasonCodes: ["TEST_SIGNAL"],
  signalMessages: ["حالة اختبار"],
  contextLines: [],
  sourceHints: {
    importSource: "docx",
    sourceMethod: "karank-engine-bridge",
    engineSuggestedType: "action",
  },
});

const buildRequest = (reviewLines) => ({
  apiVersion: "1.0",
  importOpId: "import-test",
  sessionId: "session-test",
  totalReviewed: 120,
  reviewLines,
});

test("suspicion-review يقبل local-review كمدخل للنموذج", () => {
  const request = validateSuspicionReviewRequestBody(
    buildRequest([buildReviewLine(0, "local-review")]),
  );

  assert.equal(request.reviewLines.length, 1);
  assert.equal(request.reviewLines[0].routingBand, "local-review");
});

test("suspicion-review يرفض pass كمدخل للنموذج", () => {
  assert.throws(
    () =>
      validateSuspicionReviewRequestBody(
        buildRequest([buildReviewLine(0, "pass")]),
      ),
    /Invalid routingBand/,
  );
});

test("suspicion-review mock يراجع كل الحالات المرسلة", async () => {
  const previousMockMode = process.env.SUSPICION_REVIEW_MOCK_MODE;
  const previousModel = process.env.SUSPICION_REVIEW_MODEL;
  const previousFallback = process.env.SUSPICION_REVIEW_FALLBACK_MODEL;

  process.env.SUSPICION_REVIEW_MOCK_MODE = "success";
  delete process.env.SUSPICION_REVIEW_MODEL;
  delete process.env.SUSPICION_REVIEW_FALLBACK_MODEL;

  try {
    const response = await requestSuspicionReview(
      buildRequest(
        Array.from({ length: 35 }, (_, index) => buildReviewLine(index)),
      ),
    );

    assert.equal(response.status, "applied");
    assert.equal(response.reviewedLines.length, 35);
    assert.equal(response.model, "claude-opus-4-7");
  } finally {
    if (previousMockMode === undefined) {
      delete process.env.SUSPICION_REVIEW_MOCK_MODE;
    } else {
      process.env.SUSPICION_REVIEW_MOCK_MODE = previousMockMode;
    }
    if (previousModel === undefined) {
      delete process.env.SUSPICION_REVIEW_MODEL;
    } else {
      process.env.SUSPICION_REVIEW_MODEL = previousModel;
    }
    if (previousFallback === undefined) {
      delete process.env.SUSPICION_REVIEW_FALLBACK_MODEL;
    } else {
      process.env.SUSPICION_REVIEW_FALLBACK_MODEL = previousFallback;
    }
  }
});

test("إعداد نموذج الشك مستقل عن نموذج المراجعة النهائية", () => {
  const suspicionConfig = resolveReviewChannelConfig("suspicion-review", {});
  const finalConfig = resolveReviewChannelConfig("final-review", {});

  assert.equal(suspicionConfig.resolvedSpecifier, "anthropic:claude-opus-4-7");
  assert.equal(finalConfig.resolvedSpecifier, "google-genai:gemini-2.5-flash");
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  invokeWithFallback,
  ReviewProviderInvocationError,
} from "../langchain-fallback-chain.mjs";

test("invokeWithFallback يدعم createModel غير المتزامن", async () => {
  const result = await invokeWithFallback({
    channel: "final-review",
    primaryTarget: {
      provider: "google-genai",
      model: "gemini-2.5-flash",
      specifier: "google-genai:gemini-2.5-flash",
      valid: true,
      usable: true,
      credential: {
        valid: true,
        apiKey: "test-key",
      },
    },
    messages: [],
    createModel: async (target) => ({
      async invoke() {
        return {
          content: "ok",
          response_metadata: {
            model: target.model,
            finish_reason: "stop",
          },
          usage_metadata: {
            input_tokens: 11,
            output_tokens: 7,
          },
        };
      },
    }),
    maxRetries: 1,
  });

  assert.equal(result.provider, "google-genai");
  assert.equal(result.model, "gemini-2.5-flash");
  assert.equal(result.text, "ok");
  assert.equal(result.stopReason, "stop");
  assert.equal(result.inputTokens, 11);
  assert.equal(result.outputTokens, 7);
  assert.equal(result.usedFallback, false);
});

test("invokeWithFallback ينتقل إلى البديل بعد فشل مؤقت من الأساسي", async () => {
  const primaryTarget = {
    provider: "google-genai",
    model: "gemini-2.5-flash",
    specifier: "google-genai:gemini-2.5-flash",
    valid: true,
    usable: true,
    credential: {
      valid: true,
      apiKey: "primary-key",
    },
  };

  const fallbackTarget = {
    provider: "deepseek",
    model: "DeepSeek-V3.2",
    specifier: "deepseek:DeepSeek-V3.2",
    valid: true,
    usable: true,
    credential: {
      valid: true,
      apiKey: "fallback-key",
    },
  };

  const result = await invokeWithFallback({
    channel: "final-review",
    primaryTarget,
    fallbackTarget,
    messages: [],
    createModel: async (target) => ({
      async invoke() {
        if (target.provider === "google-genai") {
          const error = new Error("resource_exhausted");
          error.status = 429;
          throw error;
        }

        return {
          content: "fallback-ok",
          response_metadata: {
            model: target.model,
            finish_reason: "stop",
          },
          usage_metadata: {
            input_tokens: 3,
            output_tokens: 2,
          },
        };
      },
    }),
    maxRetries: 1,
  });

  assert.equal(result.provider, "deepseek");
  assert.equal(result.model, "DeepSeek-V3.2");
  assert.equal(result.text, "fallback-ok");
  assert.equal(result.usedFallback, true);
});

test("invokeWithFallback يرفع خطأ نهائيًا عند فشل كل المزوّدات", async () => {
  await assert.rejects(
    () =>
      invokeWithFallback({
        channel: "final-review",
        primaryTarget: {
          provider: "google-genai",
          model: "gemini-2.5-flash",
          specifier: "google-genai:gemini-2.5-flash",
          valid: true,
          usable: true,
          credential: {
            valid: true,
            apiKey: "primary-key",
          },
        },
        messages: [],
        createModel: async () => ({
          async invoke() {
            const error = new Error("invalid_argument");
            error.status = 400;
            throw error;
          },
        }),
        maxRetries: 1,
      }),
    (error) => {
      assert.ok(error instanceof ReviewProviderInvocationError);
      assert.equal(error.status, 400);
      assert.equal(error.temporary, false);
      return true;
    },
  );
});

// اختبار صرامة معالج الأخطاء — لا يجوز ابتلاع الفشل ولا تحويله إلى نجاح.

import { describe, expect, it } from "vitest";

import { ApiError, defaultArabicMessage, statusToErrorCode } from "../errors.js";

describe("statusToErrorCode", () => {
  it("يصنّف 401 كـ auth_required", () => {
    expect(statusToErrorCode(401)).toBe("auth_required");
  });

  it("يصنّف 403 كـ forbidden", () => {
    expect(statusToErrorCode(403)).toBe("forbidden");
  });

  it("يصنّف 422 كـ validation_error", () => {
    expect(statusToErrorCode(422)).toBe("validation_error");
  });

  it("يصنّف 429 كـ quota_exceeded", () => {
    expect(statusToErrorCode(429)).toBe("quota_exceeded");
  });

  it("يصنّف 500+ كـ server_error", () => {
    expect(statusToErrorCode(500)).toBe("server_error");
    expect(statusToErrorCode(502)).toBe("server_error");
    expect(statusToErrorCode(504)).toBe("server_error");
  });
});

describe("defaultArabicMessage", () => {
  it("يوفّر رسالة عربية لكل code", () => {
    const codes = [
      "auth_required",
      "forbidden",
      "validation_error",
      "not_found",
      "conflict",
      "timeout",
      "network_error",
      "server_error",
      "quota_exceeded",
      "model_empty",
      "unknown_error",
    ] as const;
    for (const code of codes) {
      const msg = defaultArabicMessage(code);
      expect(msg.length).toBeGreaterThan(0);
      // اللغة العربية: نتأكد أن الرسالة تحتوي حرفاً عربياً.
      expect(/[؀-ۿ]/.test(msg)).toBe(true);
    }
  });
});

describe("ApiError.toFailure", () => {
  it("يبني ApiFailure من الخطأ", () => {
    const err = new ApiError({
      code: "model_empty",
      message: "النموذج فارغ.",
      requestId: "req_abc",
    });
    const failure = err.toFailure();
    expect(failure.ok).toBe(false);
    expect(failure.error.code).toBe("model_empty");
    expect(failure.error.message).toBe("النموذج فارغ.");
    expect(failure.error.requestId).toBe("req_abc");
  });
});

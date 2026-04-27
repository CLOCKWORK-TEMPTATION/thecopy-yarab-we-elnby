/**
 * اختبارات وحدة — App State API Route [UTP-011]
 *
 * يتحقق من:
 * - Zod validation لمعرّف التطبيق
 * - GET يمرر المعرّف الصحيح
 * - DELETE يمرر المعرّف
 * - رفض المعرّف غير الصالح بـ 400
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── إنشاء ZodError مشترك عبر vi.hoisted لضمان تطابق instanceof ───
const { MockZodError } = vi.hoisted(() => {
  class MockZodError extends Error {
    issues: { code: string; message: string; path: string[] }[];
    constructor(issues: { code: string; message: string; path: string[] }[]) {
      super("Validation error");
      this.name = "ZodError";
      this.issues = issues;
    }
  }
  return { MockZodError };
});

// ─── Mock لـ zod — يستخدم MockZodError المشترك ───
vi.mock("zod", () => ({
  z: {
    ZodError: MockZodError,
    object: () => ({
      parse: (val: unknown) => val,
    }),
    string: () => ({
      parse: (val: unknown) => val,
    }),
  },
  ZodError: MockZodError,
}));

// ─── Mock لـ backend-proxy ───
const mockProxyToBackend = vi.fn();
vi.mock("@/lib/server/backend-proxy", () => ({
  proxyToBackend: (...args: unknown[]) => mockProxyToBackend(...args),
  buildProxyErrorResponse: vi.fn((_error: unknown, message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }),
}));

// ─── Mock لـ app-state-contract — يستخدم MockZodError المشترك ───
vi.mock("@/lib/app-state-contract", () => ({
  AppStateIdSchema: {
    parse: (val: string) => {
      // قبول alphanumeric و hyphens فقط
      if (!/^[a-zA-Z0-9-]+$/.test(val)) {
        throw new MockZodError([
          {
            code: "custom",
            message: "Invalid app ID",
            path: ["app"],
          },
        ]);
      }
      return val;
    },
  },
  AppStatePayloadSchema: {},
}));

import { GET, DELETE } from "../route";

// ─── مساعدات ───

const createCtx = (app: string) => ({
  params: Promise.resolve({ app }),
});

// ═══ اختبارات ═══

describe("GET /api/app-state/:app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  it("يجب أن يمرر معرّف التطبيق الصالح للـ backend", async () => {
    const req = new NextRequest("http://localhost:3000/api/app-state/my-app");

    await GET(req, createCtx("my-app"));

    expect(mockProxyToBackend).toHaveBeenCalledWith(
      req,
      "/api/app-state/my-app"
    );
  });

  it("يجب أن يرفض معرّف غير صالح بـ 400", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/app-state/../../etc"
    );

    const response = await GET(req, createCtx("../../etc"));
    const json: unknown = await response.json();
    const body = json as { success?: boolean };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });
});

describe("DELETE /api/app-state/:app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  it("يجب أن يمرر طلب الحذف بالمعرّف الصحيح", async () => {
    const req = new NextRequest(
      "http://localhost:3000/api/app-state/cleanup-app",
      {
        method: "DELETE",
      }
    );

    await DELETE(req, createCtx("cleanup-app"));

    expect(mockProxyToBackend).toHaveBeenCalledWith(
      req,
      "/api/app-state/cleanup-app"
    );
  });
});

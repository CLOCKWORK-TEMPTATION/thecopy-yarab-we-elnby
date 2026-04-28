/**
 * اختبارات وحدة — Workflow Execute Custom Route [UTP-011]
 *
 * يتحقق من:
 * - رفض body غير JSON بـ 400
 * - رفض body بدون config بـ 400
 * - رفض body بدون input بـ 400
 * - تمرير الطلب الصحيح للـ backend proxy
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock لـ backend-proxy ───
const mockProxyToBackend = vi.fn<(...args: unknown[]) => Promise<Response>>();
const isProxyOptions = (
  value: unknown
): value is { method?: unknown; body?: unknown } =>
  typeof value === "object" && value !== null;

vi.mock("@/lib/server/backend-proxy", () => ({
  proxyToBackend: (...args: unknown[]) => mockProxyToBackend(...args),
  buildProxyErrorResponse: vi.fn((_error: unknown, message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }),
  getBackendBaseUrl: vi.fn(() => "http://localhost:3001"),
}));

import { POST } from "../route";

// ─── مساعدات ───

function createJsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/workflow/execute-custom", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createInvalidRequest(): NextRequest {
  return new NextRequest("http://localhost:3000/api/workflow/execute-custom", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "not-valid-json{{{",
  });
}

// ═══ اختبارات POST /api/workflow/execute-custom ═══

describe("POST /api/workflow/execute-custom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  it("يجب أن يرفض body غير JSON بـ 400", async () => {
    const req = createInvalidRequest();

    const response = await POST(req);
    const body = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("يجب أن يرفض body بدون حقل config بـ 400", async () => {
    const req = createJsonRequest({ input: "some input" });

    const response = await POST(req);
    const body = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("config");
  });

  it("يجب أن يرفض body بدون حقل input بـ 400", async () => {
    const req = createJsonRequest({ config: { model: "gpt-4" } });

    const response = await POST(req);
    const body = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain("input");
  });

  it("يجب أن يرفض body فارغ بـ 400", async () => {
    const req = createJsonRequest(null);

    const response = await POST(req);
    const body = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("يجب أن يمرر الطلب الصحيح للـ backend", async () => {
    const payload = { config: { model: "gpt-4" }, input: "analyze script" };
    const req = createJsonRequest(payload);

    await POST(req);

    expect(mockProxyToBackend).toHaveBeenCalledTimes(1);
    const call = mockProxyToBackend.mock.calls[0];
    expect(call?.[0]).toBe(req);
    expect(call?.[1]).toBe("/api/workflow/execute-custom");

    const proxyOptions = call?.[2];
    expect(isProxyOptions(proxyOptions)).toBe(true);
    if (!isProxyOptions(proxyOptions)) {
      throw new Error("Proxy options are missing");
    }
    expect(proxyOptions.method).toBe("POST");
    expect(typeof proxyOptions.body).toBe("string");
  });

  it("يجب أن يمرر config: null كمفقود ويرفض بـ 400", async () => {
    const req = createJsonRequest({ config: null, input: "test" });

    const response = await POST(req);
    const body = (await response.json()) as {
      success?: boolean;
      error?: string;
    };

    expect(response.status).toBe(400);
    expect(body.error).toContain("config");
  });
});

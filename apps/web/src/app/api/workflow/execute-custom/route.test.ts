/**
 * @fileoverview Tests for POST /api/workflow/execute-custom route
 *
 * The route validates that both `config` and `input` fields are present
 * in the request body before proxying to the backend via `proxyToBackend`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// مراقب وحدة next/server
// Mock the next/server module to prevent real NextResponse/NextRequest usage
// ---------------------------------------------------------------------------
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data: unknown, init?: { status?: number }) => ({
      json: () => data,
      status: init?.status ?? 200,
    })),
  },
  NextRequest: vi.fn(),
}));

// ---------------------------------------------------------------------------
// مراقب مكتبة البروكسي للخادم
// Mock the backend-proxy module so no real network calls are made
// ---------------------------------------------------------------------------
const mockProxyToBackend = vi.fn();
const mockBuildProxyErrorResponse = vi.fn();
const mockGetBackendBaseUrl = vi.fn(() => "http://localhost:3001");

vi.mock("@/lib/server/backend-proxy", () => ({
  proxyToBackend: mockProxyToBackend,
  buildProxyErrorResponse: mockBuildProxyErrorResponse,
  getBackendBaseUrl: mockGetBackendBaseUrl,
}));

// ---------------------------------------------------------------------------
// مساعد — بناء طلب متوافق مع NextRequest للمعالج
// Helper — build a NextRequest-compatible Request for the route handler
// ---------------------------------------------------------------------------
function buildRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/workflow/execute-custom", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/workflow/execute-custom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // اختبار: إرسال طلب صحيح إلى الخادم الخلفي
  // Test: forwards valid request to backend and returns its response
  it("validate-pipeline: forwards valid request to backend and returns its response", async () => {
    const { POST } = await import("./route");
    mockProxyToBackend.mockResolvedValue({ status: 200, body: "success" });

    const request = buildRequest({
      config: { step: 1 },
      input: { data: "test" },
    });
    const response = await POST(request as never);

    expect(mockProxyToBackend).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  // اختبار: إرجاع 400 عند غياب حقل config
  // Test: returns 400 when config field is missing
  it("validate-pipeline: returns 400 when config field is missing", async () => {
    const { POST } = await import("./route");

    const request = buildRequest({ input: { data: "test" } });
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(mockProxyToBackend).not.toHaveBeenCalled();
  });

  // اختبار: إرجاع 400 عند غياب حقل input
  // Test: returns 400 when input field is missing
  it("validate-pipeline: returns 400 when input field is missing", async () => {
    const { POST } = await import("./route");

    const request = buildRequest({ config: { step: 1 } });
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(mockProxyToBackend).not.toHaveBeenCalled();
  });

  // اختبار: إرجاع 400 عندما يكون config صراحة null
  // Test: returns 400 when config is explicitly null
  it("validate-pipeline: returns 400 when config is explicitly null", async () => {
    const { POST } = await import("./route");

    const request = buildRequest({ config: null, input: { data: "test" } });
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(mockProxyToBackend).not.toHaveBeenCalled();
  });

  // اختبار: إرجاع 400 عندما يكون input صراحة null
  // Test: returns 400 when input is explicitly null
  it("validate-pipeline: returns 400 when input is explicitly null", async () => {
    const { POST } = await import("./route");

    const request = buildRequest({ config: { step: 1 }, input: null });
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(mockProxyToBackend).not.toHaveBeenCalled();
  });

  // اختبار: إرجاع 400 عندما لا يكون الجسم JSON صحيح
  // Test: returns 400 when body is not valid JSON
  it("validate-pipeline: returns 400 when body is not valid JSON", async () => {
    const { POST } = await import("./route");

    const request = new Request(
      "http://localhost/api/workflow/execute-custom",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not-valid-json{{{",
      }
    );
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(mockProxyToBackend).not.toHaveBeenCalled();
  });

  // اختبار: إرجاع 400 عندما يكون الجسم فارغاً (ليس كائن)
  // Test: returns 400 when body is empty (non-object)
  it("validate-pipeline: returns 400 when body is empty (non-object)", async () => {
    const { POST } = await import("./route");

    const request = buildRequest([]);
    const response = await POST(request as never);

    expect(response.status).toBe(400);
    expect(mockProxyToBackend).not.toHaveBeenCalled();
  });

  // اختبار: نقل حالة الخطأ 500 من الخادم الخلفي
  // Test: propagates backend 500 error status
  it("validate-pipeline: propagates backend 500 error status", async () => {
    const { POST } = await import("./route");
    mockProxyToBackend.mockResolvedValue({ status: 500, body: "error" });

    const request = buildRequest({
      config: { step: 1 },
      input: { data: "test" },
    });
    const response = await POST(request as never);

    expect(response.status).toBe(500);
  });

  // اختبار: استدعاء buildProxyErrorResponse عند فشل proxyToBackend
  // Test: calls buildProxyErrorResponse when proxyToBackend throws
  it("validate-pipeline: calls buildProxyErrorResponse when proxyToBackend throws", async () => {
    const { POST } = await import("./route");
    mockProxyToBackend.mockRejectedValue(new Error("Backend unavailable"));

    const request = buildRequest({
      config: { step: 1 },
      input: { data: "test" },
    });
    await POST(request as never);

    expect(mockBuildProxyErrorResponse).toHaveBeenCalled();
  });

  // اختبار: HEAD يرجع بيانات وصفية الخدمة
  // Test: HEAD returns service metadata
  it("validate-pipeline: HEAD returns service metadata", async () => {
    const { HEAD } = await import("./route");
    const response = HEAD();

    expect(response.status).toBe(200);
  });
});

/**
 * @fileoverview Tests for GET /api/workflow/presets route
 *
 * The route is a thin proxy to /api/workflow/presets on the backend.
 * Validation is minimal — all parameters are forwarded as-is.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// مراقب وحدة next/server
// Mock the next/server module to prevent real NextResponse/NextRequest usage
// ---------------------------------------------------------------------------
vi.mock("next/server", () => ({
  NextResponse: {
    json: vi.fn((data, init) => ({
      json: async () => data,
      status: init?.status || 200,
    })),
  },
  NextRequest: vi.fn(),
}));

// ---------------------------------------------------------------------------
// مراقب مكتبة البروكسي للخادم
// Mock the backend-proxy module
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
// Helper
// ---------------------------------------------------------------------------
function buildGetRequest(search = ""): Request {
  const url = `http://localhost/api/workflow/presets${search}`;
  return new Request(url, { method: "GET" });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/workflow/presets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // اختبار: توكيل طلب GET إلى الخادم الخلفي وإرجاع قائمة القوالب
  // Test: proxies GET request to backend and returns preset list
  it("validate-pipeline: proxies GET request to backend and returns preset list", async () => {
    const { GET } = await import("./route");
    mockProxyToBackend.mockResolvedValue({
      status: 200,
      body: [{ id: 1, name: "Preset 1" }],
    });

    const request = buildGetRequest();
    const response = await GET(request as never);

    expect(mockProxyToBackend).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  // اختبار: إعادة توجيه معاملات سلسلة الاستعلام إلى الخادم الخلفي
  // Test: forwards query string parameters to backend
  it("validate-pipeline: forwards query string parameters to backend", async () => {
    const { GET } = await import("./route");
    mockProxyToBackend.mockResolvedValue({ status: 200, body: [] });

    const request = buildGetRequest("?filter=active&limit=10");
    const response = await GET(request as never);

    expect(mockProxyToBackend).toHaveBeenCalledWith(
      request,
      "/api/workflow/presets"
    );
    expect(response.status).toBe(200);
  });

  // اختبار: إرجاع رسالة خطأ عندما يكون الخادم الخلفي غير متاح
  // Test: returns error response when backend is unavailable (proxy throws)
  it("validate-pipeline: returns error response when backend is unavailable (proxy throws)", async () => {
    const { GET } = await import("./route");
    mockProxyToBackend.mockRejectedValue(new Error("Backend unavailable"));

    const request = buildGetRequest();
    await GET(request as never);

    expect(mockBuildProxyErrorResponse).toHaveBeenCalled();
  });

  // اختبار: نقل حالة الخطأ 503 من الخادم الخلفي دون تغيير
  // Test: propagates backend 503 error unchanged
  it("validate-pipeline: propagates backend 503 error unchanged", async () => {
    const { GET } = await import("./route");
    mockProxyToBackend.mockResolvedValue({
      status: 503,
      body: { error: "Service Unavailable" },
    });

    const request = buildGetRequest();
    const response = await GET(request as never);

    expect(response.status).toBe(503);
  });

  // اختبار: HEAD يرجع بيانات وصفية الخدمة
  // Test: HEAD returns service metadata
  it("validate-pipeline: HEAD returns service metadata", async () => {
    const { HEAD } = await import("./route");
    const response = await HEAD();

    expect(response.status).toBe(200);
  });
});

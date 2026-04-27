/**
 * اختبارات وحدة — Projects API Route [UTP-011]
 *
 * يتحقق من:
 * - GET /api/projects يمرر الطلب للـ backend
 * - POST /api/projects يمرر الطلب للـ backend
 * - معالجة الأخطاء عند فشل الـ proxy
 */

import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock لـ backend-proxy ───
const mockProxyToBackend =
  vi.fn<(...args: unknown[]) => Promise<Response>>();
vi.mock("@/lib/server/backend-proxy", () => ({
  proxyToBackend: (...args: unknown[]) => mockProxyToBackend(...args),
  buildProxyErrorResponse: vi.fn((_error: unknown, message: string) => {
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }),
}));

import { GET, POST } from "../route";

// ═══ اختبارات ═══

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: [] }), { status: 200 })
    );
  });

  it("يجب أن يمرر الطلب للـ backend في /api/projects", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects");

    await GET(req);

    expect(mockProxyToBackend).toHaveBeenCalledWith(req, "/api/projects");
  });

  it("يجب أن يُرجع استجابة الـ backend كما هي", async () => {
    const backendData = { success: true, data: [{ id: "1", name: "Test" }] };
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify(backendData), { status: 200 })
    );

    const req = new NextRequest("http://localhost:3000/api/projects");
    const response = await GET(req);
    const body: unknown = await response.json();

    expect(body).toEqual(backendData);
  });

  it("يجب أن يُرجع خطأ عند فشل الـ proxy", async () => {
    mockProxyToBackend.mockRejectedValue(new Error("Connection refused"));

    const req = new NextRequest("http://localhost:3000/api/projects");
    const response = await GET(req);
    const json: unknown = await response.json();
    const body = json as { success?: boolean };

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: "new-1" } }), {
        status: 201,
      })
    );
  });

  it("يجب أن يمرر طلب الإنشاء للـ backend", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "مشروع جديد" }),
    });

    await POST(req);

    expect(mockProxyToBackend).toHaveBeenCalledWith(req, "/api/projects");
  });

  it("يجب أن يُرجع خطأ عند فشل الإنشاء", async () => {
    mockProxyToBackend.mockRejectedValue(new Error("Backend error"));

    const req = new NextRequest("http://localhost:3000/api/projects", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    const response = await POST(req);
    const json: unknown = await response.json();
    const body = json as { success?: boolean };

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

/**
 * اختبارات وحدة — Projects [id] API Route [UTP-011]
 *
 * يتحقق من:
 * - GET /api/projects/:id يمرر الطلب مع المعرّف الصحيح
 * - PUT /api/projects/:id يمرر التحديث
 * - DELETE /api/projects/:id يمرر الحذف
 * - معالجة الأخطاء في كل طريقة
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

import { GET, PUT, DELETE } from "../route";

// ─── مساعدات ───

const createCtx = (id: string) => ({
  params: Promise.resolve({ id }),
});

// ═══ اختبارات ═══

describe("GET /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  it("يجب أن يمرر المعرّف الصحيح للـ backend", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/abc-123");
    const ctx = createCtx("abc-123");

    await GET(req, ctx);

    expect(mockProxyToBackend).toHaveBeenCalledWith(
      req,
      "/api/projects/abc-123"
    );
  });

  it("يجب أن يُرجع خطأ عند فشل الـ proxy", async () => {
    mockProxyToBackend.mockRejectedValue(new Error("fail"));

    const req = new NextRequest("http://localhost:3000/api/projects/abc-123");
    const response = await GET(req, createCtx("abc-123"));
    const json: unknown = await response.json();
    const body = json as { success?: boolean };

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
  });
});

describe("PUT /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  it("يجب أن يمرر طلب التحديث مع المعرّف", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/xyz-789", {
      method: "PUT",
      body: JSON.stringify({ name: "updated" }),
    });

    await PUT(req, createCtx("xyz-789"));

    expect(mockProxyToBackend).toHaveBeenCalledWith(
      req,
      "/api/projects/xyz-789"
    );
  });
});

describe("DELETE /api/projects/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyToBackend.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );
  });

  it("يجب أن يمرر طلب الحذف مع المعرّف", async () => {
    const req = new NextRequest("http://localhost:3000/api/projects/del-456", {
      method: "DELETE",
    });

    await DELETE(req, createCtx("del-456"));

    expect(mockProxyToBackend).toHaveBeenCalledWith(
      req,
      "/api/projects/del-456"
    );
  });

  it("يجب أن يُرجع خطأ عند فشل الحذف", async () => {
    mockProxyToBackend.mockRejectedValue(new Error("delete failed"));

    const req = new NextRequest("http://localhost:3000/api/projects/del-456", {
      method: "DELETE",
    });
    const response = await DELETE(req, createCtx("del-456"));

    expect(response.status).toBe(500);
  });
});

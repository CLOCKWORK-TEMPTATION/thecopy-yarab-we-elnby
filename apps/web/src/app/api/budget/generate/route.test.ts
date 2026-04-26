import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

import { POST } from "./route";

vi.mock("@/lib/server/backend-proxy", () => ({
  buildProxyErrorResponse: vi.fn(
    (error: unknown, fallbackMessage: string) =>
      Response.json(
        {
          success: false,
          error:
            error instanceof Error && error.message
              ? error.message
              : fallbackMessage,
        },
        { status: 503 }
      )
  ),
  proxyToBackend: vi.fn(),
}));

describe("/api/budget/generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يمرر طلب إنشاء الميزانية إلى خدمة الخلفية", async () => {
    const proxiedResponse = Response.json({
      success: true,
      data: { budget: { grandTotal: 50000 } },
    });
    vi.mocked(proxyToBackend).mockResolvedValueOnce(proxiedResponse);

    const request = new NextRequest("http://localhost/api/budget/generate", {
      method: "POST",
      body: JSON.stringify({ scenario: "سيناريو صالح للميزانية" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data.budget.grandTotal).toBe(50000);
    expect(proxyToBackend).toHaveBeenCalledWith(
      request,
      "/api/budget/generate"
    );
  });

  it("يعيد استجابة خطأ عند فشل الاتصال بخدمة إنشاء الميزانية", async () => {
    const error = new Error("backend unavailable");
    vi.mocked(proxyToBackend).mockRejectedValueOnce(error);

    const request = new NextRequest("http://localhost/api/budget/generate", {
      method: "POST",
      body: JSON.stringify({ scenario: "سيناريو صالح للميزانية" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const result = await response.json();

    expect(response.status).toBe(503);
    expect(result.success).toBe(false);
    expect(result.error).toBe("backend unavailable");
    expect(buildProxyErrorResponse).toHaveBeenCalledWith(
      error,
      "تعذر الاتصال بخدمة إنشاء الميزانية"
    );
  });
});

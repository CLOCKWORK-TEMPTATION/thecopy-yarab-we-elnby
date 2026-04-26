import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildProxyErrorResponse,
  proxyToBackend,
} from "@/lib/server/backend-proxy";

import { POST } from "./route";

interface AnalyzeResponse {
  success: boolean;
  data?: {
    analysis: {
      summary: string;
    };
  };
  error?: string;
}

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

describe("/api/budget/analyze", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يمرر طلب التحليل إلى خدمة الخلفية", async () => {
    const proxiedResponse = Response.json({
      success: true,
      data: { analysis: { summary: "ok" } },
    });
    vi.mocked(proxyToBackend).mockResolvedValueOnce(proxiedResponse);

    const request = new NextRequest("http://localhost/api/budget/analyze", {
      method: "POST",
      body: JSON.stringify({ scenario: "سيناريو صالح للتحليل" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const result = (await response.json()) as AnalyzeResponse;

    expect(response.status).toBe(200);
    expect(result.success).toBe(true);
    expect(result.data?.analysis.summary).toBe("ok");
    expect(proxyToBackend).toHaveBeenCalledWith(
      request,
      "/api/budget/analyze"
    );
  });

  it("يعيد استجابة خطأ عند فشل الاتصال بخدمة التحليل", async () => {
    const error = new Error("backend unavailable");
    vi.mocked(proxyToBackend).mockRejectedValueOnce(error);

    const request = new NextRequest("http://localhost/api/budget/analyze", {
      method: "POST",
      body: JSON.stringify({ scenario: "سيناريو صالح للتحليل" }),
      headers: { "Content-Type": "application/json" },
    });

    const response = await POST(request);
    const result = (await response.json()) as AnalyzeResponse;

    expect(response.status).toBe(503);
    expect(result.success).toBe(false);
    expect(result.error).toBe("backend unavailable");
    expect(buildProxyErrorResponse).toHaveBeenCalledWith(
      error,
      "تعذر الاتصال بخدمة تحليل الميزانية"
    );
  });
});

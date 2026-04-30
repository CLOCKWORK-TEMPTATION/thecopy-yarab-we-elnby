import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

const { getBackendBaseUrl } = vi.hoisted(() => ({
  getBackendBaseUrl: vi.fn(),
}));

vi.mock("@/lib/server/backend-proxy", () => ({
  getBackendBaseUrl,
}));

describe("public analysis root route", () => {
  beforeEach(() => {
    getBackendBaseUrl.mockReset();
    getBackendBaseUrl.mockReturnValue("http://backend.test");
    vi.restoreAllMocks();
  });

  it("wraps upstream HTML failures in a safe JSON envelope", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<!DOCTYPE html><html><body>Cannot POST</body></html>", {
        status: 500,
        headers: { "content-type": "text/html" },
      })
    );

    const request = new NextRequest(
      "http://localhost/api/public/analysis/seven-stations",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: "مشهد اختبار" }),
      }
    );

    const response = await POST(request);
    const payload = (await response.json()) as {
      success: boolean;
      error: string;
      errorCode?: string;
      traceId?: string;
    };

    expect(response.status).toBe(502);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(payload.success).toBe(false);
    expect(payload.errorCode).toBe("ANALYSIS_UPSTREAM_FAILED");
    expect(payload.traceId).toEqual(expect.any(String));
    expect(payload.error).toContain("خدمة التحليل");
    expect(payload.error).not.toMatch(
      /<!doctype|<html|cannot post|syntaxerror|stack/i
    );
  });
});

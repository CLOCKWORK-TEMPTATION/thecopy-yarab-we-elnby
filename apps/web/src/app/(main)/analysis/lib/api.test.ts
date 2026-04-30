import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startAnalysisStream } from "./api";

describe("analysis api client", () => {
  beforeEach(() => {
    document.cookie = "XSRF-TOKEN=test-csrf";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  });

  it("starts streaming analysis through the public analysis endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, analysisId: "analysis-1" }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      startAnalysisStream({
        text: "نص عربي طويل للتحليل",
        projectName: "اختبار التحليل",
      })
    ).resolves.toEqual({ analysisId: "analysis-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/public/analysis/seven-stations/start",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
      })
    );
  });

  it("does not expose raw html error bodies to the user interface", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        "<!DOCTYPE html><html><head></head><body>Cannot POST /api/analysis/seven-stations/start</body></html>",
        {
          status: 404,
          headers: { "content-type": "text/html" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    let message = "";
    try {
      await startAnalysisStream({ text: "نص عربي للتحليل" });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("خدمة التحليل غير متاحة");
    expect(message).not.toMatch(/<!DOCTYPE|<html|<head|<body|Cannot POST/i);
  });

  it("uses a controlled message when the network request fails", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      startAnalysisStream({ text: "نص عربي للتحليل" })
    ).rejects.toThrow("تعذر الاتصال بخدمة التحليل");
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({
  clientEnv: {
    NEXT_PUBLIC_BACKEND_URL: "http://localhost:3001",
    NEXT_PUBLIC_API_URL: "",
  },
}));

import { runFullPipeline } from "./analysis";

const SAMPLE_TEXT =
  "قالت سلمى: لن أترك المدينة. رد آدم بأن الخطر يقترب، وأن القرار القادم سيغيّر مصير العائلة كلها.";

describe("runFullPipeline", () => {
  const originalBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:3001";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = originalBackendUrl;
  });

  it("يعيد نتيجة صالحة من الباك إند الرسمي", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          detailedResults: {
            station1: { title: "محطة 1" },
            station7: { finalReport: "تقرير نهائي" },
          },
          metadata: {
            traceId: "trace-1",
          },
          report: "تقرير نهائي",
          executionTime: 250,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );

    const result = await runFullPipeline({
      fullText: SAMPLE_TEXT,
      projectName: "اختبار خادمي",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("ai");
  });

  it("يفعّل المسار الاحتياطي عند فشل الخادم (HTTP 500)", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("Internal Server Error", { status: 500 })
    );

    const result = await runFullPipeline({
      fullText: SAMPLE_TEXT,
      projectName: "اختبار fallback",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("fallback");
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.stationOutputs.station1).toBeTruthy();
    expect(result.stationOutputs.station7).toBeTruthy();
  });

  it("يفعّل المسار الاحتياطي عند خطأ شبكي", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("fetch failed"));

    const result = await runFullPipeline({
      fullText: SAMPLE_TEXT,
      projectName: "اختبار شبكي",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("fallback");
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("يفعّل المسار الاحتياطي عندما لا يوجد عنوان خادم", async () => {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
    delete process.env.NEXT_PUBLIC_API_URL;
    delete process.env.BACKEND_URL;

    // إعادة تعريف الـ mock بدون عناوين
    vi.doMock("@/env", () => ({
      clientEnv: {
        NEXT_PUBLIC_BACKEND_URL: "",
        NEXT_PUBLIC_API_URL: "",
      },
    }));

    const result = await runFullPipeline({
      fullText: SAMPLE_TEXT,
      projectName: "اختبار بدون خادم",
    });

    expect(result.success).toBe(true);
    expect(result.mode).toBe("fallback");
  });

  it("يرفض الطلبات ذات النص الفارغ", async () => {
    await expect(
      runFullPipeline({
        fullText: "",
        projectName: "اختبار فشل",
      })
    ).rejects.toThrow();
  });
});

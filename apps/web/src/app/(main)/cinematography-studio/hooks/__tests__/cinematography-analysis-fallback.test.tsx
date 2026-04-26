// @vitest-environment jsdom

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-hot-toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
  },
}));

vi.mock("../../lib/studio-route-client", () => ({
  postStudioFormData: vi.fn(),
  postStudioJson: vi.fn().mockResolvedValue({ success: true, data: {} }),
}));

vi.mock("../../lib/local-shot-analysis", () => ({
  createLocalShotAnalysis: vi.fn(),
  createLocalFootageSummary: vi.fn(),
}));

const { useProduction } = await import("../useProduction");
const { usePostProduction } = await import("../usePostProduction");
const { postStudioFormData } = await import("../../lib/studio-route-client");
const { createLocalShotAnalysis, createLocalFootageSummary } =
  await import("../../lib/local-shot-analysis");

const delayedRemoteFailure = (delayMs: number) =>
  new Promise<never>((_, reject) => {
    globalThis.setTimeout(() => {
      reject(new Error("انتهت مهلة التحليل البعيد"));
    }, delayMs);
  });

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("cinematography fallback timing", () => {
  it("ينقل تحليل اللقطة إلى البديل المحلي بسرعة عند تعطل الخدمة البعيدة", async () => {
    vi.useFakeTimers();

    vi.mocked(postStudioFormData).mockImplementation(
      () => delayedRemoteFailure(3_000)
    );
    vi.mocked(createLocalShotAnalysis).mockImplementation(
      () =>
        new Promise((resolve) => {
          globalThis.setTimeout(() => {
            resolve({
              score: 82,
              dynamicRange: "متزن",
              grainLevel: "متوازن",
              issues: ["تحسين محلي جاهز"],
              exposure: 64,
            });
          }, 700);
        })
    );

    const file = new File([new Uint8Array([1, 2, 3, 4])], "frame.png", {
      type: "image/png",
    });
    const { result } = renderHook(() => useProduction("noir"));

    let pendingAnalysis: Promise<void> | undefined;
    await act(async () => {
      pendingAnalysis = result.current.handleAnalyzeShot(file);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_200);
    });

    // waitFor يعتمد على setTimeout الحقيقي للـpolling؛ تحت fake timers يتعلّق
    // ولا يصل إلى timeout. كل العمل المتزامن للحالة قد اكتمل بعد
    // advanceTimersByTimeAsync(3_200) (3000ms للرفض البعيد + 700ms للنجاح
    // المحلي + microtasks)، فالتبديل إلى real timers هنا آمن وضروري.
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.analysisSource).toBe("local-fallback");
      expect(result.current.analysis?.score).toBe(82);
      expect(result.current.isAnalyzing).toBe(false);
    });

    await act(async () => {
      await pendingAnalysis;
    });
  });

  it("ينقل تحليل ما بعد الإنتاج إلى الملخص المحلي قبل تعليق الواجهة", async () => {
    vi.useFakeTimers();

    vi.mocked(postStudioFormData).mockImplementation(
      () => delayedRemoteFailure(3_000)
    );
    vi.mocked(createLocalFootageSummary).mockImplementation(
      () =>
        new Promise((resolve) => {
          globalThis.setTimeout(() => {
            resolve({
              score: 88,
              status: "ready",
              exposure: "تعريض متوازن",
              colorBalance: "متزن",
              focus: "واضح",
              suggestions: ["بديل محلي سريع"],
            });
          }, 700);
        })
    );

    const file = new File([new Uint8Array([4, 3, 2, 1])], "footage.png", {
      type: "image/png",
    });
    const { result } = renderHook(() => usePostProduction("noir"));

    let pendingUpload: Promise<void> | undefined;
    await act(async () => {
      pendingUpload = result.current.uploadFootage(file);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_200);
    });

    // نفس سبب الإصلاح في الاختبار الأول: waitFor + fake timers يتعلّق.
    vi.useRealTimers();

    await waitFor(() => {
      expect(result.current.footageAnalysisSource).toBe("local-fallback");
      expect(result.current.footageSummary?.score).toBe(88);
      expect(result.current.isUploadingFootage).toBe(false);
    });

    await act(async () => {
      await pendingUpload;
    });
  });
});

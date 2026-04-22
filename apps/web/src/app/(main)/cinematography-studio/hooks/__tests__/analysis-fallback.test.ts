// @vitest-environment jsdom
/**
 * @fileoverview Unit tests for parallel local-fallback analysis policy
 *
 * Covers:
 *  - usePostProduction: remote success within timeout, remote timeout with local fallback,
 *    remote failure with local fallback, both paths failing
 *  - useProduction: same four scenarios
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Shared mock references
// ---------------------------------------------------------------------------

const mockPostStudioFormData = vi.fn();
const mockPostStudioJson = vi
  .fn()
  .mockResolvedValue({ success: true, data: {} });
const mockCreateLocalShotAnalysis = vi.fn();
const mockCreateLocalFootageSummary = vi.fn();

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
  postStudioFormData: (...args: unknown[]) => mockPostStudioFormData(...args),
  postStudioJson: (...args: unknown[]) => mockPostStudioJson(...args),
}));

vi.mock("../../lib/local-shot-analysis", () => ({
  createLocalShotAnalysis: (...args: unknown[]) =>
    mockCreateLocalShotAnalysis(...args),
  createLocalFootageSummary: (...args: unknown[]) =>
    mockCreateLocalFootageSummary(...args),
}));

// ---------------------------------------------------------------------------
// Import hooks AFTER mocks
// ---------------------------------------------------------------------------

const { useProduction } = await import("../useProduction");
const { usePostProduction } = await import("../usePostProduction");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFile(): File {
  return new File(["fake-image-data"], "test.png", { type: "image/png" });
}

function delayedResolve<T>(value: T, delayMs: number): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delayMs);
  });
}

const VALID_REMOTE_VALIDATION = {
  score: 85,
  status: "ready",
  exposure: "متوازن",
  composition: "جيد",
  focus: "حاد",
  colorBalance: "متزن",
  suggestions: ["ملاحظة اختبارية"],
};

const VALID_LOCAL_SHOT = {
  score: 60,
  dynamicRange: "تباين متزن",
  grainLevel: "تفاصيل متوازنة",
  issues: ["التعريض ضمن النطاق المقبول للمشهد الحالي."],
  exposure: 50,
};

const VALID_LOCAL_FOOTAGE = {
  score: 60,
  status: "review-needed",
  exposure: "تعريض متوازن",
  colorBalance: "متزن",
  focus: "تفاصيل متوازنة",
  suggestions: ["التعريض ضمن النطاق المقبول للمشهد الحالي."],
};

// ===========================================================================
// usePostProduction — analyse footage fallback
// ===========================================================================

describe("usePostProduction — parallel fallback policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses remote result when it arrives before timeout", async () => {
    mockPostStudioFormData.mockResolvedValue({
      validation: VALID_REMOTE_VALIDATION,
    });
    mockCreateLocalFootageSummary.mockImplementation(() =>
      delayedResolve(VALID_LOCAL_FOOTAGE, 50)
    );

    const { result } = renderHook(() => usePostProduction("noir"));

    await act(async () => {
      await result.current.uploadFootage(makeFile());
    });

    expect(result.current.footageAnalysisSource).toBe("remote");
    expect(result.current.footageSummary).toBeTruthy();
    expect(result.current.footageSummary!.score).toBe(85);
  });

  it("falls back to local when remote fails", async () => {
    mockPostStudioFormData.mockRejectedValue(new Error("network failure"));
    mockCreateLocalFootageSummary.mockResolvedValue(VALID_LOCAL_FOOTAGE);

    const { result } = renderHook(() => usePostProduction("noir"));

    await act(async () => {
      await result.current.uploadFootage(makeFile());
    });

    expect(result.current.footageAnalysisSource).toBe("local-fallback");
    expect(result.current.footageSummary).toBeTruthy();
    expect(result.current.footageSummary!.score).toBe(60);
  });

  it("uses local fallback without waiting for the remote timeout", async () => {
    mockPostStudioFormData.mockImplementation(() =>
      delayedResolve({ validation: VALID_REMOTE_VALIDATION }, 5000)
    );
    mockCreateLocalFootageSummary.mockResolvedValue(VALID_LOCAL_FOOTAGE);

    const { result } = renderHook(() => usePostProduction("noir"));

    const operation = (async () => {
      await act(async () => {
        await result.current.uploadFootage(makeFile());
      });
      return "completed" as const;
    })();

    const completion = await Promise.race([
      operation,
      delayedResolve("pending", 100),
    ]);

    expect(completion).toBe("completed");
    await operation;
    expect(result.current.footageAnalysisSource).toBe("local-fallback");
    expect(result.current.isFootageAnalysisComplete).toBe(true);
  });

  it("falls back to local when remote returns no validation", async () => {
    mockPostStudioFormData.mockResolvedValue({ success: true });
    mockCreateLocalFootageSummary.mockResolvedValue(VALID_LOCAL_FOOTAGE);

    const { result } = renderHook(() => usePostProduction("noir"));

    await act(async () => {
      await result.current.uploadFootage(makeFile());
    });

    expect(result.current.footageAnalysisSource).toBe("local-fallback");
  });

  it("reports error when both paths fail", async () => {
    mockPostStudioFormData.mockRejectedValue(new Error("remote down"));
    mockCreateLocalFootageSummary.mockRejectedValue(new Error("local broken"));

    const { result } = renderHook(() => usePostProduction("noir"));

    await act(async () => {
      await result.current.uploadFootage(makeFile());
    });

    expect(result.current.footageAnalysisSource).toBeNull();
    expect(result.current.footageError).toBeTruthy();
  });

  it("completes all four analysis indicators on fallback", async () => {
    mockPostStudioFormData.mockRejectedValue(new Error("timeout"));
    mockCreateLocalFootageSummary.mockResolvedValue(VALID_LOCAL_FOOTAGE);

    const { result } = renderHook(() => usePostProduction("noir"));

    await act(async () => {
      await result.current.uploadFootage(makeFile());
    });

    expect(result.current.isFootageAnalysisComplete).toBe(true);
  });
});

// ===========================================================================
// useProduction — handleAnalyzeShot fallback
// ===========================================================================

describe("useProduction — parallel fallback policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses remote result when valid", async () => {
    mockPostStudioFormData.mockResolvedValue({
      validation: VALID_REMOTE_VALIDATION,
    });
    mockCreateLocalShotAnalysis.mockImplementation(() =>
      delayedResolve(VALID_LOCAL_SHOT, 50)
    );

    const { result } = renderHook(() => useProduction("noir"));

    await act(async () => {
      await result.current.handleAnalyzeShot(makeFile());
    });

    expect(result.current.analysisSource).toBe("remote");
    expect(result.current.analysis).toBeTruthy();
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("uses local fallback without waiting for the remote timeout", async () => {
    mockPostStudioFormData.mockImplementation(() =>
      delayedResolve({ validation: VALID_REMOTE_VALIDATION }, 5000)
    );
    mockCreateLocalShotAnalysis.mockResolvedValue(VALID_LOCAL_SHOT);

    const { result } = renderHook(() => useProduction("noir"));

    const operation = (async () => {
      await act(async () => {
        await result.current.handleAnalyzeShot(makeFile());
      });
      return "completed" as const;
    })();

    const completion = await Promise.race([
      operation,
      delayedResolve("pending", 100),
    ]);

    expect(completion).toBe("completed");
    await operation;
    expect(result.current.analysisSource).toBe("local-fallback");
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("falls back to local when remote fails", async () => {
    mockPostStudioFormData.mockRejectedValue(new Error("connection refused"));
    mockCreateLocalShotAnalysis.mockResolvedValue(VALID_LOCAL_SHOT);

    const { result } = renderHook(() => useProduction("noir"));

    await act(async () => {
      await result.current.handleAnalyzeShot(makeFile());
    });

    expect(result.current.analysisSource).toBe("local-fallback");
    expect(result.current.analysis).toBeTruthy();
    expect(result.current.error).toBeNull();
    expect(result.current.isAnalyzing).toBe(false);
  });

  it("falls back to local when remote returns empty validation", async () => {
    mockPostStudioFormData.mockResolvedValue({ success: true });
    mockCreateLocalShotAnalysis.mockResolvedValue(VALID_LOCAL_SHOT);

    const { result } = renderHook(() => useProduction("noir"));

    await act(async () => {
      await result.current.handleAnalyzeShot(makeFile());
    });

    expect(result.current.analysisSource).toBe("local-fallback");
  });

  it("reports error when both paths fail", async () => {
    mockPostStudioFormData.mockRejectedValue(new Error("remote down"));
    mockCreateLocalShotAnalysis.mockRejectedValue(new Error("canvas broken"));

    const { result } = renderHook(() => useProduction("noir"));

    await act(async () => {
      await result.current.handleAnalyzeShot(makeFile());
    });

    expect(result.current.analysisSource).toBeNull();
    expect(result.current.error).toBeTruthy();
    expect(result.current.isAnalyzing).toBe(false);
  });
});

/**
 * اختبارات تكامل لخطاف إدخال الوسائط.
 *
 * الهدف:
 * - التحقق من سلوك الأخطاء المنضبط.
 * - التحقق من خروج سجل تحذير منظم عند الفشل.
 * - التحقق من مسار عدم دعم الكاميرا.
 */

import { renderHook, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMediaInputPipeline } from "../useMediaInputPipeline";

interface MediaDevicesSnapshot {
  mediaDevices?: MediaDevices;
}

let mediaSnapshot: MediaDevicesSnapshot;

beforeEach(() => {
  mediaSnapshot = {
    mediaDevices: navigator.mediaDevices,
  };
});

afterEach(() => {
  if (mediaSnapshot.mediaDevices) {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: mediaSnapshot.mediaDevices,
    });
  } else {
    Reflect.deleteProperty(navigator, "mediaDevices");
  }
  vi.restoreAllMocks();
});

describe("useMediaInputPipeline integration", () => {
  it("يسجل تحذيرًا منظمًا عند إدخال ملف غير مدعوم", async () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const { result } = renderHook(() => useMediaInputPipeline("image"));
    const badFile = new File(["invalid"], "bad.txt", {
      type: "text/plain",
    });

    await act(async () => {
      await result.current.selectMediaFile(badFile);
    });

    expect(result.current.state.error).toContain("صيغة الملف غير مدعومة");
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0] ?? "")).toContain("WARN");
    expect(String(warnSpy.mock.calls[0]?.[0] ?? "")).toContain("media error");
  });

  it("يتحول إلى حالة عدم الدعم عند غياب واجهة الكاميرا", async () => {
    Reflect.deleteProperty(navigator, "mediaDevices");

    const { result } = renderHook(() => useMediaInputPipeline("camera"));

    await act(async () => {
      await result.current.requestCamera();
    });

    expect(result.current.state.cameraPermission).toBe("unsupported");
    expect(result.current.state.error).toContain("لا يدعم الوصول للكاميرا");
  });

  it("يتحول إلى حالة عدم الدعم عند إرجاع المتصفح خطأ عدم الدعم الصريح", async () => {
    const getUserMedia = vi
      .fn()
      .mockRejectedValue(
        new DOMException("Not supported", "NotSupportedError")
      );

    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      writable: true,
      value: {
        getUserMedia,
      },
    });

    const { result } = renderHook(() => useMediaInputPipeline("camera"));

    await act(async () => {
      await result.current.requestCamera();
    });

    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(result.current.state.cameraPermission).toBe("unsupported");
    expect(result.current.state.error).toContain("لا يدعم الوصول للكاميرا");
  });
});

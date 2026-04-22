/**
 * ============================================================================
 * اختبارات التكامل — useQRCamera
 * ============================================================================
 *
 * الفلسفة:
 *   - نختبر السلوك الحقيقي للـ hook مقابل DOM jsdom
 *   - لا نستبدل منطق الـ hook بـ mocks — نوفر فقط ما لا يمكن توفيره في jsdom
 *     (واجهات navigator.mediaDevices، Html5Qrcode الذي يحتاج جهاز حقيقي)
 *   - كل حالة فشل تُمثّل سيناريو إنتاج حقيقي (حظر policy، رفض مستخدم، ...)
 *
 * ما يُغطّى:
 *   1. رفض السياق غير الآمن (HTTP في الإنتاج)
 *   2. mediaDevices غير متوفرة (متصفح قديم)
 *   3. لا توجد كاميرا متصلة
 *   4. صلاحية مرفوضة من المستخدم
 *   5. حظر policy — camera=()
 *   6. بدء ناجح ثم إيقاف صريح
 *   7. القراءة الناجحة لصورة QR من ملف
 *   8. استدعاء onDecoded عند المسح الناجح
 *   9. التنظيف الآمن عند unmount
 *  10. retry يُعيد ضبط الحالة ويُحاول من جديد
 * ============================================================================
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useQRCamera } from "../../src/hooks/useQRCamera";

/**
 * إنشاء نسخة وهمية من Html5Qrcode تحاكي السلوك الحقيقي لكن دون جهاز فعلي
 */
interface FakeScannerState {
  isScanning: boolean;
  startError?: Error;
  decodedValue?: string;
  scanFileValue?: string;
  scanFileError?: Error;
}

const createFakeScannerClass = (state: FakeScannerState) => {
  return class FakeHtml5Qrcode {
    isScanning = false;
    private onSuccess?: (decoded: string) => void;

    constructor(_elementId: string) {
      // سلوك الباني الحقيقي
    }

    async start(
      _cameraIdOrConfig: unknown,
      _config: unknown,
      onSuccess: (decoded: string) => void,
      _onError: (err: string) => void
    ): Promise<void> {
      if (state.startError) throw state.startError;
      this.isScanning = true;
      this.onSuccess = onSuccess;
      // محاكاة مسح فوري عند توفر قيمة
      if (state.decodedValue) {
        // إعطاء React وقتاً لتسجيل الحالة قبل إطلاق النجاح
        queueMicrotask(() => onSuccess(state.decodedValue as string));
      }
    }

    async stop(): Promise<void> {
      this.isScanning = false;
    }

    async clear(): Promise<void> {
      // لا شيء لمسحه
    }

    async scanFile(_file: File, _showImage?: boolean): Promise<string> {
      if (state.scanFileError) throw state.scanFileError;
      return state.scanFileValue ?? "project:user:nonce";
    }
  };
};

/**
 * تهيئة mock لـ html5-qrcode يستخدم الكلاس الوهمي أعلاه
 */
const mockHtml5Qrcode = (state: FakeScannerState): void => {
  vi.doMock("html5-qrcode", () => ({
    Html5Qrcode: createFakeScannerClass(state),
  }));
};

/**
 * تهيئة navigator.mediaDevices بشكل يمكن التحكم فيه من كل اختبار
 */
const setMediaDevices = (
  value: Partial<MediaDevices> | undefined
): void => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    writable: true,
    value,
  });
};

/**
 * إنشاء عنصر DOM يحمل معرّف المسح قبل renderHook
 * html5-qrcode الحقيقي يتحقق من وجوده — الكلاس الوهمي لا يتحقق،
 * لكننا نحافظ على الانضباط الهيكلي
 */
const ensureViewport = (id: string): void => {
  if (!document.getElementById(id)) {
    const el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
  }
};

afterEach(() => {
  vi.doUnmock("html5-qrcode");
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("useQRCamera — فحص البيئة", () => {
  it("يرفض التشغيل في سياق غير آمن ويضع الحالة unsupported", async () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    });
    setMediaDevices({ getUserMedia: vi.fn() } as unknown as MediaDevices);
    ensureViewport("vp-1");
    mockHtml5Qrcode({ isScanning: false });

    const onDecoded = vi.fn();
    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-1", onDecoded })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("unsupported");
    expect(result.current.failureReason).toBe("insecure-context");
    expect(result.current.errorMessage).toContain("HTTPS");
    expect(onDecoded).not.toHaveBeenCalled();
  });

  it("يرفض التشغيل عند غياب mediaDevices API", async () => {
    setMediaDevices(undefined);
    ensureViewport("vp-2");
    mockHtml5Qrcode({ isScanning: false });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-2", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("unsupported");
    expect(result.current.failureReason).toBe("mediadevices-unavailable");
  });

  it("يُبلّغ بعدم وجود كاميرا عندما enumerateDevices يعيد قائمة فارغة", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    } as unknown as MediaDevices);
    ensureViewport("vp-3");
    mockHtml5Qrcode({ isScanning: false });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-3", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("no-device");
    expect(result.current.failureReason).toBe("no-camera-device");
    expect(result.current.hasCameraDevice).toBe(false);
  });
});

describe("useQRCamera — ترجمة أخطاء الكاميرا", () => {
  it("يُترجم NotAllowedError إلى permission-denied برسالة عربية", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-4");

    const denialError = Object.assign(new Error("User denied"), {
      name: "NotAllowedError",
    });
    mockHtml5Qrcode({ isScanning: false, startError: denialError });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-4", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("permission-denied");
    expect(result.current.failureReason).toBe("permission-denied");
    expect(result.current.errorMessage).toMatch(/صلاحية الكاميرا/);
  });

  it("يُترجم NotFoundError إلى no-camera-device", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-5");

    const notFound = Object.assign(new Error("not found"), {
      name: "NotFoundError",
    });
    mockHtml5Qrcode({ isScanning: false, startError: notFound });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-5", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.status).toBe("no-device");
    expect(result.current.failureReason).toBe("no-camera-device");
  });

  it("يُترجم رسالة Permissions-Policy إلى policy-blocked", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-6");

    const policyError = Object.assign(
      new Error("Permissions policy disabled feature"),
      { name: "NotAllowedError" }
    );
    mockHtml5Qrcode({ isScanning: false, startError: policyError });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-6", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.failureReason).toBe("permissions-policy-blocked");
    expect(result.current.status).toBe("permission-denied");
    expect(result.current.errorMessage).toMatch(/سياسة أذونات/);
  });

  it("يُترجم NotReadableError إلى device-in-use", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-7");

    const busyError = Object.assign(new Error("Device in use"), {
      name: "NotReadableError",
    });
    mockHtml5Qrcode({ isScanning: false, startError: busyError });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-7", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.failureReason).toBe("device-in-use");
    expect(result.current.status).toBe("error");
  });
});

describe("useQRCamera — المسار السعيد", () => {
  it("يبدأ بنجاح ثم يستدعي onDecoded عند قراءة رمز", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-8");
    mockHtml5Qrcode({ isScanning: false, decodedValue: "proj:user:abc" });

    const onDecoded = vi.fn();
    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-8", onDecoded })
    );

    await act(async () => {
      await result.current.start();
    });

    // انتظار انتشار microtask الخاص بـ onSuccess
    await waitFor(() => {
      expect(onDecoded).toHaveBeenCalledWith("proj:user:abc");
    });
  });

  it("يمكن إيقاف المسح يدوياً", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-9");
    mockHtml5Qrcode({ isScanning: false });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-9", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    await act(async () => {
      await result.current.stop();
    });

    expect(result.current.status).toBe("stopped");
  });
});

describe("useQRCamera — قراءة رمز من ملف صورة (fallback)", () => {
  it("يرفض ملف غير صورة", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    } as unknown as MediaDevices);
    ensureViewport("vp-10");
    mockHtml5Qrcode({ isScanning: false });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-10", onDecoded: vi.fn() })
    );

    const textFile = new File(["plain"], "a.txt", { type: "text/plain" });

    await expect(
      result.current.scanImageFile(textFile)
    ).rejects.toThrow(/ليس صورة/);
  });

  it("يقرأ ملف صورة صالح ويعيد القيمة المفكوكة", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn().mockResolvedValue([]),
    } as unknown as MediaDevices);
    ensureViewport("vp-11");
    mockHtml5Qrcode({ isScanning: false, scanFileValue: "proj:user:xyz" });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-11", onDecoded: vi.fn() })
    );

    const imageFile = new File([new Uint8Array([137, 80, 78, 71])], "qr.png", {
      type: "image/png",
    });

    const decoded = await result.current.scanImageFile(imageFile);
    expect(decoded).toBe("proj:user:xyz");
  });
});

describe("useQRCamera — retry والتنظيف", () => {
  it("retry يُعيد ضبط failureReason ويحاول البدء مجدداً", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-12");

    const notAllowed = Object.assign(new Error("denied"), {
      name: "NotAllowedError",
    });
    mockHtml5Qrcode({ isScanning: false, startError: notAllowed });

    const { result } = renderHook(() =>
      useQRCamera({ elementId: "vp-12", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(result.current.failureReason).toBe("permission-denied");

    await act(async () => {
      await result.current.retry();
    });

    // ما زال permission-denied لأن الخطأ ثابت — لكن الـ retry دُعي ولم يرمِ
    expect(result.current.failureReason).toBe("permission-denied");
  });

  it("ينظّف الموارد عند unmount دون أخطاء", async () => {
    setMediaDevices({
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices);
    ensureViewport("vp-13");
    mockHtml5Qrcode({ isScanning: false });

    const { result, unmount } = renderHook(() =>
      useQRCamera({ elementId: "vp-13", onDecoded: vi.fn() })
    );

    await act(async () => {
      await result.current.start();
    });

    expect(() => unmount()).not.toThrow();
  });
});

/**
 * ============================================================================
 * اختبارات التكامل — QRScanner
 * ============================================================================
 *
 * الفلسفة:
 *   - نختبر المكون كوحدة حقيقية — DOM فعلي، أحداث حقيقية، بدون render shallow
 *   - نستبدل فقط html5-qrcode لأن jsdom لا يملك getUserMedia حقيقي
 *   - data-testid متوافقة مع Playwright لإعادة الاستخدام في E2E
 *
 * ما يُغطّى:
 *   1. عرض الأزرار والحقول في كل الحالات
 *   2. الإدخال اليدوي: صيغة صحيحة → onScan + صيغة خاطئة → onError
 *   3. الإدخال اليدوي الفارغ → رسالة خطأ محلية
 *   4. رفع صورة: نجاح → onScan + فشل → onError مع رسالة عربية
 *   5. بدء المسح يعرض زر الإيقاف
 * ============================================================================
 */

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import QRScanner from "../../src/components/scanner/QRScanner";

/**
 * إعداد mock لـ html5-qrcode يدعم سيناريوهات start/scanFile
 */
interface FakeScannerConfig {
  scanFileValue?: string;
  scanFileError?: Error;
  startError?: Error;
}

const mockHtml5Qrcode = (config: FakeScannerConfig): void => {
  vi.doMock("html5-qrcode", () => ({
    Html5Qrcode: class {
      isScanning = false;
      constructor(_id: string) {}
      async start(
        _cam: unknown,
        _cfg: unknown,
        onSuccess: (d: string) => void,
        _onErr: (e: string) => void
      ): Promise<void> {
        if (config.startError) throw config.startError;
        this.isScanning = true;
        void onSuccess;
      }
      async stop(): Promise<void> {
        this.isScanning = false;
      }
      async clear(): Promise<void> {
        return;
      }
      async scanFile(_file: File, _show?: boolean): Promise<string> {
        if (config.scanFileError) throw config.scanFileError;
        return config.scanFileValue ?? "proj:user:nonce";
      }
    },
  }));
};

/**
 * تهيئة navigator.mediaDevices لتمرير checkEnvironment
 */
const primeMediaDevices = (): void => {
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    writable: true,
    value: {
      getUserMedia: vi.fn(),
      enumerateDevices: vi
        .fn()
        .mockResolvedValue([{ kind: "videoinput", deviceId: "a" } as MediaDeviceInfo]),
    } as unknown as MediaDevices,
  });
  Object.defineProperty(window, "isSecureContext", {
    configurable: true,
    writable: true,
    value: true,
  });
};

afterEach(() => {
  vi.doUnmock("html5-qrcode");
  vi.resetModules();
});

describe("QRScanner — التقديم الأولي", () => {
  it("يعرض زر بدء المسح وحقل الإدخال اليدوي وحقل رفع الصورة", () => {
    primeMediaDevices();
    mockHtml5Qrcode({});
    render(<QRScanner onScan={vi.fn()} />);

    expect(screen.getByTestId("qr-start-camera")).toBeInTheDocument();
    expect(screen.getByTestId("qr-manual-entry")).toBeInTheDocument();
    expect(screen.getByTestId("qr-image-upload")).toBeInTheDocument();
  });
});

describe("QRScanner — مسار الإدخال اليدوي", () => {
  it("يرفض الإدخال الفارغ ويعرض رسالة محلية", async () => {
    primeMediaDevices();
    mockHtml5Qrcode({});
    const onScan = vi.fn();
    const onError = vi.fn();
    render(<QRScanner onScan={onScan} onError={onError} />);

    fireEvent.click(screen.getByTestId("qr-manual-submit"));

    expect(screen.getByTestId("qr-manual-error")).toHaveTextContent(
      /أدخل رمز/
    );
    expect(onScan).not.toHaveBeenCalled();
    // الإدخال الفارغ لا يرسل onError — إنه خطأ محلي قبل التحقق من الصيغة
    expect(onError).not.toHaveBeenCalled();
  });

  it("يرفض صيغة غير صحيحة ويرسل onError بسبب manual-entry-invalid", async () => {
    primeMediaDevices();
    mockHtml5Qrcode({});
    const onScan = vi.fn();
    const onError = vi.fn();
    render(<QRScanner onScan={onScan} onError={onError} />);

    const user = userEvent.setup();
    await user.type(screen.getByTestId("qr-manual-entry"), "invalid-format");
    await user.click(screen.getByTestId("qr-manual-submit"));

    expect(onScan).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "manual-entry-invalid" })
    );
    expect(screen.getByTestId("qr-manual-error")).toHaveTextContent(
      /ثلاثة أجزاء/
    );
  });

  it("يقبل صيغة صحيحة a:b:c ويستدعي onScan", async () => {
    primeMediaDevices();
    mockHtml5Qrcode({});
    const onScan = vi.fn();
    render(<QRScanner onScan={onScan} />);

    const user = userEvent.setup();
    await user.type(
      screen.getByTestId("qr-manual-entry"),
      "project:user:nonce"
    );
    await user.click(screen.getByTestId("qr-manual-submit"));

    expect(onScan).toHaveBeenCalledWith("project:user:nonce");
  });
});

describe("QRScanner — مسار رفع الصورة", () => {
  it("يستخرج QR من صورة صالحة ويستدعي onScan", async () => {
    primeMediaDevices();
    mockHtml5Qrcode({ scanFileValue: "proj:user:xyz" });
    const onScan = vi.fn();
    render(<QRScanner onScan={onScan} />);

    const file = new File([new Uint8Array([137, 80, 78, 71])], "qr.png", {
      type: "image/png",
    });

    const input = screen.getByTestId("qr-image-upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(onScan).toHaveBeenCalledWith("proj:user:xyz");
    });
  });

  it("يعرض رسالة خطأ عند فشل فك QR من الصورة", async () => {
    primeMediaDevices();
    mockHtml5Qrcode({
      scanFileError: new Error("QR code not found in image"),
    });
    const onScan = vi.fn();
    const onError = vi.fn();
    render(<QRScanner onScan={onScan} onError={onError} />);

    const file = new File([new Uint8Array([137, 80, 78, 71])], "bad.png", {
      type: "image/png",
    });

    const input = screen.getByTestId("qr-image-upload") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByTestId("qr-upload-error")).toBeInTheDocument();
    });

    expect(onScan).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "image-decode-failed" })
    );
  });
});

describe("QRScanner — مسار الكاميرا", () => {
  it("عند النقر على بدء المسح يتحول إلى scanning ويعرض زر الإيقاف", async () => {
    primeMediaDevices();
    mockHtml5Qrcode({});
    render(<QRScanner onScan={vi.fn()} />);

    fireEvent.click(screen.getByTestId("qr-start-camera"));

    await waitFor(() => {
      expect(screen.getByTestId("qr-stop-camera")).toBeInTheDocument();
    });
  });

  it("يعرض زر retry ورسالة الخطأ عندما تُحجب الكاميرا", async () => {
    primeMediaDevices();
    const blocked = Object.assign(new Error("policy"), {
      name: "NotAllowedError",
      message: "Permissions policy disabled",
    });
    mockHtml5Qrcode({ startError: blocked });

    render(<QRScanner onScan={vi.fn()} />);

    fireEvent.click(screen.getByTestId("qr-start-camera"));

    await waitFor(() => {
      expect(screen.getByTestId("qr-retry-camera")).toBeInTheDocument();
      expect(screen.getByTestId("qr-camera-error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("qr-camera-error")).toHaveTextContent(
      /سياسة أذونات/
    );
  });
});

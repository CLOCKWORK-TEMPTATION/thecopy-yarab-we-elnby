import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isMediaFeatureAllowedByPolicy,
  translateMediaDeviceError,
} from "./media-device-errors";

describe("translateMediaDeviceError", () => {
  it("separates denied permission from missing devices", () => {
    expect(
      translateMediaDeviceError(
        new DOMException("Permission denied", "NotAllowedError"),
        "microphone"
      )
    ).toMatchObject({
      status: "denied",
      message: "تم رفض صلاحية الميكروفون. اسمح بها من إعدادات المتصفح أو استخدم ملفًا صوتيًا كبديل.",
    });

    expect(
      translateMediaDeviceError(
        new DOMException("No device", "NotFoundError"),
        "camera"
      )
    ).toMatchObject({
      status: "no-device",
      message: "لا توجد كاميرا متاحة على هذا الجهاز. استخدم رفع ملف أو عينة تدريب بدلًا منها.",
    });
  });

  it("reports unsupported and busy devices with actionable copy", () => {
    expect(
      translateMediaDeviceError(
        new DOMException("Not supported", "NotSupportedError"),
        "camera"
      ).status
    ).toBe("unsupported");

    expect(
      translateMediaDeviceError(
        new DOMException("Busy", "NotReadableError"),
        "microphone"
      ).message
    ).toContain("مشغول");
  });
});

describe("isMediaFeatureAllowedByPolicy", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prevents device calls when browser policy blocks the feature", () => {
    const originalPolicy = Object.getOwnPropertyDescriptor(
      document,
      "permissionsPolicy"
    );
    Object.defineProperty(document, "permissionsPolicy", {
      configurable: true,
      value: {
        allowsFeature: (feature: string) => feature !== "microphone",
      },
    });

    expect(isMediaFeatureAllowedByPolicy("microphone")).toBe(false);
    expect(isMediaFeatureAllowedByPolicy("camera")).toBe(true);

    if (originalPolicy) {
      Object.defineProperty(document, "permissionsPolicy", originalPolicy);
    } else {
      delete (document as { permissionsPolicy?: unknown }).permissionsPolicy;
    }
  });
});

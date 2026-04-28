/**
 * اختبارات تكامل لمدير إعدادات إدخال الوسائط.
 *
 * هذه الاختبارات تؤكد أن قراءة متغيرات البيئة وتطبيق الحدود
 * تعمل بشكل حقيقي بدون أي طبقة محاكاة.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface EnvSnapshot {
  imageMaxMb?: string;
  videoMaxMb?: string;
  captureWidth?: string;
  captureHeight?: string;
  captureQuality?: string;
  captureMime?: string;
}

let snapshot: EnvSnapshot;

beforeEach(() => {
  snapshot = {
    imageMaxMb: process.env["NEXT_PUBLIC_CINE_IMAGE_MAX_MB"],
    videoMaxMb: process.env["NEXT_PUBLIC_CINE_VIDEO_MAX_MB"],
    captureWidth: process.env["NEXT_PUBLIC_CINE_CAPTURE_WIDTH"],
    captureHeight: process.env["NEXT_PUBLIC_CINE_CAPTURE_HEIGHT"],
    captureQuality: process.env["NEXT_PUBLIC_CINE_CAPTURE_QUALITY"],
    captureMime: process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"],
  };
});

afterEach(() => {
  process.env["NEXT_PUBLIC_CINE_IMAGE_MAX_MB"] = snapshot.imageMaxMb;
  process.env["NEXT_PUBLIC_CINE_VIDEO_MAX_MB"] = snapshot.videoMaxMb;
  process.env["NEXT_PUBLIC_CINE_CAPTURE_WIDTH"] = snapshot.captureWidth;
  process.env["NEXT_PUBLIC_CINE_CAPTURE_HEIGHT"] = snapshot.captureHeight;
  process.env["NEXT_PUBLIC_CINE_CAPTURE_QUALITY"] = snapshot.captureQuality;
  process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"] = snapshot.captureMime;
  vi.resetModules();
});

describe("cinematography-input-config", () => {
  it("يطبق القيم المخصصة من البيئة ضمن الحدود الآمنة", async () => {
    process.env["NEXT_PUBLIC_CINE_IMAGE_MAX_MB"] = "24";
    process.env["NEXT_PUBLIC_CINE_VIDEO_MAX_MB"] = "640";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_WIDTH"] = "1920";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_HEIGHT"] = "1080";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_QUALITY"] = "0.8";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"] = "image/jpeg";
    vi.resetModules();

    const { createCinematographyInputConfig } =
      await import("../cinematography-config");

    const config = createCinematographyInputConfig();

    expect(config.imageMaxSizeBytes).toBe(24 * 1024 * 1024);
    expect(config.videoMaxSizeBytes).toBe(640 * 1024 * 1024);
    expect(config.captureWidth).toBe(1920);
    expect(config.captureHeight).toBe(1080);
    expect(config.captureMimeType).toBe("image/jpeg");
    expect(config.captureQuality).toBeCloseTo(0.8);
  });

  it("يعيد القيم الافتراضية عند تمرير مدخلات بيئة غير صالحة", async () => {
    process.env["NEXT_PUBLIC_CINE_IMAGE_MAX_MB"] = "invalid";
    process.env["NEXT_PUBLIC_CINE_VIDEO_MAX_MB"] = "-100";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_WIDTH"] = "100000";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_HEIGHT"] = "12";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_QUALITY"] = "5";
    process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"] = "text/plain";
    vi.resetModules();

    const { createCinematographyInputConfig } =
      await import("../cinematography-config");

    const config = createCinematographyInputConfig();

    expect(config.imageMaxSizeBytes).toBe(12 * 1024 * 1024);
    expect(config.videoMaxSizeBytes).toBe(8 * 1024 * 1024);
    expect(config.captureWidth).toBe(3840);
    expect(config.captureHeight).toBe(240);
    expect(config.captureMimeType).toBe("image/png");
    expect(config.captureQuality).toBe(1);
  });
});

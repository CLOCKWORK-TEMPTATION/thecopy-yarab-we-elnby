/**
 * مدير إعدادات مسار إدخال الوسائط في استوديو التصوير السينمائي.
 *
 * الهدف:
 * - توحيد قيم الحدود التشغيلية في نقطة مركزية.
 * - السماح بتمرير القيم من متغيرات البيئة عند الحاجة.
 * - تقديم قيم افتراضية آمنة عند غياب الضبط الخارجي.
 */

const DEFAULT_IMAGE_MAX_SIZE_MB = 12;
const DEFAULT_VIDEO_MAX_SIZE_MB = 280;
const DEFAULT_CAPTURE_WIDTH = 1280;
const DEFAULT_CAPTURE_HEIGHT = 720;
const DEFAULT_CAPTURE_MIME = "image/png";
const DEFAULT_CAPTURE_QUALITY = 0.92;

function readEnvNumber(
  key: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = process.env[key];
  if (!raw) {
    return fallback;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function readCaptureMime(): string {
  const raw = (process.env["NEXT_PUBLIC_CINE_CAPTURE_MIME"] || "").trim();
  if (!raw) {
    return DEFAULT_CAPTURE_MIME;
  }

  if (raw !== "image/png" && raw !== "image/jpeg") {
    return DEFAULT_CAPTURE_MIME;
  }

  return raw;
}

export interface CinematographyInputConfig {
  imageMaxSizeBytes: number;
  videoMaxSizeBytes: number;
  captureMimeType: string;
  captureQuality: number;
  captureWidth: number;
  captureHeight: number;
}

export function createCinematographyInputConfig(): CinematographyInputConfig {
  const imageMaxSizeMb = readEnvNumber(
    "NEXT_PUBLIC_CINE_IMAGE_MAX_MB",
    DEFAULT_IMAGE_MAX_SIZE_MB,
    2,
    200
  );

  const videoMaxSizeMb = readEnvNumber(
    "NEXT_PUBLIC_CINE_VIDEO_MAX_MB",
    DEFAULT_VIDEO_MAX_SIZE_MB,
    8,
    2000
  );

  const captureWidth = Math.round(
    readEnvNumber(
      "NEXT_PUBLIC_CINE_CAPTURE_WIDTH",
      DEFAULT_CAPTURE_WIDTH,
      320,
      3840
    )
  );

  const captureHeight = Math.round(
    readEnvNumber(
      "NEXT_PUBLIC_CINE_CAPTURE_HEIGHT",
      DEFAULT_CAPTURE_HEIGHT,
      240,
      2160
    )
  );

  const captureQuality = readEnvNumber(
    "NEXT_PUBLIC_CINE_CAPTURE_QUALITY",
    DEFAULT_CAPTURE_QUALITY,
    0.1,
    1
  );

  return {
    imageMaxSizeBytes: Math.round(imageMaxSizeMb * 1024 * 1024),
    videoMaxSizeBytes: Math.round(videoMaxSizeMb * 1024 * 1024),
    captureMimeType: readCaptureMime(),
    captureQuality,
    captureWidth,
    captureHeight,
  };
}

export const cinematographyInputConfig = Object.freeze(
  createCinematographyInputConfig()
);

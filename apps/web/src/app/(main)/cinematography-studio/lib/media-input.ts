/**
 * أدوات إدخال الوسائط لمسار التصوير السينمائي.
 *
 * ملاحظة:
 * هذا الملف يعمل في بيئة المتصفح فقط لأن بعض العمليات تعتمد على
 * HTMLVideoElement و Canvas.
 */

import type { CinematographyInputConfig } from "./cinematography-config";

export type SupportedMediaKind = "image" | "video";

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function revokeObjectUrlSafely(url: string | null): void {
  if (!url) {
    return;
  }

  try {
    URL.revokeObjectURL(url);
  } catch {
    // Ignore invalid object URLs.
  }
}

function createVideoElement(url: string): HTMLVideoElement {
  const video = document.createElement("video");
  video.src = url;
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  return video;
}

async function canvasToImageFile(
  canvas: HTMLCanvasElement,
  config: CinematographyInputConfig,
  filename: string
): Promise<File> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, config.captureMimeType, config.captureQuality);
  });

  if (!blob) {
    throw new Error("تعذر تحويل الإطار المرسوم إلى ملف.");
  }

  const extension = config.captureMimeType === "image/jpeg" ? "jpg" : "png";
  return new File([blob], `${filename}.${extension}`, {
    type: blob.type || config.captureMimeType,
    lastModified: Date.now(),
  });
}

async function createFallbackFrameFromVideoFile(
  file: File,
  canvas: HTMLCanvasElement,
  config: CinematographyInputConfig
): Promise<File> {
  const width = config.captureWidth;
  const height = config.captureHeight;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("تعذر إنشاء سياق الرسم للإطار البديل.");
  }

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#111827");
  gradient.addColorStop(1, "#1f2937");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = "rgba(255,255,255,0.08)";
  context.fillRect(32, 32, width - 64, height - 64);

  context.beginPath();
  context.fillStyle = "#f59e0b";
  context.moveTo(width / 2 - 42, height / 2 - 56);
  context.lineTo(width / 2 - 42, height / 2 + 56);
  context.lineTo(width / 2 + 48, height / 2);
  context.closePath();
  context.fill();

  context.fillStyle = "#f8fafc";
  context.font = "bold 30px sans-serif";
  context.textAlign = "center";
  context.fillText("VIDEO", width / 2, height - 84);

  context.fillStyle = "rgba(248,250,252,0.72)";
  context.font = "20px sans-serif";
  context.fillText(
    `تم إنشاء إطار بديل لـ ${file.name.slice(0, 24)}`,
    width / 2,
    height - 44
  );

  return canvasToImageFile(
    canvas,
    config,
    `video-fallback-frame-${Date.now()}`
  );
}

async function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("تعذر تحميل الفيديو لاستخراج إطار مرجعي."));
    };

    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("loadedmetadata", onLoaded);
    video.addEventListener("error", onError);
  });
}

async function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  const boundedTime = Number.isFinite(time) && time >= 0 ? time : 0;

  if (Math.abs((video.currentTime || 0) - boundedTime) < 0.02) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const onSeeked = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("تعذر الانتقال إلى إطار الفيديو المطلوب."));
    };

    const cleanup = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
    };

    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = boundedTime;
  });
}

export function validateMediaFile(
  file: File,
  kind: SupportedMediaKind,
  config: CinematographyInputConfig
): void {
  if (kind === "image" && !isImageFile(file)) {
    throw new Error("الملف المختار ليس صورة صالحة.");
  }

  if (kind === "video" && !isVideoFile(file)) {
    throw new Error("الملف المختار ليس فيديو صالحًا.");
  }

  if (kind === "image" && file.size > config.imageMaxSizeBytes) {
    throw new Error("حجم الصورة يتجاوز الحد المسموح لهذه الأداة.");
  }

  if (kind === "video" && file.size > config.videoMaxSizeBytes) {
    throw new Error("حجم الفيديو يتجاوز الحد المسموح لهذه الأداة.");
  }
}

export async function captureFrameFromVideoElement(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  config: CinematographyInputConfig
): Promise<File> {
  const width = video.videoWidth || config.captureWidth;
  const height = video.videoHeight || config.captureHeight;

  if (width <= 0 || height <= 0) {
    throw new Error("تعذر قراءة أبعاد الفيديو قبل التقاط الإطار.");
  }

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("تعذر إنشاء سياق الرسم لالتقاط الإطار.");
  }

  context.drawImage(video, 0, 0, width, height);

  return canvasToImageFile(canvas, config, `camera-frame-${Date.now()}`);
}

export async function extractFrameFromVideoFile(
  file: File,
  canvas: HTMLCanvasElement,
  config: CinematographyInputConfig
): Promise<File> {
  const videoUrl = URL.createObjectURL(file);
  const video = createVideoElement(videoUrl);

  try {
    try {
      await waitForVideoReady(video);

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const targetTime = duration > 0.25 ? Math.min(duration / 3, 2.5) : 0;
      await seekVideo(video, targetTime);

      return await captureFrameFromVideoElement(video, canvas, config);
    } catch {
      // نحافظ على مسار الفيديو قابلًا للتحليل حتى لو عجز المتصفح عن فك الملف.
      return await createFallbackFrameFromVideoFile(file, canvas, config);
    }
  } finally {
    video.pause();
    video.src = "";
    video.remove();
    URL.revokeObjectURL(videoUrl);
  }
}

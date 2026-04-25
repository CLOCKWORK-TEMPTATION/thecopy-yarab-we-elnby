/**
 * خطاف موحد لإدارة إدخال الوسائط لمسارات التحليل السينمائي.
 *
 * يغطي:
 * - اختيار الصور والفيديو.
 * - استخراج إطار مرجعي من الفيديو.
 * - تشغيل الكاميرا والتقاط إطار فعلي.
 * - إدارة حالات الصلاحيات والبدائل.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logger } from "@/lib/ai/utils/logger";
import { cinematographyInputConfig } from "../lib/cinematography-config";
import { publishDiagnostics } from "../lib/diagnostics-bus";
import {
  captureFrameFromVideoElement,
  extractFrameFromVideoFile,
  isImageFile,
  isVideoFile,
  revokeObjectUrlSafely,
  validateMediaFile,
} from "../lib/media-input";

export type MediaInputMode = "image" | "video" | "camera";
export type CameraPermissionState =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "no-device"
  | "error";

export interface MediaInputPipelineState {
  mode: MediaInputMode;
  previewUrl: string | null;
  previewType: "image" | "video" | "camera" | null;
  selectedFile: File | null;
  analysisFile: File | null;
  isPreparing: boolean;
  error: string | null;
  cameraPermission: CameraPermissionState;
}

export interface MediaInputPipeline {
  state: MediaInputPipelineState;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  cameraCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  setMode: (mode: MediaInputMode) => void;
  selectMediaFile: (file: File | null) => Promise<void>;
  requestCamera: () => Promise<void>;
  stopCamera: () => void;
  captureCameraFrame: () => Promise<File | null>;
  clearMedia: () => void;
  canAnalyze: boolean;
}

interface CameraFailure {
  permission: CameraPermissionState;
  message: string;
}

function withCameraRequestTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 4000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      const error = new Error("Timed out while waiting for camera access.");
      error.name = "TimeoutError";
      reject(error);
    }, timeoutMs);

    promise.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function createInitialState(mode: MediaInputMode): MediaInputPipelineState {
  return {
    mode,
    previewUrl: null,
    previewType: null,
    selectedFile: null,
    analysisFile: null,
    isPreparing: false,
    error: null,
    cameraPermission: "idle",
  };
}

export function useMediaInputPipeline(
  defaultMode: MediaInputMode = "image"
): MediaInputPipeline {
  const [state, setState] = useState<MediaInputPipelineState>(() =>
    createInitialState(defaultMode)
  );
  const streamRef = useRef<MediaStream | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const applyPreview = useCallback(
    (
      nextUrl: string | null,
      nextType: MediaInputPipelineState["previewType"]
    ) => {
      if (previewUrlRef.current && previewUrlRef.current !== nextUrl) {
        revokeObjectUrlSafely(previewUrlRef.current);
      }
      previewUrlRef.current = nextUrl;
      setState((prev) => ({
        ...prev,
        previewUrl: nextUrl,
        previewType: nextType,
      }));
    },
    []
  );

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }

    setState((prev) => ({
      ...prev,
      cameraPermission:
        prev.cameraPermission === "granted" ? "idle" : prev.cameraPermission,
    }));
  }, []);

  const clearSelectionState = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedFile: null,
      analysisFile: null,
      isPreparing: false,
      error: null,
    }));
  }, []);

  const setMode = useCallback(
    (mode: MediaInputMode) => {
      stopCamera();
      applyPreview(null, null);
      clearSelectionState();
      setState((prev) => ({
        ...prev,
        mode,
        previewType: null,
        previewUrl: null,
      }));
    },
    [applyPreview, clearSelectionState, stopCamera]
  );

  const setError = useCallback((message: string) => {
    logger.warn("[CinematographyInput] media error", { message });
    setState((prev) => ({
      ...prev,
      error: message,
    }));
  }, []);

  const selectMediaFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      const fileIsImage = isImageFile(file);
      const fileIsVideo = isVideoFile(file);
      const inferredMode: MediaInputMode = fileIsVideo ? "video" : "image";

      try {
        if (!fileIsImage && !fileIsVideo) {
          throw new Error("صيغة الملف غير مدعومة. استخدم صورة أو فيديو.");
        }

        validateMediaFile(file, inferredMode, cinematographyInputConfig);
        stopCamera();

        const objectUrl = URL.createObjectURL(file);
        applyPreview(objectUrl, inferredMode);

        if (fileIsImage) {
          setState((prev) => ({
            ...prev,
            mode: "image",
            selectedFile: file,
            analysisFile: file,
            isPreparing: false,
            error: null,
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          mode: "video",
          selectedFile: file,
          analysisFile: null,
          isPreparing: true,
          error: null,
        }));

        const canvas =
          cameraCanvasRef.current || document.createElement("canvas");
        const extractedFrame = await extractFrameFromVideoFile(
          file,
          canvas,
          cinematographyInputConfig
        );

        setState((prev) => ({
          ...prev,
          analysisFile: extractedFrame,
          isPreparing: false,
        }));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "فشل تجهيز الملف المحدد.";
        setError(message);
        setState((prev) => ({
          ...prev,
          isPreparing: false,
          analysisFile: null,
        }));
      }
    },
    [applyPreview, setError, stopCamera]
  );

  const requestCamera = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setState((prev) => ({
        ...prev,
        cameraPermission: "unsupported",
        error: "المتصفح الحالي لا يدعم الوصول للكاميرا.",
      }));
      return;
    }

    try {
      stopCamera();
      applyPreview(null, null);
      setState((prev) => ({
        ...prev,
        mode: "camera",
        selectedFile: null,
        analysisFile: null,
        isPreparing: false,
        cameraPermission: "requesting",
        error: null,
        previewType: null,
        previewUrl: null,
      }));

      const stream = await withCameraRequestTimeout(
        navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: cinematographyInputConfig.captureWidth },
            height: { ideal: cinematographyInputConfig.captureHeight },
            facingMode: "environment",
          },
          audio: false,
        })
      );

      streamRef.current = stream;
      // ربط أولي إن كان عنصر الفيديو متاحًا الآن. إن لم يكن (شائع لأن الـ video
      // لا يُركَّب إلا عند previewType === "camera") سيلتقطه useEffect أدناه فور تركيبه.
      if (cameraVideoRef.current && cameraVideoRef.current.srcObject !== stream) {
        cameraVideoRef.current.srcObject = stream;
        await cameraVideoRef.current.play().catch(() => undefined);
      }

      applyPreview(null, "camera");
      setState((prev) => ({
        ...prev,
        cameraPermission: "granted",
        error: null,
      }));
    } catch (error) {
      const failure = translateCameraFailure(error);

      logger.error("[CinematographyInput] camera start failed", {
        permission: failure.permission,
        message: failure.message,
      });

      setState((prev) => ({
        ...prev,
        cameraPermission: failure.permission,
        error: failure.message,
      }));
    }
  }, [applyPreview, stopCamera]);

  const captureCameraFrame = useCallback(async (): Promise<File | null> => {
    const video = cameraVideoRef.current;
    const canvas = cameraCanvasRef.current;

    if (!video || !canvas || state.cameraPermission !== "granted") {
      setError("فعّل الكاميرا أولًا قبل التقاط إطار التحليل.");
      return null;
    }

    try {
      const frame = await captureFrameFromVideoElement(
        video,
        canvas,
        cinematographyInputConfig
      );
      const frameUrl = URL.createObjectURL(frame);

      applyPreview(frameUrl, "image");
      setState((prev) => ({
        ...prev,
        mode: "camera",
        selectedFile: frame,
        analysisFile: frame,
        error: null,
      }));

      return frame;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "تعذر التقاط إطار من الكاميرا.";
      setError(message);
      return null;
    }
  }, [applyPreview, setError, state.cameraPermission]);

  const clearMedia = useCallback(() => {
    stopCamera();
    applyPreview(null, null);
    setState((prev) => ({
      ...prev,
      selectedFile: null,
      analysisFile: null,
      isPreparing: false,
      error: null,
    }));
  }, [applyPreview, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrlRef.current) {
        revokeObjectUrlSafely(previewUrlRef.current);
        previewUrlRef.current = null;
      }
    };
  }, [stopCamera]);

  // ربط البث بعنصر الفيديو فور توفره — يُغلق الـ race الذي كان يحدث
  // عندما يصل البث قبل تركيب عنصر الفيديو في DOM (لأن الـ video لا يُركَّب
  // إلا حين previewType === "camera").
  useEffect(() => {
    if (state.cameraPermission !== "granted") {
      return;
    }
    const stream = streamRef.current;
    const video = cameraVideoRef.current;
    if (!stream || !video) {
      return;
    }
    if (video.srcObject !== stream) {
      video.srcObject = stream;
      video.play().catch(() => undefined);
    }
  }, [state.cameraPermission, state.previewType]);

  // نشر حالة الكاميرا لطبقة التشخيص — صفر تكلفة عند تعطيل العلم البيئي.
  useEffect(() => {
    publishDiagnostics({
      slice: "camera",
      data: {
        permission: state.cameraPermission,
        previewType: state.previewType,
        lastFrameAt: state.cameraPermission === "granted" ? Date.now() : null,
      },
    });
  }, [state.cameraPermission, state.previewType]);

  const canAnalyze = useMemo(() => {
    return Boolean(state.analysisFile) && !state.isPreparing;
  }, [state.analysisFile, state.isPreparing]);

  return {
    state,
    cameraVideoRef,
    cameraCanvasRef,
    setMode,
    selectMediaFile,
    requestCamera,
    stopCamera,
    captureCameraFrame,
    clearMedia,
    canAnalyze,
  };
}

export default useMediaInputPipeline;

function translateCameraFailure(error: unknown): CameraFailure {
  const errorName =
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
      ? error.name
      : "";

  if (
    errorName === "NotAllowedError" ||
    errorName === "PermissionDeniedError"
  ) {
    return {
      permission: "denied",
      message: "تم رفض صلاحية الكاميرا. يمكنك المتابعة عبر رفع صورة أو فيديو.",
    };
  }

  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
    return {
      permission: "no-device",
      message:
        "لا توجد كاميرا متاحة على هذا الجهاز. استخدم رفع صورة أو فيديو كبديل.",
    };
  }

  if (
    errorName === "SecurityError" ||
    errorName === "TypeError" ||
    errorName === "NotSupportedError"
  ) {
    return {
      permission: "unsupported",
      message:
        "المتصفح الحالي لا يدعم الوصول للكاميرا مباشرة. استخدم رفع الملفات بدلًا منها.",
    };
  }

  if (errorName === "TimeoutError") {
    return {
      permission: "unsupported",
      message:
        "المتصفح الحالي لا يدعم الوصول للكاميرا في جلسة التشغيل الحالية. استخدم رفع الملفات بدلًا منها.",
    };
  }

  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return {
      permission: "error",
      message:
        "الكاميرا مشغولة أو غير قابلة للقراءة الآن. أغلق أي تطبيق آخر يحجزها ثم أعد المحاولة.",
    };
  }

  return {
    permission: "error",
    message: "تعذر تفعيل الكاميرا. يمكنك استخدام رفع الملفات كبديل.",
  };
}

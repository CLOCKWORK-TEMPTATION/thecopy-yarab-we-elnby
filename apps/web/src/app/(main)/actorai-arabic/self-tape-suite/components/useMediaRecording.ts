"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildTakeInsights, pickSupportedMimeType } from "../../lib/self-tape";
import { RECORDING_MIME_CANDIDATES } from "./constants";
import { createNotesFromInsights } from "./utils";
import type {
  ActiveTool,
  CameraState,
  ComparisonView,
  Take,
  TeleprompterSettings,
} from "./types";

interface UseMediaRecordingOptions {
  showNotification: (
    type: "success" | "error" | "info",
    message: string
  ) => void;
  scriptText: string;
  takes: Take[];
  teleprompterSettings: TeleprompterSettings;
  startTeleprompter: () => void;
  stopTeleprompter: () => void;
  markTakeExportable: (takeId: string) => void;
  setTakes: React.Dispatch<React.SetStateAction<Take[]>>;
  setNotesTakeId: (takeId: string | null) => void;
  setComparisonView: React.Dispatch<React.SetStateAction<ComparisonView>>;
  activeTool: ActiveTool;
  blobRegistryRef: React.RefObject<Map<string, Blob>>;
  sessionUrlRegistryRef: React.RefObject<Map<string, string>>;
}

export function useMediaRecording(options: UseMediaRecordingOptions) {
  const {
    showNotification,
    scriptText,
    takes,
    teleprompterSettings,
    startTeleprompter,
    stopTeleprompter,
    markTakeExportable,
    setTakes,
    setNotesTakeId,
    setComparisonView,
    activeTool,
    blobRegistryRef,
    sessionUrlRegistryRef,
  } = options;

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizingTake, setIsFinalizingTake] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimeRef = useRef(0);
  const pendingTakeRef = useRef<{
    id: string;
    name: string;
    recordedAt: string;
    mimeType: string;
    teleprompterUsed: boolean;
  } | null>(null);

  const clearRecordingInterval = useCallback(() => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
  }, []);

  const stopCameraTracks = useCallback((stream?: MediaStream | null) => {
    stream?.getTracks().forEach((track) => {
      track.stop();
    });
  }, []);

  const attachStreamToPreview = useCallback(async (stream: MediaStream) => {
    const preview = previewVideoRef.current;
    if (!preview) return;

    preview.srcObject = stream;
    preview.muted = true;
    preview.playsInline = true;

    try {
      await preview.play();
    } catch {
      // لا نرفع خطأ لأن بعض بيئات الاختبار تمنع التشغيل التلقائي.
    }
  }, []);

  const requestCameraAccess = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      const errorMessage =
        "هذه البيئة لا تدعم الوصول المباشر إلى الكاميرا والميكروفون.";
      setCameraState("error");
      setCameraError(errorMessage);
      showNotification("error", errorMessage);
      return;
    }

    setCameraState("requesting");
    setCameraError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      stopCameraTracks(mediaStreamRef.current);
      mediaStreamRef.current = stream;
      await attachStreamToPreview(stream);
      setCameraState("ready");
      showNotification("success", "تم تفعيل الكاميرا والميكروفون بنجاح.");
    } catch {
      const errorMessage =
        "تعذر الوصول إلى الكاميرا أو الميكروفون. تحقق من الأذونات ثم أعد المحاولة.";
      setCameraState("error");
      setCameraError(errorMessage);
      showNotification("error", errorMessage);
    }
  }, [attachStreamToPreview, showNotification, stopCameraTracks]);

  const finalizeRecordedTake = useCallback(
    (pendingTake: NonNullable<typeof pendingTakeRef.current>) => {
      if (!pendingTake) return;
      const duration = Math.max(recordingTimeRef.current, 1);
      const primaryChunk = recordedChunksRef.current[0];
      const blob =
        recordedChunksRef.current.length > 0
          ? new Blob(recordedChunksRef.current, {
              type:
                pendingTake.mimeType || (primaryChunk?.type ?? "video/webm"),
            })
          : null;
      const videoUrl =
        blob && typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(blob)
          : undefined;

      if (blob && videoUrl) {
        blobRegistryRef.current.set(pendingTake.id, blob);
        sessionUrlRegistryRef.current.set(pendingTake.id, videoUrl);
        markTakeExportable(pendingTake.id);
      }

      const insights = buildTakeInsights({
        durationSeconds: duration,
        scriptText,
        teleprompterUsed: pendingTake.teleprompterUsed,
        hadRetake: takes.some((take) => take.source === "captured"),
      });

      const take: Take = {
        id: pendingTake.id,
        name: pendingTake.name,
        duration,
        recordedAt: pendingTake.recordedAt,
        notes: createNotesFromInsights(insights.notes, duration),
        score: insights.score,
        status: "completed",
        mimeType: blob?.type ?? pendingTake.mimeType,
        source: "captured",
        ...(videoUrl ? { videoUrl } : {}),
      };

      setTakes((previous) => [take, ...previous]);
      setNotesTakeId(take.id);
      setComparisonView((previous) => ({
        ...previous,
        leftTakeId: take.id,
        rightTakeId:
          previous.leftTakeId && previous.leftTakeId !== take.id
            ? previous.leftTakeId
            : previous.rightTakeId && previous.rightTakeId !== take.id
              ? previous.rightTakeId
              : previous.leftTakeId,
      }));
      setIsFinalizingTake(false);
      pendingTakeRef.current = null;
      recordedChunksRef.current = [];

      if (blob) {
        showNotification(
          "success",
          `تم حفظ ${take.name} وتوليد تقييمه المحلي بنجاح.`
        );
        return;
      }

      showNotification(
        "error",
        "انتهى التسجيل لكن المتصفح لم يسلم ملف فيديو قابلاً للتصدير."
      );
    },
    [
      blobRegistryRef,
      sessionUrlRegistryRef,
      markTakeExportable,
      scriptText,
      showNotification,
      takes,
      setTakes,
      setNotesTakeId,
      setComparisonView,
    ]
  );

  const startRecording = useCallback(async () => {
    if (!scriptText.trim()) {
      showNotification("error", "أدخل نصاً قبل بدء التسجيل.");
      return;
    }

    if (isRecording || isFinalizingTake) {
      return;
    }

    let stream = mediaStreamRef.current;
    if (!stream) {
      stream = await requestCameraAccess();
    }

    if (!stream) {
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      showNotification(
        "error",
        "المتصفح الحالي لا يدعم MediaRecorder، لذا لا يمكن تسجيل فيديو فعلي."
      );
      return;
    }

    const preferredMimeType = pickSupportedMimeType(RECORDING_MIME_CANDIDATES);
    let recorder: MediaRecorder;

    try {
      recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);
    } catch {
      recorder = new MediaRecorder(stream);
    }

    recordedChunksRef.current = [];
    clearRecordingInterval();
    setRecordingTime(0);
    recordingTimeRef.current = 0;

    const takeNumber =
      takes.filter((take) => take.source === "captured").length + 1;
    const pendingTake = {
      id: `take-${Date.now()}`,
      name: `Take ${takeNumber}`,
      recordedAt: new Date().toISOString(),
      mimeType: recorder.mimeType || preferredMimeType,
      teleprompterUsed: teleprompterSettings.autoScroll,
    };

    pendingTakeRef.current = pendingTake;
    recorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
    recorder.onstop = () => {
      if (pendingTakeRef.current) {
        finalizeRecordedTake(pendingTakeRef.current);
      }
    };
    recorder.onerror = () => {
      pendingTakeRef.current = null;
      recordedChunksRef.current = [];
      setIsRecording(false);
      setIsFinalizingTake(false);
      showNotification("error", "تعذر إتمام التسجيل. حاول مرة أخرى.");
    };

    try {
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsFinalizingTake(false);
      startTeleprompter();
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((previous) => {
          const next = previous + 1;
          recordingTimeRef.current = next;
          return next;
        });
      }, 1000);
      showNotification("info", "بدأ التسجيل الفعلي ويمكنك إنهاؤه متى شئت.");
    } catch {
      pendingTakeRef.current = null;
      showNotification(
        "error",
        "فشل بدء التسجيل في هذه البيئة رغم توفر الكاميرا."
      );
    }
  }, [
    scriptText,
    isRecording,
    isFinalizingTake,
    requestCameraAccess,
    clearRecordingInterval,
    takes,
    teleprompterSettings.autoScroll,
    startTeleprompter,
    finalizeRecordedTake,
    showNotification,
  ]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      return;
    }

    setIsRecording(false);
    setIsFinalizingTake(true);
    clearRecordingInterval();
    stopTeleprompter();
    showNotification("info", "جاري إنهاء الملف وتحليل التسجيل...");

    try {
      recorder.stop();
    } catch {
      pendingTakeRef.current = null;
      setIsFinalizingTake(false);
      showNotification("error", "تعذر إيقاف التسجيل بشكل صحيح.");
    }
  }, [clearRecordingInterval, showNotification, stopTeleprompter]);

  useEffect(() => {
    if (activeTool === "recorder" && cameraState === "idle") {
      let cancelled = false;
      void Promise.resolve().then(() => {
        if (!cancelled) {
          void requestCameraAccess();
        }
      });
      return () => {
        cancelled = true;
      };
    }
    return undefined;
  }, [activeTool, cameraState, requestCameraAccess]);

  useEffect(() => {
    if (mediaStreamRef.current) {
      void attachStreamToPreview(mediaStreamRef.current);
    }
  }, [activeTool, attachStreamToPreview]);

  useEffect(() => {
    return () => {
      clearRecordingInterval();
      if (mediaRecorderRef.current?.state === "recording") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // تجاهل أخطاء الإيقاف أثناء التفكيك.
        }
      }
      stopCameraTracks(mediaStreamRef.current);
      mediaStreamRef.current = null;
      sessionUrlRegistryRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
      sessionUrlRegistryRef.current.clear();
      blobRegistryRef.current.clear();
    };
  }, [
    clearRecordingInterval,
    stopCameraTracks,
    blobRegistryRef,
    sessionUrlRegistryRef,
  ]);

  return {
    previewVideoRef,
    cameraState,
    cameraError,
    isRecording,
    isFinalizingTake,
    recordingTime,
    requestCameraAccess,
    startRecording,
    stopRecording,
    mediaCaptureSupported: Boolean(
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function" &&
      typeof MediaRecorder !== "undefined"
    ),
    stopCameraTracks,
  };
}

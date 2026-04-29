/**
 * @fileoverview خطاف تحليل الأداء البصري بالكاميرا
 * يدير تشغيل الكاميرا وأخذ عينات محلية من الفيديو واستخراج مؤشرات فعلية
 */

"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type RefObject,
} from "react";

import { postToBackend } from "@/lib/backend-api";

import {
  summarizeWebcamSamples,
  type WebcamFrameSample,
} from "../lib/webcam-analysis";

import type {
  BlinkRateStatus,
  EyeDirection,
  WebcamAnalysisResult,
  WebcamSession,
} from "../types";

export type WebcamPermission = "granted" | "denied" | "pending";

export interface WebcamState {
  isActive: boolean;
  isAnalyzing: boolean;
  analysisTime: number;
  analysisResult: WebcamAnalysisResult | null;
  sessions: WebcamSession[];
  permission: WebcamPermission;
}

export interface UseWebcamAnalysisReturn {
  state: WebcamState;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  requestPermission: () => Promise<void>;
  stopWebcam: () => void;
  startAnalysis: () => { success: boolean; error?: string };
  stopAnalysis: () => WebcamAnalysisResult | null;
  getBlinkStatusText: (status: BlinkRateStatus) => string;
  getBlinkStatusColor: (status: BlinkRateStatus) => string;
  getEyeDirectionText: (direction: EyeDirection) => string;
  clearSessions: () => void;
}

const SAMPLE_WIDTH = 160;
const SAMPLE_HEIGHT = 120;
const FRAME_DELTA_THRESHOLD = 24;

// ─── File-level helpers ───

function buildSessionFromResult(
  result: WebcamAnalysisResult,
  analysisTime: number
): WebcamSession {
  const minutes = Math.floor(analysisTime / 60);
  const seconds = analysisTime % 60;
  const duration = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  return {
    id: Date.now().toString(),
    date:
      new Date().toISOString().split("T")[0] ?? new Date().toLocaleDateString(),
    duration,
    score: result.overallScore,
    alerts: result.alerts.slice(0, 2),
  };
}

function getBlinkStatusText(status: BlinkRateStatus): string {
  switch (status) {
    case "high":
      return "مرتفع (قد يدل على توتر)";
    case "low":
      return "منخفض (تركيز عالي)";
    default:
      return "طبيعي";
  }
}

function getBlinkStatusColor(status: BlinkRateStatus): string {
  switch (status) {
    case "high":
      return "text-orange-600";
    case "low":
      return "text-blue-600";
    default:
      return "text-green-600";
  }
}

function getEyeDirectionText(direction: EyeDirection): string {
  const directions: Record<EyeDirection, string> = {
    up: "للأعلى",
    down: "للأسفل",
    left: "لليسار",
    right: "لليمين",
    center: "للمركز",
    audience: "للجمهور",
  };
  return directions[direction] ?? direction;
}

function sampleVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  previousFrame: Uint8ClampedArray | null
): { sample: WebcamFrameSample; frame: Uint8ClampedArray } | null {
  if (video.videoWidth === 0 || video.videoHeight === 0) {
    return null;
  }

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return null;
  }

  canvas.width = SAMPLE_WIDTH;
  canvas.height = SAMPLE_HEIGHT;
  context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);

  const imageData = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
  const grayscale = new Uint8ClampedArray(SAMPLE_WIDTH * SAMPLE_HEIGHT);

  let motionWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let upperBrightness = 0;
  let upperCount = 0;
  let centerBrightness = 0;
  let centerCount = 0;
  let changedPixels = 0;

  for (let y = 0; y < SAMPLE_HEIGHT; y += 1) {
    for (let x = 0; x < SAMPLE_WIDTH; x += 1) {
      const grayscaleIndex = y * SAMPLE_WIDTH + x;
      const pixelIndex = grayscaleIndex * 4;
      const red = imageData.data[pixelIndex] ?? 0;
      const green = imageData.data[pixelIndex + 1] ?? 0;
      const blue = imageData.data[pixelIndex + 2] ?? 0;
      const brightness = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);

      grayscale[grayscaleIndex] = brightness;

      const previousBrightness = previousFrame?.[grayscaleIndex] ?? brightness;
      const delta = Math.abs(brightness - previousBrightness);

      if (delta > FRAME_DELTA_THRESHOLD) {
        changedPixels += 1;
        motionWeight += delta;
        weightedX += x * delta;
        weightedY += y * delta;
      }

      const inUpperFace =
        y < SAMPLE_HEIGHT / 3 &&
        x > SAMPLE_WIDTH / 4 &&
        x < (SAMPLE_WIDTH * 3) / 4;
      if (inUpperFace) {
        upperBrightness += brightness / 255;
        upperCount += 1;
      }

      const inCenter =
        y > SAMPLE_HEIGHT / 4 &&
        y < (SAMPLE_HEIGHT * 3) / 4 &&
        x > SAMPLE_WIDTH / 4 &&
        x < (SAMPLE_WIDTH * 3) / 4;
      if (inCenter) {
        centerBrightness += brightness / 255;
        centerCount += 1;
      }
    }
  }

  const sample: WebcamFrameSample = {
    timestamp: Date.now(),
    motionX: motionWeight > 0 ? weightedX / motionWeight / SAMPLE_WIDTH : 0.5,
    motionY: motionWeight > 0 ? weightedY / motionWeight / SAMPLE_HEIGHT : 0.5,
    movementEnergy: Math.min(
      1,
      motionWeight / Math.max(1, SAMPLE_WIDTH * SAMPLE_HEIGHT * 255 * 0.12)
    ),
    upperFaceBrightness: upperCount > 0 ? upperBrightness / upperCount : 0,
    centerBrightness: centerCount > 0 ? centerBrightness / centerCount : 0,
    coverage: changedPixels / (SAMPLE_WIDTH * SAMPLE_HEIGHT),
  };

  return { sample, frame: grayscale };
}

export function useWebcamAnalysis(): UseWebcamAnalysisReturn {
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisTime, setAnalysisTime] = useState(0);
  const [analysisResult, setAnalysisResult] =
    useState<WebcamAnalysisResult | null>(null);
  const [sessions, setSessions] = useState<WebcamSession[]>([]);
  const [permission, setPermission] = useState<WebcamPermission>("pending");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analysisFrameRef = useRef<number | null>(null);
  const collectFrameRef = useRef<(() => void) | null>(null);
  const sampleBufferRef = useRef<WebcamFrameSample[]>([]);
  const previousFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastSampleTimeRef = useRef(0);

  const stopSampling = useCallback(() => {
    if (analysisFrameRef.current) {
      cancelAnimationFrame(analysisFrameRef.current);
      analysisFrameRef.current = null;
    }
  }, []);

  const scheduleCollectionFrame = useCallback(() => {
    const collectFrame = collectFrameRef.current;
    if (collectFrame) {
      analysisFrameRef.current = requestAnimationFrame(collectFrame);
    }
  }, []);

  useEffect(() => {
    if (isAnalyzing) {
      timerIntervalRef.current = setInterval(() => {
        setAnalysisTime((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isAnalyzing]);

  const requestPermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      setPermission("granted");
      setIsActive(true);
    } catch {
      setPermission("denied");
      throw new Error("لم يتم السماح بالوصول للكاميرا");
    }
  }, []);

  const stopWebcam = useCallback(() => {
    stopSampling();

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    previousFrameRef.current = null;
    sampleBufferRef.current = [];
    setIsActive(false);
    setIsAnalyzing(false);
    setAnalysisTime(0);
  }, [stopSampling]);

  const collectFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      scheduleCollectionFrame();
      return;
    }

    const now = Date.now();
    if (now - lastSampleTimeRef.current >= 200) {
      const sampledFrame = sampleVideoFrame(
        videoRef.current,
        canvasRef.current,
        previousFrameRef.current
      );

      if (sampledFrame) {
        sampleBufferRef.current.push(sampledFrame.sample);
        previousFrameRef.current = sampledFrame.frame;
        lastSampleTimeRef.current = now;
      }
    }

    scheduleCollectionFrame();
  }, [scheduleCollectionFrame]);

  useEffect(() => {
    collectFrameRef.current = collectFrame;
  }, [collectFrame]);

  const startAnalysis = useCallback((): {
    success: boolean;
    error?: string;
  } => {
    if (!isActive) {
      return { success: false, error: "يرجى تفعيل الكاميرا أولاً" };
    }

    sampleBufferRef.current = [];
    previousFrameRef.current = null;
    lastSampleTimeRef.current = 0;
    setIsAnalyzing(true);
    setAnalysisTime(0);
    setAnalysisResult(null);
    stopSampling();
    scheduleCollectionFrame();
    return { success: true };
  }, [isActive, scheduleCollectionFrame, stopSampling]);

  const stopAnalysis = useCallback((): WebcamAnalysisResult | null => {
    setIsAnalyzing(false);
    stopSampling();

    const result = summarizeWebcamSamples(
      sampleBufferRef.current,
      analysisTime > 0 ? analysisTime : 1
    );

    setAnalysisResult(result);
    setSessions((prev) => [
      buildSessionFromResult(result, analysisTime),
      ...prev,
    ]);
    void postToBackend("/api/public/actorai/webcam-analysis", result, {
      bestEffort: true,
    });
    sampleBufferRef.current = [];
    previousFrameRef.current = null;

    return result;
  }, [analysisTime, stopSampling]);

  const getBlinkStatusTextCb = useCallback(
    (status: BlinkRateStatus) => getBlinkStatusText(status),
    []
  );

  const getBlinkStatusColorCb = useCallback(
    (status: BlinkRateStatus) => getBlinkStatusColor(status),
    []
  );

  const getEyeDirectionTextCb = useCallback(
    (direction: EyeDirection) => getEyeDirectionText(direction),
    []
  );

  const clearSessions = useCallback(() => {
    setSessions([]);
  }, []);

  useEffect(() => () => stopWebcam(), [stopWebcam]);

  const state: WebcamState = {
    isActive,
    isAnalyzing,
    analysisTime,
    analysisResult,
    sessions,
    permission,
  };

  return {
    state,
    videoRef,
    canvasRef,
    requestPermission,
    stopWebcam,
    startAnalysis,
    stopAnalysis,
    getBlinkStatusText: getBlinkStatusTextCb,
    getBlinkStatusColor: getBlinkStatusColorCb,
    getEyeDirectionText: getEyeDirectionTextCb,
    clearSessions,
  };
}

export default useWebcamAnalysis;

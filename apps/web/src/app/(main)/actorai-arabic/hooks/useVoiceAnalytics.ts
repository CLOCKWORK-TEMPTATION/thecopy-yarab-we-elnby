"use client";

import { useState, useCallback, useRef, useEffect } from "react";

import { postToBackend } from "@/lib/backend-api";

import {
  isMediaFeatureAllowedByPolicy,
  translateMediaDeviceError,
  type MediaDeviceStatus,
} from "../lib/media-device-errors";

// ==================== أنواع البيانات ====================

export interface VoiceMetrics {
  // طبقة الصوت (Pitch)
  pitch: {
    value: number; // Hz
    level: "low" | "medium" | "high";
    label: string;
  };
  // شدة الصوت (Volume)
  volume: {
    value: number; // dB
    level: "quiet" | "normal" | "loud";
    label: string;
  };
  // سرعة الكلام (WPM)
  speechRate: {
    wpm: number;
    level: "slow" | "normal" | "fast";
    warning: string | null;
  };
  // وضوح المخارج (Articulation)
  articulation: {
    score: number; // 0-100
    level: "poor" | "fair" | "good" | "excellent";
    label: string;
  };
  // نمط التنفس
  breathing: {
    isBreathing: boolean;
    breathCount: number;
    warning: string | null;
    lastBreathTime: number;
  };
  // الوقفات الدرامية
  pauses: {
    count: number;
    averageDuration: number;
    isEffective: boolean;
    feedback: string;
  };
}

export interface VoiceAnalyticsState {
  isListening: boolean;
  isSupported: boolean;
  error: string | null;
  deviceStatus: MediaDeviceStatus | "idle" | "granted";
  metrics: VoiceMetrics;
  waveformData: number[];
  frequencyData: number[];
  history: VoiceMetrics[];
}

const DEFAULT_METRICS: VoiceMetrics = {
  pitch: { value: 0, level: "medium", label: "متوسط" },
  volume: { value: 0, level: "normal", label: "عادي" },
  speechRate: { wpm: 0, level: "normal", warning: null },
  articulation: { score: 0, level: "fair", label: "جيد" },
  breathing: {
    isBreathing: false,
    breathCount: 0,
    warning: null,
    lastBreathTime: 0,
  },
  pauses: { count: 0, averageDuration: 0, isEffective: true, feedback: "" },
};

// ==================== دوال التحليل (file-level) ====================

function analyzePitch(frequency: number): VoiceMetrics["pitch"] {
  if (frequency === 0) {
    return { value: 0, level: "medium", label: "لا يوجد صوت" };
  }

  if (frequency < 150) {
    return { value: frequency, level: "low", label: "منخفض" };
  } else if (frequency < 300) {
    return { value: frequency, level: "medium", label: "متوسط" };
  } else {
    return { value: frequency, level: "high", label: "مرتفع" };
  }
}

function analyzeVolume(decibels: number): VoiceMetrics["volume"] {
  if (decibels < -50) {
    return { value: decibels, level: "quiet", label: "هادئ" };
  } else if (decibels < -20) {
    return { value: decibels, level: "normal", label: "عادي" };
  } else {
    return { value: decibels, level: "loud", label: "مرتفع" };
  }
}

function analyzeSpeechRate(wpm: number): VoiceMetrics["speechRate"] {
  if (wpm < 100) {
    return {
      wpm,
      level: "slow",
      warning: "سرعتك بطيئة، حاول زيادة الإيقاع قليلاً",
    };
  } else if (wpm > 180) {
    return {
      wpm,
      level: "fast",
      warning: "⚠️ أنت تتحدث بسرعة! أبطئ لتحسين الوضوح",
    };
  } else {
    return { wpm, level: "normal", warning: null };
  }
}

function analyzeArticulation(clarity: number): VoiceMetrics["articulation"] {
  const score = Math.min(100, Math.max(0, clarity));

  if (score < 40) {
    return { score, level: "poor", label: "ضعيف - ركز على وضوح الحروف" };
  } else if (score < 60) {
    return { score, level: "fair", label: "مقبول - يمكن تحسينه" };
  } else if (score < 80) {
    return { score, level: "good", label: "جيد - استمر!" };
  } else {
    return { score, level: "excellent", label: "ممتاز! 🌟" };
  }
}

function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const SIZE = buffer.length;
  const MAX_SAMPLES = Math.floor(SIZE / 2);
  let bestOffset = -1;
  let bestCorrelation = 0;
  let rms = 0;
  let foundGoodCorrelation = false;
  const correlations = new Array(MAX_SAMPLES);

  for (let i = 0; i < SIZE; i++) {
    const val = buffer[i] ?? 0;
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);

  if (rms < 0.01) return 0;

  let lastCorrelation = 1;
  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let correlation = 0;

    for (let i = 0; i < MAX_SAMPLES; i++) {
      const val1 = buffer[i] ?? 0;
      const val2 = buffer[i + offset] ?? 0;
      correlation += Math.abs(val1 - val2);
    }
    correlation = 1 - correlation / MAX_SAMPLES;
    correlations[offset] = correlation;

    if (correlation > 0.9 && correlation > lastCorrelation) {
      foundGoodCorrelation = true;
      if (correlation > bestCorrelation) {
        bestCorrelation = correlation;
        bestOffset = offset;
      }
    } else if (foundGoodCorrelation) {
      const shift =
        (correlations[bestOffset + 1] - correlations[bestOffset - 1]) /
        correlations[bestOffset];
      return sampleRate / (bestOffset + 8 * shift);
    }
    lastCorrelation = correlation;
  }

  if (bestCorrelation > 0.01) {
    return sampleRate / bestOffset;
  }
  return 0;
}

// ─── Helper: compute wpm from word count and start time ───
function computeWpm(wordCount: number, startTime: number): number {
  const elapsedMinutes = (Date.now() - startTime) / 60000;
  return elapsedMinutes > 0 ? Math.round(wordCount / elapsedMinutes) : 0;
}

// ─── Helper: compute pauses feedback string ───
function computePausesFeedback(avgPauseDuration: number): string {
  if (avgPauseDuration > 2000) return "الوقفات طويلة جداً، حاول تقصيرها";
  if (avgPauseDuration > 500) return "وقفات درامية جيدة! 👍";
  return "أضف وقفات درامية لتعزيز المعنى";
}

// ─── Helper: compute breathing warning ───
function computeBreathingWarning(
  lastBreathTime: number,
  rms: number
): string | null {
  return Date.now() - lastBreathTime > 15000 && rms > 0.01
    ? "⚠️ تذكر أن تتنفس! لا تحبس نفسك"
    : null;
}

// ─── Helper: detect silence events and update tracking refs ───
interface SilenceTrackers {
  silenceStartRef: React.MutableRefObject<number>;
  pauseCountRef: React.MutableRefObject<number>;
  pauseDurationsRef: React.MutableRefObject<number[]>;
  wordCountRef: React.MutableRefObject<number>;
  lastSpeechTimeRef: React.MutableRefObject<number>;
  breathCountRef: React.MutableRefObject<number>;
  lastBreathTimeRef: React.MutableRefObject<number>;
}

function processSilenceTracking(
  isSilent: boolean,
  frequency: number,
  trackers: SilenceTrackers
): void {
  const now = Date.now();
  const {
    silenceStartRef,
    pauseCountRef,
    pauseDurationsRef,
    wordCountRef,
    lastSpeechTimeRef,
    breathCountRef,
    lastBreathTimeRef,
  } = trackers;

  if (isSilent) {
    if (silenceStartRef.current === 0) {
      silenceStartRef.current = now;
    }

    const silenceDuration = now - silenceStartRef.current;

    if (
      silenceDuration > 300 &&
      silenceDuration < 800 &&
      lastBreathTimeRef.current + 2000 < now
    ) {
      breathCountRef.current++;
      lastBreathTimeRef.current = now;
    }

    if (silenceDuration > 500 && lastSpeechTimeRef.current > 0) {
      if (
        pauseDurationsRef.current[pauseDurationsRef.current.length - 1] !==
        silenceDuration
      ) {
        pauseCountRef.current++;
        pauseDurationsRef.current.push(silenceDuration);
      }
    }
  } else {
    silenceStartRef.current = 0;
    lastSpeechTimeRef.current = now;

    if (frequency > 80) {
      wordCountRef.current += 0.05;
    }
  }
}

function supportsMicrophoneCapture(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return (
    isMediaFeatureAllowedByPolicy("microphone") &&
    typeof Reflect.get(navigator, "mediaDevices") === "object" &&
    navigator.mediaDevices !== undefined &&
    typeof Reflect.get(navigator.mediaDevices, "getUserMedia") === "function" &&
    typeof AudioContext !== "undefined"
  );
}

function getBoundMicrophoneRequest():
  | ((constraints: MediaStreamConstraints) => Promise<MediaStream>)
  | null {
  if (!supportsMicrophoneCapture()) {
    return null;
  }

  return navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
}

// ==================== الـ Hook الرئيسي ====================

export function useVoiceAnalytics() {
  const [state, setState] = useState<VoiceAnalyticsState>({
    isListening: false,
    isSupported: supportsMicrophoneCapture(),
    error: null,
    deviceStatus: "idle",
    metrics: DEFAULT_METRICS,
    waveformData: [],
    frequencyData: [],
    history: [],
  });

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const silenceStartRef = useRef<number>(0);
  const pauseCountRef = useRef<number>(0);
  const pauseDurationsRef = useRef<number[]>([]);
  const wordCountRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const lastSpeechTimeRef = useRef<number>(0);
  const breathCountRef = useRef<number>(0);
  const lastBreathTimeRef = useRef<number>(0);
  const updateMetricsRef = useRef<() => void>(() => undefined);

  const updateMetrics = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.fftSize;
    const dataArray = new Float32Array(bufferLength);
    const frequencyArray = new Uint8Array(analyser.frequencyBinCount);

    analyser.getFloatTimeDomainData(dataArray);
    analyser.getByteFrequencyData(frequencyArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i] ?? 0;
      sum += val * val;
    }
    const rms = Math.sqrt(sum / bufferLength);
    const decibels = 20 * Math.log10(rms + 0.0001);

    const frequency = detectPitch(
      dataArray,
      audioContextRef.current.sampleRate
    );

    const isSilent = rms < 0.01;
    processSilenceTracking(isSilent, frequency, {
      silenceStartRef,
      pauseCountRef,
      pauseDurationsRef,
      wordCountRef,
      lastSpeechTimeRef,
      breathCountRef,
      lastBreathTimeRef,
    });

    const now = Date.now();
    const wpm = computeWpm(wordCountRef.current, startTimeRef.current);

    const avgPauseDuration =
      pauseDurationsRef.current.length > 0
        ? pauseDurationsRef.current.reduce((a, b) => a + b, 0) /
          pauseDurationsRef.current.length
        : 0;

    const pausesFeedback = computePausesFeedback(avgPauseDuration);
    const breathingWarning = computeBreathingWarning(
      lastBreathTimeRef.current,
      rms
    );

    const spectralSum = frequencyArray.reduce((a, b) => a + b, 0);
    const spectralAvg = spectralSum / frequencyArray.length;
    const articulationScore = Math.min(100, (spectralAvg / 128) * 100);

    setState((prev) => ({
      ...prev,
      metrics: {
        pitch: analyzePitch(frequency),
        volume: analyzeVolume(decibels),
        speechRate: analyzeSpeechRate(wpm),
        articulation: analyzeArticulation(articulationScore),
        breathing: {
          isBreathing: isSilent && now - silenceStartRef.current > 300,
          breathCount: breathCountRef.current,
          warning: breathingWarning,
          lastBreathTime: lastBreathTimeRef.current,
        },
        pauses: {
          count: pauseCountRef.current,
          averageDuration: avgPauseDuration,
          isEffective: avgPauseDuration > 400 && avgPauseDuration < 2500,
          feedback: pausesFeedback,
        },
      },
      waveformData: Array.from(dataArray.slice(0, 128)),
      frequencyData: Array.from(frequencyArray.slice(0, 64)),
    }));

    animationFrameRef.current = requestAnimationFrame(() => {
      updateMetricsRef.current();
    });
  }, []);

  useEffect(() => {
    updateMetricsRef.current = updateMetrics;
  }, [updateMetrics]);

  const startListening = useCallback(async () => {
    try {
      const requestMicrophone = getBoundMicrophoneRequest();
      if (!requestMicrophone) {
        const failure = translateMediaDeviceError(
          new DOMException(
            isMediaFeatureAllowedByPolicy("microphone")
              ? "Not supported"
              : "Blocked by permissions policy",
            isMediaFeatureAllowedByPolicy("microphone")
              ? "NotSupportedError"
              : "SecurityError"
          ),
          "microphone"
        );
        setState((prev) => ({
          ...prev,
          error: failure.message,
          deviceStatus: failure.status,
        }));
        return;
      }

      silenceStartRef.current = 0;
      pauseCountRef.current = 0;
      pauseDurationsRef.current = [];
      wordCountRef.current = 0;
      startTimeRef.current = Date.now();
      lastSpeechTimeRef.current = 0;
      breathCountRef.current = 0;
      lastBreathTimeRef.current = Date.now();

      const stream = await requestMicrophone({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      setState((prev) => ({
        ...prev,
        isListening: true,
        error: null,
        deviceStatus: "granted",
      }));

      updateMetricsRef.current();
    } catch (error) {
      const failure = translateMediaDeviceError(error, "microphone");
      setState((prev) => ({
        ...prev,
        error: failure.message,
        deviceStatus: failure.status,
      }));
    }
  }, []);

  const stopListening = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // لا نعيد رمي خطأ إغلاق سياق الصوت أثناء إيقاف الاستماع.
      });
      audioContextRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setState((prev) => {
      postToBackend("/api/public/actorai/voice-analytics", prev.metrics, {
        bestEffort: true,
      }).catch(() => {
        // best-effort فقط؛ لا نكسر إيقاف التسجيل عند فشل الإرسال.
      });

      return {
        ...prev,
        isListening: false,
        history: [...prev.history, prev.metrics],
      };
    });
  }, []);

  const reset = useCallback(() => {
    stopListening();
    setState({
      isListening: false,
      isSupported: supportsMicrophoneCapture(),
      error: null,
      deviceStatus: "idle",
      metrics: DEFAULT_METRICS,
      waveformData: [],
      frequencyData: [],
      history: [],
    });
  }, [stopListening]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {
          // تنظيف غير متزامن أثناء إزالة المكوّن.
        });
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    reset,
  };
}

export default useVoiceAnalytics;

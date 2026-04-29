import { clamp } from "./studio-engines-text-utils";

import type { WebcamAnalysisResult } from "../types";

export interface WebcamAnalysisFrameSample {
  timestamp: number;
  centroidX: number;
  centroidY: number;
  motion: number;
  focus: number;
  brightness: number;
}

export interface WebcamAnalysisInput {
  analysisTime: number;
  samples: WebcamAnalysisFrameSample[];
}

// ─── File-level helpers ───

function detectBlinkRate(
  samples: WebcamAnalysisFrameSample[],
  averageFocus: number
): number {
  let dips = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    if (!previous || !current) continue;

    if (previous.focus >= averageFocus && current.focus < averageFocus - 0.08) {
      dips += 1;
    }
  }

  const estimatedPerMinute = (dips / Math.max(samples.length, 1)) * 60 * 2.5;
  return Math.round(clamp(estimatedPerMinute || 14, 8, 28));
}

function deriveEyeDirection(
  averageX: number,
  averageY: number,
  consistency: number
): WebcamAnalysisResult["eyeLine"]["direction"] {
  if (averageY < 0.38) return "up";
  if (averageY > 0.62) return "down";
  if (averageX < 0.38) return "left";
  if (averageX > 0.62) return "right";
  if (consistency >= 72) return "center";
  return "audience";
}

interface SampleAverages {
  averageX: number;
  averageY: number;
  averageMotion: number;
  averageFocus: number;
  averageBrightness: number;
  averageOffset: number;
}

function computeSampleAverages(
  samples: WebcamAnalysisFrameSample[]
): SampleAverages {
  const count = samples.length;
  return {
    averageX: samples.reduce((sum, s) => sum + s.centroidX, 0) / count,
    averageY: samples.reduce((sum, s) => sum + s.centroidY, 0) / count,
    averageMotion: samples.reduce((sum, s) => sum + s.motion, 0) / count,
    averageFocus: samples.reduce((sum, s) => sum + s.focus, 0) / count,
    averageBrightness:
      samples.reduce((sum, s) => sum + s.brightness, 0) / count,
    averageOffset:
      samples.reduce(
        (sum, s) =>
          sum + Math.abs(s.centroidX - 0.5) + Math.abs(s.centroidY - 0.5),
        0
      ) / count,
  };
}

interface AnalysisAlerts {
  eyeAlerts: string[];
  alerts: string[];
  mismatches: string[];
  suggestions: string[];
}

function buildAlerts(params: {
  consistency: number;
  blinkStatus: "high" | "low" | "normal";
  spaceUsage: number;
  tensionIndicator: number;
  averageBrightness: number;
}): AnalysisAlerts {
  const {
    consistency,
    blinkStatus,
    spaceUsage,
    tensionIndicator,
    averageBrightness,
  } = params;

  const eyeAlerts: string[] = [];
  const alerts: string[] = [];
  const mismatches: string[] = [];
  const suggestions: string[] = [];

  if (consistency < 68) {
    eyeAlerts.push("خط النظر يتغير كثيراً، ثبّت نقطة التركيز الأساسية.");
    alerts.push("اتساق النظر أقل من المطلوب للمشهد المواجه للكاميرا.");
  }
  if (blinkStatus === "high") {
    alerts.push("معدل الرمش مرتفع وقد يشير إلى توتر زائد.");
  }
  if (spaceUsage < 35) {
    suggestions.push("استخدم مساحة أكبر داخل الكادر لتقوية الحضور.");
  } else {
    suggestions.push("استخدامك للمساحة متوازن ويمكن البناء عليه.");
  }
  if (tensionIndicator > 65) {
    mismatches.push("التوتر الجسدي أعلى من المطلوب في بعض اللحظات.");
  }
  if (averageBrightness < 0.35) {
    alerts.push("الإضاءة منخفضة وقد تؤثر في دقة التقييم البصري.");
  }

  return { eyeAlerts, alerts, mismatches, suggestions };
}

function buildEmptySamplesResult(analysisTime: number): WebcamAnalysisResult {
  return {
    eyeLine: {
      direction: "center",
      consistency: 62,
      alerts: ["لم تُجمع عينات كافية، أعد التحليل في إضاءة أوضح."],
    },
    expressionSync: {
      score: clamp(58 + Math.round(analysisTime / 3), 58, 78),
      matchedEmotions: ["تركيز"],
      mismatches: ["التحليل يحتاج مدة أطول للحصول على تطابق تعبيري أوضح."],
    },
    blinkRate: {
      rate: 15,
      status: "normal",
      tensionIndicator: 34,
    },
    blocking: {
      spaceUsage: 36,
      movements: ["الحركة المرصودة محدودة بسبب نقص العينات."],
      suggestions: ["تحرك ضمن الكادر بشكل أوضح ثم أعد التحليل."],
    },
    alerts: ["لا توجد بيانات كافية لإنتاج حكم بصري قوي."],
    overallScore: 58,
    timestamp: new Date().toISOString(),
  };
}

// ─── Main export ───

export function buildWebcamAnalysisSummary(
  input: WebcamAnalysisInput
): WebcamAnalysisResult {
  const { analysisTime, samples } = input;

  if (samples.length === 0) {
    return buildEmptySamplesResult(analysisTime);
  }

  const avg = computeSampleAverages(samples);
  const consistency = clamp(Math.round(100 - avg.averageOffset * 140), 45, 96);
  const blinkRateValue = detectBlinkRate(samples, avg.averageFocus);
  const blinkStatus =
    blinkRateValue > 22 ? "high" : blinkRateValue < 11 ? "low" : "normal";
  const tensionIndicator = clamp(
    Math.round(avg.averageMotion * 130 + (blinkRateValue - 12) * 1.8),
    18,
    88
  );
  const expressionScore = clamp(
    Math.round(
      avg.averageFocus * 58 +
        avg.averageBrightness * 18 +
        (analysisTime > 45 ? 12 : 0)
    ),
    54,
    93
  );
  const spaceUsage = clamp(
    Math.round(
      avg.averageMotion * 160 +
        (1 - consistency / 100) * 32 +
        avg.averageOffset * 80
    ),
    24,
    90
  );

  const { eyeAlerts, alerts, mismatches, suggestions } = buildAlerts({
    consistency,
    blinkStatus,
    spaceUsage,
    tensionIndicator,
    averageBrightness: avg.averageBrightness,
  });

  const matchedEmotions = [
    avg.averageMotion > 0.32 ? "اندفاع" : "هدوء",
    avg.averageFocus > 0.72 ? "تركيز" : "ترقب",
    avg.averageBrightness > 0.5 ? "انفتاح" : "انكماش",
  ];

  const overallScore = clamp(
    Math.round(
      consistency * 0.34 +
        expressionScore * 0.32 +
        (100 - tensionIndicator) * 0.18 +
        spaceUsage * 0.16
    ),
    52,
    94
  );

  return {
    eyeLine: {
      direction: deriveEyeDirection(avg.averageX, avg.averageY, consistency),
      consistency,
      alerts: eyeAlerts,
    },
    expressionSync: {
      score: expressionScore,
      matchedEmotions,
      mismatches,
    },
    blinkRate: {
      rate: blinkRateValue,
      status: blinkStatus,
      tensionIndicator,
    },
    blocking: {
      spaceUsage,
      movements: [
        avg.averageMotion > 0.3
          ? "هناك تحرك واضح يخدم لحظات التصعيد."
          : "الحركة محدودة وتميل للثبات داخل الكادر.",
        consistency >= 72
          ? "التموضع العام أمام الكاميرا متزن."
          : "التموضع يتغير باستمرار ويحتاج ضبطاً أفضل.",
      ],
      suggestions,
    },
    alerts,
    overallScore,
    timestamp: new Date().toISOString(),
  };
}

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

export function buildWebcamAnalysisSummary(
  input: WebcamAnalysisInput
): WebcamAnalysisResult {
  const { analysisTime, samples } = input;

  if (samples.length === 0) {
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

  const averageX =
    samples.reduce((sum, sample) => sum + sample.centroidX, 0) / samples.length;
  const averageY =
    samples.reduce((sum, sample) => sum + sample.centroidY, 0) / samples.length;
  const averageMotion =
    samples.reduce((sum, sample) => sum + sample.motion, 0) / samples.length;
  const averageFocus =
    samples.reduce((sum, sample) => sum + sample.focus, 0) / samples.length;
  const averageBrightness =
    samples.reduce((sum, sample) => sum + sample.brightness, 0) /
    samples.length;
  const averageOffset =
    samples.reduce(
      (sum, sample) =>
        sum +
        Math.abs(sample.centroidX - 0.5) +
        Math.abs(sample.centroidY - 0.5),
      0
    ) / samples.length;

  const consistency = clamp(Math.round(100 - averageOffset * 140), 45, 96);
  const blinkRateValue = detectBlinkRate(samples, averageFocus);
  const blinkStatus =
    blinkRateValue > 22 ? "high" : blinkRateValue < 11 ? "low" : "normal";
  const tensionIndicator = clamp(
    Math.round(averageMotion * 130 + (blinkRateValue - 12) * 1.8),
    18,
    88
  );
  const expressionScore = clamp(
    Math.round(
      averageFocus * 58 + averageBrightness * 18 + (analysisTime > 45 ? 12 : 0)
    ),
    54,
    93
  );
  const spaceUsage = clamp(
    Math.round(
      averageMotion * 160 + (1 - consistency / 100) * 32 + averageOffset * 80
    ),
    24,
    90
  );

  const alerts: string[] = [];
  const eyeAlerts: string[] = [];
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

  const matchedEmotions = [
    averageMotion > 0.32 ? "اندفاع" : "هدوء",
    averageFocus > 0.72 ? "تركيز" : "ترقب",
    averageBrightness > 0.5 ? "انفتاح" : "انكماش",
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
      direction: deriveEyeDirection(averageX, averageY, consistency),
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
        averageMotion > 0.3
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

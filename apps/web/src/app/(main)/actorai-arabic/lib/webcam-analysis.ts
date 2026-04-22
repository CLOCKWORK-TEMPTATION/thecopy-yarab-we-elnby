import type { EyeDirection, WebcamAnalysisResult } from "../types";

export interface WebcamFrameSample {
  timestamp: number;
  motionX: number;
  motionY: number;
  movementEnergy: number;
  upperFaceBrightness: number;
  centerBrightness: number;
  coverage: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferDirection(
  avgX: number,
  avgY: number,
  energy: number
): EyeDirection {
  if (avgY > 0.6) {
    return "down";
  }
  if (avgY < 0.38) {
    return "up";
  }
  if (avgX < 0.38) {
    return "left";
  }
  if (avgX > 0.62) {
    return "right";
  }
  if (energy < 0.12) {
    return "center";
  }
  return "audience";
}

function detectBlinkCount(samples: WebcamFrameSample[]): number {
  let count = 0;

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    if (!previous || !current || !next) {
      continue;
    }

    const dropsFromPrevious =
      previous.upperFaceBrightness - current.upperFaceBrightness > 0.18;
    const recoversOnNext =
      next.upperFaceBrightness - current.upperFaceBrightness > 0.18;

    if (dropsFromPrevious && recoversOnNext) {
      count += 1;
    }
  }

  return count;
}

export function summarizeWebcamSamples(
  samples: WebcamFrameSample[],
  durationSeconds: number
): WebcamAnalysisResult {
  if (samples.length === 0) {
    return {
      eyeLine: {
        direction: "center",
        consistency: 0,
        alerts: ["لا توجد بيانات كافية لإنتاج تحليل بصري."],
      },
      expressionSync: {
        score: 0,
        matchedEmotions: [],
        mismatches: ["لم تكتمل مدة التحليل المطلوبة."],
      },
      blinkRate: {
        rate: 0,
        status: "normal",
        tensionIndicator: 0,
      },
      blocking: {
        spaceUsage: 0,
        movements: [],
        suggestions: [
          "ابدأ جلسة أطول مع تثبيت الكاميرا للحصول على نتيجة أوضح.",
        ],
      },
      alerts: ["لا توجد عينات فيديو كافية."],
      overallScore: 0,
      timestamp: new Date().toISOString(),
    };
  }

  const avgX = average(samples.map((sample) => sample.motionX));
  const avgY = average(samples.map((sample) => sample.motionY));
  const avgEnergy = average(samples.map((sample) => sample.movementEnergy));
  const avgCoverage = average(samples.map((sample) => sample.coverage));
  const avgBrightness = average(
    samples.map((sample) => sample.centerBrightness)
  );
  const blinkCount = detectBlinkCount(samples);
  const blinkRate = Math.round(
    (blinkCount / Math.max(durationSeconds, 1)) * 60
  );
  const consistency = clamp(
    Math.round(
      100 -
        average(
          samples.map(
            (sample) =>
              Math.abs(sample.motionX - avgX) * 120 +
              Math.abs(sample.motionY - avgY) * 120
          )
        )
    ),
    0,
    100
  );
  const direction = inferDirection(avgX, avgY, avgEnergy);
  const tensionIndicator = clamp(
    Math.round(avgEnergy * 180 + blinkRate * 1.8),
    0,
    100
  );
  const expressionScore = clamp(
    Math.round(avgBrightness * 55 + avgCoverage * 65 + avgEnergy * 55),
    0,
    100
  );
  const spaceUsage = clamp(Math.round(avgCoverage * 100), 0, 100);

  const matchedEmotions = [
    avgEnergy > 0.28 ? "حضور واضح" : "هدوء مضبوط",
    spaceUsage > 35 ? "استثمار جيد للمجال" : "اقتصاد في الحركة",
  ];

  const mismatches = [
    consistency < 55 ? "اتساق النظرة يحتاج إلى تثبيت أكبر." : "",
    tensionIndicator > 70
      ? "توتر بصري مرتفع نسبياً في الجزء العلوي من الوجه."
      : "",
  ].filter(Boolean);

  const eyeAlerts = [
    direction === "down" ? "النظرة تميل للأسفل أكثر من المطلوب." : "",
    consistency < 60 ? "حركة الرأس أو العين غير مستقرة في بعض اللحظات." : "",
  ].filter(Boolean);

  const blockingSuggestions = [
    spaceUsage < 20
      ? "وسّع مجال الحركة قليلاً حتى لا يبدو الأداء منغلقاً."
      : "",
    spaceUsage > 65
      ? "خفف الانتقال الجسدي حتى يبقى التركيز على الوجه والصوت."
      : "",
    avgEnergy < 0.12 ? "أضف نبضات حركية صغيرة لإبقاء الإطار حيّاً." : "",
  ].filter(Boolean);

  const alerts = [
    ...eyeAlerts,
    ...(blinkRate > 28 ? ["معدل الرمش مرتفع وقد يشير إلى إجهاد أو توتر."] : []),
    ...(spaceUsage < 18 ? ["استخدام المساحة محدود ويحتاج إلى تنويع."] : []),
  ];

  const overallScore = clamp(
    Math.round(
      consistency * 0.35 +
        expressionScore * 0.35 +
        (100 - tensionIndicator) * 0.15 +
        spaceUsage * 0.15
    ),
    0,
    100
  );

  return {
    eyeLine: {
      direction,
      consistency,
      alerts: eyeAlerts,
    },
    expressionSync: {
      score: expressionScore,
      matchedEmotions,
      mismatches,
    },
    blinkRate: {
      rate: blinkRate,
      status: blinkRate > 28 ? "high" : blinkRate < 8 ? "low" : "normal",
      tensionIndicator,
    },
    blocking: {
      spaceUsage,
      movements: [
        spaceUsage > 40 ? "حركة موزعة على الإطار" : "تمركز قريب من نقطة ثابتة",
        avgEnergy > 0.24 ? "طاقة جسدية قابلة للقراءة" : "أداء هادئ قليل الحركة",
      ],
      suggestions:
        blockingSuggestions.length > 0
          ? blockingSuggestions
          : ["التوازن الحركي جيد، حافظ على ثبات النظرة في اللحظات الحساسة."],
    },
    alerts,
    overallScore,
    timestamp: new Date().toISOString(),
  };
}

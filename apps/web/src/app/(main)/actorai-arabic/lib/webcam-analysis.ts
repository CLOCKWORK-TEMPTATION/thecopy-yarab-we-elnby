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

// ─── File-level helpers ───

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function inferDirection(
  avgX: number,
  avgY: number,
  energy: number
): EyeDirection {
  if (avgY > 0.6) return "down";
  if (avgY < 0.38) return "up";
  if (avgX < 0.38) return "left";
  if (avgX > 0.62) return "right";
  if (energy < 0.12) return "center";
  return "audience";
}

function detectBlinkCount(samples: WebcamFrameSample[]): number {
  let count = 0;

  for (let index = 1; index < samples.length - 1; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const next = samples[index + 1];
    if (!previous || !current || !next) continue;

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

function buildEmptySamplesResult(): WebcamAnalysisResult {
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
      suggestions: ["ابدأ جلسة أطول مع تثبيت الكاميرا للحصول على نتيجة أوضح."],
    },
    alerts: ["لا توجد عينات فيديو كافية."],
    overallScore: 0,
    timestamp: new Date().toISOString(),
  };
}

function buildBlockingSuggestions(
  spaceUsage: number,
  avgEnergy: number
): string[] {
  const suggestions = [
    spaceUsage < 20
      ? "وسّع مجال الحركة قليلاً حتى لا يبدو الأداء منغلقاً."
      : "",
    spaceUsage > 65
      ? "خفف الانتقال الجسدي حتى يبقى التركيز على الوجه والصوت."
      : "",
    avgEnergy < 0.12 ? "أضف نبضات حركية صغيرة لإبقاء الإطار حيّاً." : "",
  ].filter(Boolean);

  return suggestions.length > 0
    ? suggestions
    : ["التوازن الحركي جيد، حافظ على ثبات النظرة في اللحظات الحساسة."];
}

function buildAnalysisAlerts(
  direction: EyeDirection,
  consistency: number,
  blinkRate: number,
  spaceUsage: number
): { eyeAlerts: string[]; alerts: string[] } {
  const eyeAlerts = [
    direction === "down" ? "النظرة تميل للأسفل أكثر من المطلوب." : "",
    consistency < 60 ? "حركة الرأس أو العين غير مستقرة في بعض اللحظات." : "",
  ].filter(Boolean);

  const alerts = [
    ...eyeAlerts,
    ...(blinkRate > 28 ? ["معدل الرمش مرتفع وقد يشير إلى إجهاد أو توتر."] : []),
    ...(spaceUsage < 18 ? ["استخدام المساحة محدود ويحتاج إلى تنويع."] : []),
  ];

  return { eyeAlerts, alerts };
}

// ─── Main export ───

export function summarizeWebcamSamples(
  samples: WebcamFrameSample[],
  durationSeconds: number
): WebcamAnalysisResult {
  if (samples.length === 0) {
    return buildEmptySamplesResult();
  }

  const avgX = average(samples.map((s) => s.motionX));
  const avgY = average(samples.map((s) => s.motionY));
  const avgEnergy = average(samples.map((s) => s.movementEnergy));
  const avgCoverage = average(samples.map((s) => s.coverage));
  const avgBrightness = average(samples.map((s) => s.centerBrightness));

  const blinkCount = detectBlinkCount(samples);
  const blinkRate = Math.round(
    (blinkCount / Math.max(durationSeconds, 1)) * 60
  );

  const consistency = clamp(
    Math.round(
      100 -
        average(
          samples.map(
            (s) =>
              Math.abs(s.motionX - avgX) * 120 +
              Math.abs(s.motionY - avgY) * 120
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

  const { eyeAlerts, alerts } = buildAnalysisAlerts(
    direction,
    consistency,
    blinkRate,
    spaceUsage
  );

  const blockingSuggestions = buildBlockingSuggestions(spaceUsage, avgEnergy);

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
      suggestions: blockingSuggestions,
    },
    alerts,
    overallScore,
    timestamp: new Date().toISOString(),
  };
}

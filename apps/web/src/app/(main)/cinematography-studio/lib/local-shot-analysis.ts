/**
 * تحليل محلي احتياطي عند تعذر وصول خدمة التحليل الخلفية.
 *
 * هذا المسار لا يستبدل الخدمة الرسمية، لكنه يضمن استمرار التدفق
 * بوضع متدهور واضح مع نتيجة قابلة للاستخدام الفوري.
 */

import type {
  ShotAnalysis,
  VisualMood,
  FootageAnalysisSummary,
} from "../types";

interface LocalImageStats {
  meanLuma: number;
  varianceLuma: number;
}

function fallbackStats(): LocalImageStats {
  return {
    meanLuma: 0.5,
    varianceLuma: 0.08,
  };
}

async function estimateImageStats(file: File): Promise<LocalImageStats> {
  if (typeof window === "undefined") {
    return fallbackStats();
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("تعذر قراءة الصورة داخل محلل الطوارئ المحلي."));
    });

    const width = Math.min(320, image.naturalWidth || 320);
    const height = Math.min(320, image.naturalHeight || 180);

    if (width <= 0 || height <= 0) {
      return fallbackStats();
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      return fallbackStats();
    }

    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);

    let sum = 0;
    let sumSquares = 0;
    let samples = 0;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] || 0;
      const green = data[index + 1] || 0;
      const blue = data[index + 2] || 0;
      const luma = (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255;

      sum += luma;
      sumSquares += luma * luma;
      samples += 1;
    }

    if (samples === 0) {
      return fallbackStats();
    }

    const meanLuma = sum / samples;
    const varianceLuma = Math.max(
      0,
      sumSquares / samples - meanLuma * meanLuma
    );

    return { meanLuma, varianceLuma };
  } catch {
    return fallbackStats();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function computeMoodBias(mood: VisualMood): number {
  switch (mood) {
    case "noir":
      return -6;
    case "surreal":
      return 4;
    case "vintage":
      return -2;
    default:
      return 0;
  }
}

function scoreFromStats(stats: LocalImageStats, mood: VisualMood): number {
  const exposureBalance = 1 - Math.abs(stats.meanLuma - 0.5) * 1.8;
  const textureBalance = Math.min(1, stats.varianceLuma * 3.2 + 0.25);
  const raw = (exposureBalance * 0.65 + textureBalance * 0.35) * 100;
  const moodBias = computeMoodBias(mood);
  return Math.max(0, Math.min(100, Math.round(raw + moodBias)));
}

function exposureLabel(meanLuma: number): string {
  if (meanLuma < 0.3) {
    return "تعريض منخفض";
  }
  if (meanLuma > 0.72) {
    return "تعريض مرتفع";
  }
  return "تعريض متوازن";
}

function dynamicRangeLabel(variance: number): string {
  if (variance < 0.035) {
    return "تباين محدود";
  }
  if (variance > 0.14) {
    return "تباين واسع";
  }
  return "تباين متزن";
}

function grainLevelLabel(variance: number): string {
  if (variance > 0.16) {
    return "حِدّة مرتفعة";
  }
  if (variance < 0.04) {
    return "تفاصيل ناعمة";
  }
  return "تفاصيل متوازنة";
}

function buildSuggestions(stats: LocalImageStats, mood: VisualMood): string[] {
  const suggestions: string[] = [];

  if (stats.meanLuma < 0.3) {
    suggestions.push("ارفع التعريض نصف درجة لتفادي فقدان التفاصيل في الظلال.");
  } else if (stats.meanLuma > 0.72) {
    suggestions.push("خفّض الإضاءة الرئيسية أو استخدم ND لتجنب الحرق.");
  } else {
    suggestions.push("التعريض ضمن النطاق المقبول للمشهد الحالي.");
  }

  if (stats.varianceLuma < 0.04) {
    suggestions.push("أضف فصلًا ضوئيًا خفيفًا لرفع عمق المشهد.");
  } else if (stats.varianceLuma > 0.16) {
    suggestions.push("قلّل التباين القاسي للحفاظ على التفاصيل في الهايلايت.");
  } else {
    suggestions.push("التباين جيد ويمكن البناء عليه في التدرج النهائي.");
  }

  if (mood === "noir") {
    suggestions.push("المود النواري يستفيد من إضاءة جانبية مع ملء محدود.");
  }

  return suggestions;
}

export async function createLocalShotAnalysis(
  file: File,
  mood: VisualMood
): Promise<ShotAnalysis> {
  const stats = await estimateImageStats(file);
  const score = scoreFromStats(stats, mood);

  return {
    score,
    dynamicRange: dynamicRangeLabel(stats.varianceLuma),
    grainLevel: grainLevelLabel(stats.varianceLuma),
    exposure: Math.max(0, Math.min(100, Math.round(stats.meanLuma * 100))),
    issues: buildSuggestions(stats, mood),
  };
}

export async function createLocalFootageSummary(
  file: File,
  mood: VisualMood
): Promise<FootageAnalysisSummary> {
  const shot = await createLocalShotAnalysis(file, mood);
  return {
    score: shot.score,
    status: shot.score >= 75 ? "ready" : "review-needed",
    exposure: exposureLabel(shot.exposure / 100),
    colorBalance:
      mood === "vintage"
        ? "دفء متوازن"
        : mood === "noir"
          ? "بارد مزاجيًا"
          : "متزن",
    focus: shot.grainLevel,
    suggestions: shot.issues,
  };
}

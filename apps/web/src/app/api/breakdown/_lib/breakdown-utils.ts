import type { TimeOfDay } from "@/app/(main)/breakdown/domain/models";

/**
 * استرداد مفتاح Gemini API من متغيرات البيئة
 */
export function getGeminiApiKey(): string {
  return (
    process.env["GEMINI_API_KEY"] ??
    process.env["GOOGLE_GENAI_API_KEY"] ??
    process.env["API_KEY"] ??
    ""
  );
}

/**
 * التحقق من صحة مفتاح API
 */
export function isValidApiKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  return key.length > 20 && !/placeholder|change|xxx|demo/i.test(key);
}

/**
 * تحليل عنوان المشهد لاستخراج البيانات الوصفية
 */
export function parseSceneHeader(
  header: string,
  sceneNumber: number
): {
  sceneNumber: number;
  sceneType: "INT" | "EXT";
  location: string;
  timeOfDay: TimeOfDay;
  pageCount: number;
  storyDay: number;
  rawHeader: string;
} {
  const normalized = header.toUpperCase();

  // استخراج نوع المشهد (داخلي/خارجي)
  const typeMatch = /^(INT|EXT|INT\/EXT|I\/E)\b/i.exec(header);
  const rawType = typeMatch?.[1]?.toUpperCase() ?? "INT";
  const sceneType: "INT" | "EXT" = rawType.startsWith("EXT") ? "EXT" : "INT";

  // استخراج وقت المشهد
  const timeOfDayMap: Record<string, TimeOfDay> = {
    "- DAY": "DAY",
    "- NIGHT": "NIGHT",
    "- DAWN": "DAWN",
    "- DUSK": "DUSK",
    "- MORNING": "MORNING",
    "- EVENING": "EVENING",
    نهار: "DAY",
    ليل: "NIGHT",
    فجر: "DAWN",
    مساء: "EVENING",
    صباح: "MORNING",
    عصر: "DUSK",
    DAY: "DAY",
    NIGHT: "NIGHT",
    DAWN: "DAWN",
    DUSK: "DUSK",
    MORNING: "MORNING",
    EVENING: "EVENING",
  };

  let timeOfDay: TimeOfDay = "UNKNOWN";
  for (const [key, value] of Object.entries(timeOfDayMap)) {
    if (normalized.includes(key.toUpperCase())) {
      timeOfDay = value;
      break;
    }
  }

  // استخراج الموقع (النص بين نوع المشهد وشرطة الوقت)
  let location = header
    .replace(/^(?:INT|EXT|INT\/EXT|I\/E)\.?\s*/i, "")
    .replace(
      /\s*[-–—]\s*(DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|نهار|ليل|فجر|مساء|صباح|عصر)\s*$/i,
      ""
    )
    .replace(
      /\s*\|\s*(?:DAY|NIGHT|DAWN|DUSK|MORNING|EVENING|نهار|ليل|فجر|مساء|صباح|عصر)\s*$/i,
      ""
    )
    .replace(/[|]/g, " ")
    .trim();

  if (!location) {
    location = "موقع غير محدد";
  }

  return {
    sceneNumber,
    sceneType,
    location,
    timeOfDay,
    pageCount: 1,
    storyDay: 1,
    rawHeader: header,
  };
}

/**
 * استخراج JSON من نص استجابة Gemini
 */
export function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1]);
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error("لم يُعثر على كائن JSON صالح في استجابة Gemini");
}

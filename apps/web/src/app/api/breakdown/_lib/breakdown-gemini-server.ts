import { logger } from "@/lib/ai/utils/logger";

/**
 * تحليل السيناريو بالذكاء الاصطناعي — جانب الخادم
 *
 * يستخدم Gemini API مباشرة من طبقة Next.js API Routes
 * دون الحاجة إلى خلفية منفصلة أو مصادقة المستخدم.
 *
 * الطراز المستخدم: gemini-2.0-flash (سريع وعالي الجودة)
 */

import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";
import type {
  BreakdownElement,
  BreakdownReport,
  BreakdownReportScene,
  CastMember,
  ExtrasGroup,
  SceneBreakdown,
  SceneHeaderData,
  ScenarioAnalysis,
  ScenarioOption,
  SceneStats,
  ScriptSegmentScene,
  ShootingScheduleDay,
  ShootingScheduleItem,
  TimeOfDay,
} from "@/app/(main)/breakdown/domain/models";

/** اسم طراز Gemini المستخدم للتحليل */
const GEMINI_MODEL = "gemini-2.0-flash";

/** ألوان عناصر التفريغ حسب الفئة */
const ELEMENT_COLORS: Record<string, string> = {
  cast: "#3B82F6",
  extras: "#F97316",
  props: "#EAB308",
  handProps: "#CA8A04",
  setDressing: "#8B5CF6",
  costumes: "#A855F7",
  makeup: "#EC4899",
  sound: "#06B6D4",
  soundRequirements: "#0891B2",
  equipment: "#64748B",
  specialEquipment: "#475569",
  vehicles: "#EF4444",
  stunts: "#B91C1C",
  animals: "#92400E",
  spfx: "#C2410C",
  vfx: "#6366F1",
  graphics: "#0EA5E9",
  locations: "#16A34A",
  continuity: "#E11D48",
};

/** استرداد مفتاح Gemini API من متغيرات البيئة */
function getGeminiApiKey(): string {
  return (
    process.env["GEMINI_API_KEY"] ||
    process.env["GOOGLE_GENAI_API_KEY"] ||
    process.env["API_KEY"] ||
    ""
  );
}

/** التحقق من صحة مفتاح API */
function isValidApiKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  return key.length > 20 && !/placeholder|change|xxx|demo/i.test(key);
}

/** تحليل عنوان المشهد لاستخراج البيانات الوصفية */
function parseSceneHeader(
  header: string,
  sceneNumber: number
): SceneHeaderData {
  const normalized = header.toUpperCase();

  // استخراج نوع المشهد (داخلي/خارجي)
  const typeMatch = header.match(/^(INT|EXT|INT\/EXT|I\/E)\b/i);
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

/** بناء عناصر التفريغ من القوائم */
function buildElements(analysis: Record<string, string[]>): BreakdownElement[] {
  const elements: BreakdownElement[] = [];

  const categories: Array<[string, string, string]> = [
    ["cast", "Cast", "الممثلون"],
    ["extras", "Extras", "المجاميع"],
    ["props", "Props", "الإكسسوارات"],
    ["handProps", "Hand Props", "الإكسسوارات اليدوية"],
    ["setDressing", "Set Dressing", "فرش الديكور"],
    ["costumes", "Costumes", "الأزياء"],
    ["makeup", "Makeup", "المكياج"],
    ["sound", "Sound", "الصوت"],
    ["equipment", "Equipment", "المعدات"],
    ["vehicles", "Vehicles", "المركبات"],
    ["stunts", "Stunts", "المشاهد الخطرة"],
    ["animals", "Animals", "الحيوانات"],
    ["spfx", "SPFX", "المؤثرات الخاصة"],
    ["vfx", "VFX", "المؤثرات البصرية"],
    ["graphics", "Graphics", "الجرافيكس"],
    ["locations", "Locations", "المواقع"],
    ["continuity", "Continuity", "الراكور"],
  ];

  for (const [key, type, category] of categories) {
    const items = analysis[key] ?? [];
    for (const item of items) {
      elements.push({
        id: `${key}-${randomUUID().slice(0, 8)}`,
        type,
        category,
        description: item,
        color: ELEMENT_COLORS[key] ?? "#64748B",
      });
    }
  }

  return elements;
}

/** بناء إحصائيات المشهد من التحليل */
function buildStats(analysis: Record<string, unknown>): SceneStats {
  const countOf = (key: string): number => {
    const val = analysis[key];
    return Array.isArray(val) ? val.length : 0;
  };

  return {
    cast: countOf("cast"),
    extras: countOf("extras"),
    extrasGroups: countOf("extrasGroups"),
    silentBits: countOf("silentBits"),
    props: countOf("props"),
    handProps: countOf("handProps"),
    setDressing: countOf("setDressing"),
    costumes: countOf("costumes"),
    makeup: countOf("makeup"),
    sound: countOf("sound"),
    soundRequirements: countOf("soundRequirements"),
    equipment: countOf("equipment"),
    specialEquipment: countOf("specialEquipment"),
    vehicles: countOf("vehicles"),
    stunts: countOf("stunts"),
    animals: countOf("animals"),
    spfx: countOf("spfx"),
    vfx: countOf("vfx"),
    graphics: countOf("graphics"),
    continuity: countOf("continuity"),
  };
}

/** تحويل كائن AI الخام إلى SceneBreakdown منقَّح */
function normalizeSceneBreakdown(
  raw: Record<string, unknown>,
  headerData: SceneHeaderData
): SceneBreakdown {
  const toStrArray = (val: unknown): string[] => {
    if (!Array.isArray(val)) return [];
    return val.filter((v): v is string => typeof v === "string");
  };

  const toCastArray = (val: unknown): CastMember[] => {
    if (!Array.isArray(val)) return [];
    return val
      .filter((v) => v && typeof v === "object" && "name" in v)
      .map((v) => ({
        name: String((v as Record<string, unknown>)["name"] ?? ""),
        role: String((v as Record<string, unknown>)["role"] ?? "Bit Part"),
        age: String((v as Record<string, unknown>)["age"] ?? "Unknown"),
        gender: String((v as Record<string, unknown>)["gender"] ?? "Unknown"),
        description: String(
          (v as Record<string, unknown>)["description"] ?? ""
        ),
        motivation: String((v as Record<string, unknown>)["motivation"] ?? ""),
      }))
      .filter((m) => m.name);
  };

  const toExtrasGroups = (val: unknown): ExtrasGroup[] => {
    if (!Array.isArray(val)) return [];
    return val
      .filter((v) => v && typeof v === "object")
      .map((v) => ({
        description: String(
          (v as Record<string, unknown>)["description"] ?? ""
        ),
        count: Number((v as Record<string, unknown>)["count"] ?? 0),
      }))
      .filter((g) => g.description);
  };

  const analysisRecord: Record<string, string[]> = {
    cast: toCastArray(raw["cast"]).map((m) => m.name),
    extras: toStrArray(raw["extras"]),
    props: toStrArray(raw["props"]),
    handProps: toStrArray(raw["handProps"]),
    setDressing: toStrArray(raw["setDressing"]),
    costumes: toStrArray(raw["costumes"]),
    makeup: toStrArray(raw["makeup"]),
    sound: toStrArray(raw["sound"]),
    soundRequirements: toStrArray(raw["soundRequirements"]),
    equipment: toStrArray(raw["equipment"]),
    specialEquipment: toStrArray(raw["specialEquipment"]),
    vehicles: toStrArray(raw["vehicles"]),
    stunts: toStrArray(raw["stunts"]),
    animals: toStrArray(raw["animals"]),
    spfx: toStrArray(raw["spfx"]),
    vfx: toStrArray(raw["vfx"]),
    graphics: toStrArray(raw["graphics"]),
    locations: toStrArray(raw["locations"]),
    continuity: toStrArray(raw["continuity"]),
  };

  return {
    headerData,
    cast: toCastArray(raw["cast"]),
    costumes: toStrArray(raw["costumes"]),
    makeup: toStrArray(raw["makeup"]),
    setDressing: toStrArray(raw["setDressing"]),
    graphics: toStrArray(raw["graphics"]),
    sound: toStrArray(raw["sound"]),
    soundRequirements: toStrArray(raw["soundRequirements"]),
    equipment: toStrArray(raw["equipment"]),
    specialEquipment: toStrArray(raw["specialEquipment"]),
    vehicles: toStrArray(raw["vehicles"]),
    locations: toStrArray(raw["locations"]),
    extras: toStrArray(raw["extras"]),
    extrasGroups: toExtrasGroups(raw["extrasGroups"]),
    props: toStrArray(raw["props"]),
    handProps: toStrArray(raw["handProps"]),
    silentBits: toStrArray(raw["silentBits"]),
    stunts: toStrArray(raw["stunts"]),
    animals: toStrArray(raw["animals"]),
    spfx: toStrArray(raw["spfx"]),
    vfx: toStrArray(raw["vfx"]),
    continuity: toStrArray(raw["continuity"]),
    continuityNotes: toStrArray(raw["continuityNotes"]),
    elements: buildElements(analysisRecord),
    stats: buildStats(analysisRecord),
    warnings: toStrArray(raw["warnings"]),
    summary: String(raw["summary"] ?? ""),
    source: "ai",
  };
}

/** تحويل كائن سيناريوهات AI الخام إلى ScenarioAnalysis */
function normalizeScenarioAnalysis(raw: unknown): ScenarioAnalysis {
  if (!Array.isArray(raw)) {
    return { scenarios: [] };
  }

  const scenarios: ScenarioOption[] = raw
    .filter((s) => s && typeof s === "object")
    .map((s, index) => {
      const sr = s as Record<string, unknown>;
      const metrics = (sr["metrics"] as Record<string, unknown>) ?? {};
      const insights = (sr["agentInsights"] as Record<string, unknown>) ?? {};
      return {
        id: String(sr["id"] ?? `scenario-${index + 1}`),
        name: String(sr["name"] ?? `بديل ${index + 1}`),
        description: String(sr["description"] ?? ""),
        metrics: {
          budget: Math.min(100, Math.max(0, Number(metrics["budget"] ?? 50))),
          schedule: Math.min(
            100,
            Math.max(0, Number(metrics["schedule"] ?? 50))
          ),
          risk: Math.min(100, Math.max(0, Number(metrics["risk"] ?? 50))),
          creative: Math.min(
            100,
            Math.max(0, Number(metrics["creative"] ?? 50))
          ),
        },
        agentInsights: {
          logistics: String(insights["logistics"] ?? ""),
          budget: String(insights["budget"] ?? ""),
          schedule: String(insights["schedule"] ?? ""),
          creative: String(insights["creative"] ?? ""),
          risk: String(insights["risk"] ?? ""),
        },
        recommended: index === 0,
      };
    });

  return { scenarios };
}

/** استخراج JSON من نص استجابة Gemini */
function extractJsonFromText(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
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

/** تحليل مشهد واحد بالذكاء الاصطناعي */
async function analyzeSceneWithGemini(
  scene: ScriptSegmentScene,
  sceneNumber: number,
  client: GoogleGenAI
): Promise<{ analysis: SceneBreakdown; scenarios: ScenarioAnalysis }> {
  const headerData =
    scene.headerData ?? parseSceneHeader(scene.header, sceneNumber);

  const prompt = `
أنت مشرف تفكيك إنتاج سينمائي محترف.
حلل المشهد التالي وأعد كائن JSON فقط من دون أي نص إضافي.

أعد الحقول التالية:
- summary: ملخص قصير للمشهد
- warnings: تحذيرات إنتاجية مهمة
- cast: مصفوفة من كائنات تحتوي على name وrole وage وgender وdescription وmotivation
- costumes: قائمة ملابس
- makeup: قائمة مكياج وشعر
- setDressing: قائمة فرش ديكور
- graphics: قائمة جرافيكس وشاشات
- sound: قائمة متطلبات صوت
- soundRequirements: متطلبات صوتية إضافية
- equipment: معدات خاصة
- specialEquipment: معدات تقنية متخصصة
- vehicles: مركبات
- locations: مواقع تصوير محددة
- extras: كومبارس
- extrasGroups: مصفوفة من [{description, count}]
- props: إكسسوارات
- handProps: إكسسوارات يدوية
- silentBits: أجزاء صامتة
- stunts: مشاهد خطرة
- animals: حيوانات
- spfx: مؤثرات خاصة عملية
- vfx: مؤثرات بصرية رقمية
- continuity: عناصر الراكور
- continuityNotes: ملاحظات الراكور
- scenarios: ثلاثة بدائل إنتاجية، كل منها: {id, name, description, metrics:{budget,schedule,risk,creative}, agentInsights:{logistics,budget,schedule,creative,risk}}

القواعد:
- لا تكرر العنصر نفسه بصيغ مختلفة.
- ضع العناصر بالعربية إذا كان النص عربياً.
- إذا لم يوجد شيء في فئة ما أعد مصفوفة فارغة [].
- التزم بحدود المشهد فقط.
- الـ metrics يجب أن تكون أرقامًا بين 0 و100.

عنوان المشهد:
${scene.header}

محتوى المشهد:
${scene.content}
`.trim();

  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });

  const responseText = response.text ?? "{}";
  const rawResult = extractJsonFromText(responseText) as Record<
    string,
    unknown
  >;

  const analysis = normalizeSceneBreakdown(rawResult, headerData);
  const scenarios = normalizeScenarioAnalysis(rawResult["scenarios"]);

  return { analysis, scenarios };
}

/** تحليل احتياطي عندما لا يتوفر مفتاح API */
function buildFallbackAnalysis(
  scene: ScriptSegmentScene,
  sceneNumber: number
): { analysis: SceneBreakdown; scenarios: ScenarioAnalysis } {
  const headerData =
    scene.headerData ?? parseSceneHeader(scene.header, sceneNumber);
  const emptyStats: SceneStats = {
    cast: 0,
    extras: 0,
    extrasGroups: 0,
    silentBits: 0,
    props: 0,
    handProps: 0,
    setDressing: 0,
    costumes: 0,
    makeup: 0,
    sound: 0,
    soundRequirements: 0,
    equipment: 0,
    specialEquipment: 0,
    vehicles: 0,
    stunts: 0,
    animals: 0,
    spfx: 0,
    vfx: 0,
    graphics: 0,
    continuity: 0,
  };

  const analysis: SceneBreakdown = {
    headerData,
    cast: [],
    costumes: [],
    makeup: [],
    setDressing: [],
    graphics: [],
    sound: [],
    soundRequirements: [],
    equipment: [],
    specialEquipment: [],
    vehicles: [],
    locations: [headerData.location],
    extras: [],
    extrasGroups: [],
    props: [],
    handProps: [],
    silentBits: [],
    stunts: [],
    animals: [],
    spfx: [],
    vfx: [],
    continuity: [],
    continuityNotes: [],
    elements: [
      {
        id: `location-${sceneNumber}`,
        type: "Locations",
        category: "المواقع",
        description: headerData.location,
        color: ELEMENT_COLORS["locations"] ?? "#16A34A",
      },
    ],
    stats: { ...emptyStats, locations: 1 } as SceneStats,
    warnings: [
      "لم يتم تفعيل تحليل الذكاء الاصطناعي. تأكد من تعيين GEMINI_API_KEY في ملف .env.local",
    ],
    summary: `مشهد ${sceneNumber}: ${scene.header}`,
    source: "fallback",
  };

  const scenarios: ScenarioAnalysis = {
    scenarios: [
      {
        id: `scenario-${sceneNumber}-1`,
        name: "التصوير المباشر",
        description: "تصوير المشهد بالإعداد الحالي دون تعديلات",
        metrics: { budget: 50, schedule: 50, risk: 30, creative: 60 },
        agentInsights: {
          logistics: "إعداد قياسي",
          budget: "تكلفة عادية",
          schedule: "مدة معقولة",
          creative: "نهج مباشر",
          risk: "مخاطر منخفضة",
        },
        recommended: true,
      },
    ],
  };

  return { analysis, scenarios };
}

/** توليد جدول تصوير مبسط من قائمة المشاهد */
function buildShootingSchedule(
  scenes: BreakdownReportScene[]
): ShootingScheduleDay[] {
  const days: ShootingScheduleDay[] = [];
  let dayIndex = 1;

  // تجميع مشاهد الموقع نفسه معًا
  const locationGroups = new Map<string, BreakdownReportScene[]>();
  for (const scene of scenes) {
    const loc = scene.headerData.location;
    const existing = locationGroups.get(loc) ?? [];
    existing.push(scene);
    locationGroups.set(loc, existing);
  }

  for (const [location, locationScenes] of locationGroups) {
    const items: ShootingScheduleItem[] = locationScenes.map((s) => ({
      sceneId: s.sceneId,
      sceneNumber: s.headerData.sceneNumber,
      header: s.header,
      location: s.headerData.location,
      timeOfDay: s.headerData.timeOfDay,
      estimatedHours: 2 + s.headerData.pageCount,
      pageCount: s.headerData.pageCount,
    }));

    const totalHours = items.reduce((sum, i) => sum + i.estimatedHours, 0);
    const totalPages = items.reduce((sum, i) => sum + i.pageCount, 0);
    const timeOfDay = locationScenes[0]?.headerData.timeOfDay ?? "DAY";

    days.push({
      dayNumber: dayIndex++,
      location,
      timeOfDay,
      scenes: items,
      estimatedHours: totalHours,
      totalPages,
    });
  }

  return days;
}

/** بناء ملخص إجمالي للتقرير */
function buildReportSummary(scenes: BreakdownReportScene[]): string {
  const totalScenes = scenes.length;
  const locations = new Set(scenes.map((s) => s.headerData.location)).size;
  const totalCast = new Set(
    scenes.flatMap((s) => s.analysis.cast.map((c: CastMember) => c.name))
  ).size;

  return `تقرير تفريغ ${totalScenes} مشهد | ${locations} موقع تصوير | ${totalCast} شخصية`;
}

/** تجميع عناصر التفريغ حسب الفئة */
function buildElementsByCategory(
  scenes: BreakdownReportScene[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const scene of scenes) {
    for (const el of scene.analysis.elements) {
      counts[el.category] = (counts[el.category] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * تحليل كامل لمشاريع السيناريو بالذكاء الاصطناعي
 *
 * يُحلِّل كل مشهد باستخدام Gemini ويُعيد تقرير التفريغ الكامل.
 * إذا لم يتوفر مفتاح API، يستخدم التحليل الاحتياطي المحلي.
 */
export async function analyzeBreakdownLocally(
  projectId: string,
  title: string,
  scenes: ScriptSegmentScene[]
): Promise<BreakdownReport> {
  const apiKey = getGeminiApiKey();
  const useGemini = isValidApiKey(apiKey);

  if (!useGemini) {
    logger.warn(
      "[breakdown-gemini-server] GEMINI_API_KEY غير مُعيَّن أو غير صالح — سيُستخدم التحليل الاحتياطي."
    );
  }

  const client = useGemini ? new GoogleGenAI({ apiKey }) : null;
  const reportId = randomUUID();
  const now = new Date().toISOString();

  // تحليل المشاهد بالتوازي (5 مشاهد كحد أقصى في كل دفعة لتجنب تجاوز حدود API)
  const BATCH_SIZE = 5;
  const reportScenes: BreakdownReportScene[] = [];

  for (
    let batchStart = 0;
    batchStart < scenes.length;
    batchStart += BATCH_SIZE
  ) {
    const batch = scenes.slice(batchStart, batchStart + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (scene, batchIndex) => {
        const sceneNumber = batchStart + batchIndex + 1;
        const sceneId = scene.sceneId ?? randomUUID();

        try {
          const { analysis, scenarios } = client
            ? await analyzeSceneWithGemini(scene, sceneNumber, client)
            : buildFallbackAnalysis(scene, sceneNumber);

          const headerData =
            analysis.headerData ?? parseSceneHeader(scene.header, sceneNumber);

          const reportScene: BreakdownReportScene = {
            reportSceneId: randomUUID(),
            sceneId,
            header: scene.header,
            content: scene.content,
            headerData,
            analysis,
            scenarios,
          };

          return reportScene;
        } catch (err) {
          // تحليل احتياطي عند فشل Gemini لمشهد محدد
          logger.error(
            `[breakdown-gemini-server] فشل تحليل المشهد ${sceneNumber}:`,
            err instanceof Error ? err.message : String(err)
          );

          const { analysis, scenarios } = buildFallbackAnalysis(
            scene,
            sceneNumber
          );
          const headerData =
            analysis.headerData ?? parseSceneHeader(scene.header, sceneNumber);

          return {
            reportSceneId: randomUUID(),
            sceneId: scene.sceneId ?? randomUUID(),
            header: scene.header,
            content: scene.content,
            headerData,
            analysis: {
              ...analysis,
              warnings: [
                ...analysis.warnings,
                `فشل التحليل الآلي للمشهد ${sceneNumber}. تم استخدام القيم الافتراضية.`,
              ],
            },
            scenarios,
          } satisfies BreakdownReportScene;
        }
      })
    );

    reportScenes.push(...batchResults);
  }

  const schedule = buildShootingSchedule(reportScenes);
  const totalPages = reportScenes.reduce(
    (sum, s) => sum + s.headerData.pageCount,
    0
  );
  const allWarnings = reportScenes.flatMap((s) => s.analysis.warnings);

  const report: BreakdownReport = {
    id: reportId,
    projectId,
    title,
    generatedAt: now,
    updatedAt: now,
    source: "backend-breakdown",
    summary: buildReportSummary(reportScenes),
    warnings: [...new Set(allWarnings)],
    sceneCount: reportScenes.length,
    totalPages,
    totalEstimatedShootDays: schedule.length,
    elementsByCategory: buildElementsByCategory(reportScenes),
    schedule,
    scenes: reportScenes,
  };

  return report;
}

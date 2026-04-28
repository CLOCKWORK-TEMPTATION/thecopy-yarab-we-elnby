import { randomUUID } from "crypto";

import { GoogleGenAI } from "@google/genai";

import { logger } from "@/lib/ai/utils/logger";

import type {
  BreakdownReport,
  BreakdownReportScene,
  SceneBreakdown,
  SceneHeaderData,
  ScenarioAnalysis,
  ScriptSegmentScene,
} from "@/app/(main)/breakdown/domain/models";

import { GEMINI_MODEL } from "./breakdown-constants";
import {
  extractJsonFromText,
  getGeminiApiKey,
  isValidApiKey,
  parseSceneHeader,
} from "./breakdown-utils";
import { normalizeSceneBreakdown, normalizeScenarioAnalysis } from "./breakdown-normalizers";
import { buildElementsByCategory, buildReportSummary, buildShootingSchedule } from "./breakdown-builders";
import { buildFallbackAnalysis } from "./breakdown-fallback";

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

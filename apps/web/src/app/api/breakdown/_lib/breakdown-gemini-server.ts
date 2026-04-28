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
import {
  normalizeSceneBreakdown,
  normalizeScenarioAnalysis,
} from "./breakdown-normalizers";
import {
  buildElementsByCategory,
  buildReportSummary,
  buildShootingSchedule,
} from "./breakdown-builders";
import { buildFallbackAnalysis } from "./breakdown-fallback";

/**
 * تحليل مشهد واحد بالذكاء الاصطناعي
 */
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

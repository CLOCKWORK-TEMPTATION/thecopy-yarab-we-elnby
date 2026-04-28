
import { ELEMENT_COLORS } from "./breakdown-constants";
import { parseSceneHeader } from "./breakdown-utils";

import type {
  SceneBreakdown,
  ScenarioAnalysis,
  ScriptSegmentScene,
  SceneStats,
} from "@/app/(main)/breakdown/domain/models";

/**
 * تحليل احتياطي عندما لا يتوفر مفتاح API
 */
export function buildFallbackAnalysis(
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

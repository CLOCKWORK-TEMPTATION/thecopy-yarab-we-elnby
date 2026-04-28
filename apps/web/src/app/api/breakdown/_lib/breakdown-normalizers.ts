import { stringifyUnknown } from "@/lib/utils/unknown-values";

import { ELEMENT_COLORS } from "./breakdown-constants";

import type {
  BreakdownElement,
  CastMember,
  ExtrasGroup,
  SceneBreakdown,
  SceneHeaderData,
  ScenarioAnalysis,
  ScenarioOption,
  SceneStats,
} from "@/app/(main)/breakdown/domain/models";

/**
 * بناء عناصر التفريغ من القوائم
 */
export function buildElements(
  analysis: Record<string, string[]>
): BreakdownElement[] {
  const elements: BreakdownElement[] = [];

  const categories: [string, string, string][] = [
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
        id: `${key}-${crypto.randomUUID().slice(0, 8)}`,
        type,
        category,
        description: item,
        color: ELEMENT_COLORS[key] ?? "#64748B",
      });
    }
  }

  return elements;
}

/**
 * بناء إحصائيات المشهد من التحليل
 */
export function buildStats(analysis: Record<string, unknown>): SceneStats {
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

/**
 * تحويل كائن AI الخام إلى SceneBreakdown منقَّح
 */
export function normalizeSceneBreakdown(
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
      .map((v) => {
        const record = v as Record<string, unknown>;
        return {
          name: stringifyUnknown(record["name"]),
          role: stringifyUnknown(record["role"], "Bit Part"),
          age: stringifyUnknown(record["age"], "Unknown"),
          gender: stringifyUnknown(record["gender"], "Unknown"),
          description: stringifyUnknown(record["description"]),
          motivation: stringifyUnknown(record["motivation"]),
        };
      })
      .filter((m) => m.name);
  };

  const toExtrasGroups = (val: unknown): ExtrasGroup[] => {
    if (!Array.isArray(val)) return [];
    return val
      .filter((v) => v && typeof v === "object")
      .map((v) => ({
        description: stringifyUnknown(
          (v as Record<string, unknown>)["description"]
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
    summary: stringifyUnknown(raw["summary"]),
    source: "ai",
  };
}

/**
 * تحويل كائن سيناريوهات AI الخام إلى ScenarioAnalysis
 */
export function normalizeScenarioAnalysis(raw: unknown): ScenarioAnalysis {
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
        id: stringifyUnknown(sr["id"], `scenario-${index + 1}`),
        name: stringifyUnknown(sr["name"], `بديل ${index + 1}`),
        description: stringifyUnknown(sr["description"]),
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
          logistics: stringifyUnknown(insights["logistics"]),
          budget: stringifyUnknown(insights["budget"]),
          schedule: stringifyUnknown(insights["schedule"]),
          creative: stringifyUnknown(insights["creative"]),
          risk: stringifyUnknown(insights["risk"]),
        },
        recommended: index === 0,
      };
    });

  return { scenarios };
}

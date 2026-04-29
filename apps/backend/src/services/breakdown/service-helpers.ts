import {
  buildSceneStats,
  clampMetric,
  ELEMENT_COLORS,
  formatSceneHeader,
  generateId,
} from "./utils";

import type { AiBreakdownData } from "./service-schemas";
import type {
  BreakdownElement,
  BreakdownSceneAnalysis,
  CastMember,
  ExtrasGroup,
  ParsedScene,
  ScenarioAnalysis,
} from "./types";

export {
  aiBreakdownSchema,
  impactMetricsSchema,
  scenarioAnalysisSchema,
} from "./service-schemas";

const DEFAULT_BREAKDOWN_ELEMENT_COLOR = "#64748B";

function getElementColor(colorKey: keyof typeof ELEMENT_COLORS): string {
  return ELEMENT_COLORS[colorKey] ?? DEFAULT_BREAKDOWN_ELEMENT_COLOR;
}

export function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return JSON.parse(trimmed);
  }

  const fencedMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(trimmed);
  if (fencedMatch?.[1]) {
    return JSON.parse(fencedMatch[1]);
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");

  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error("لم يتم العثور على كائن JSON صالح");
}

export function requireValue<T>(
  value: T | null | undefined,
  message: string,
): T {
  if (value == null) {
    throw new Error(message);
  }

  return value;
}

function pushItems(input: {
  elements: BreakdownElement[];
  items: string[];
  type: string;
  category: string;
  color: string;
  notes?: string;
}): void {
  const { elements, items, type, category, color, notes } = input;
  items.forEach((item) => {
    elements.push({
      id: generateId(type.toLowerCase()),
      type,
      category,
      description: item,
      color,
      ...(notes ? { notes } : {}),
    });
  });
}

function pushCastElements(
  elements: BreakdownElement[],
  cast: CastMember[],
): void {
  cast.forEach((member) => {
    elements.push({
      id: generateId("cast"),
      type: "CAST",
      category: "الشخصيات",
      description: `${member.name} - ${member.role}`,
      color: getElementColor("CAST"),
      ...(member.description ? { notes: member.description } : {}),
    });
  });
}

function pushExtrasGroupElements(
  elements: BreakdownElement[],
  extrasGroups: ExtrasGroup[],
): void {
  extrasGroups.forEach((group) => {
    elements.push({
      id: generateId("extras_group"),
      type: "EXTRAS",
      category: "المجاميع",
      description: `${group.count} - ${group.description}`,
      color: getElementColor("EXTRAS"),
    });
  });
}

export function buildBreakdownElements(
  analysis: Omit<BreakdownSceneAnalysis, "elements" | "stats">,
): BreakdownElement[] {
  const elements: BreakdownElement[] = [];

  pushCastElements(elements, analysis.cast);
  pushExtrasGroupElements(elements, analysis.extrasGroups);
  const addItems = (
    items: string[],
    type: string,
    category: string,
    color: string,
  ): void => {
    pushItems({ elements, items, type, category, color });
  };

  addItems(analysis.silentBits, "CAST", "الصامتون", getElementColor("CAST"));
  addItems(analysis.props, "PROPS", "الإكسسوارات", getElementColor("PROPS"));
  addItems(
    analysis.handProps,
    "PROPS",
    "الهاند بروبس",
    getElementColor("PROPS"),
  );
  addItems(
    analysis.setDressing,
    "SET_DRESSING",
    "فرش الديكور",
    getElementColor("SET_DRESSING"),
  );
  addItems(
    analysis.costumes,
    "WARDROBE",
    "الأزياء",
    getElementColor("WARDROBE"),
  );
  addItems(analysis.makeup, "MAKEUP", "المكياج", getElementColor("MAKEUP"));
  addItems(analysis.sound, "SOUND", "الصوت", getElementColor("SOUND"));
  addItems(
    analysis.soundRequirements,
    "SOUND",
    "متطلبات الصوت",
    getElementColor("SOUND"),
  );
  addItems(
    analysis.equipment,
    "EQUIPMENT",
    "المعدات الخاصة",
    getElementColor("EQUIPMENT"),
  );
  addItems(
    analysis.specialEquipment,
    "EQUIPMENT",
    "تجهيزات خاصة",
    getElementColor("EQUIPMENT"),
  );
  addItems(
    analysis.vehicles,
    "VEHICLES",
    "المركبات",
    getElementColor("VEHICLES"),
  );
  addItems(
    analysis.animals,
    "ANIMALS",
    "الحيوانات",
    getElementColor("ANIMALS"),
  );
  addItems(
    analysis.stunts,
    "STUNTS",
    "المشاهد الخطرة",
    getElementColor("STUNTS"),
  );
  addItems(analysis.spfx, "SFX", "المؤثرات الخاصة", getElementColor("SFX"));
  addItems(analysis.vfx, "VFX", "المؤثرات البصرية", getElementColor("VFX"));
  addItems(
    analysis.graphics,
    "GRAPHICS",
    "الجرافيكس",
    getElementColor("GRAPHICS"),
  );
  addItems(
    analysis.continuity,
    "CONTINUITY",
    "الراكور",
    getElementColor("CONTINUITY"),
  );
  addItems(
    analysis.continuityNotes,
    "CONTINUITY",
    "ملاحظات الراكور",
    getElementColor("CONTINUITY"),
  );

  return elements;
}

function detectCharacters(content: string): CastMember[] {
  const lines = content.split(/\r?\n/);
  const names = uniqueStrings(
    lines
      .map((line) => line.trim())
      .filter((line) => /^.{1,40}\s*:\s*$/.test(line))
      .map((line) => line.replace(/\s*:\s*$/, "")),
  );

  return names.map((name, index) => ({
    name,
    role: index === 0 ? "Lead" : index < 3 ? "Supporting" : "Bit Part",
    age: "Unknown",
    gender: "Unknown",
    description: "",
    motivation: "",
  }));
}

function keywordMatches(content: string, keywords: string[]): string[] {
  const normalized = content.toLowerCase();
  return keywords.filter((keyword) =>
    normalized.includes(keyword.toLowerCase()),
  );
}

export function inferExtrasGroups(extras: string[]): ExtrasGroup[] {
  return extras.map((description) => {
    const countMatch = /(\d+)/.exec(description);
    return {
      description,
      count: countMatch ? Number(countMatch[1]) : 3,
    };
  });
}

export function buildFallbackScenarios(scene: ParsedScene): ScenarioAnalysis {
  const location = scene.headerData.location;
  return {
    scenarios: [
      {
        id: generateId("scenario"),
        name: "الخيار المحافظ",
        description: `تنفيذ المشهد في ${location} بأقل تعقيد إنتاجي ممكن مع تقليل المخاطر.`,
        metrics: { budget: 30, schedule: 35, risk: 20, creative: 55 },
        agentInsights: {
          logistics: "اعتماد الموقع كما هو وتقليل النقل بين الوحدات.",
          budget: "أقل تكلفة عبر تقليص الكومبارس والتجهيزات الخاصة.",
          schedule: "يسهل ضغط زمن التنفيذ في يوم تصوير واحد.",
          creative: "يحتفظ بالمعنى لكنه أقل طموحاً بصرياً.",
          risk: "مخاطر السلامة والطقس أقل من الخيارات الأخرى.",
        },
        recommended: true,
      },
      {
        id: generateId("scenario"),
        name: "الخيار المتوازن",
        description: `تنفيذ متوازن للمشهد يجمع بين الأثر الفني والانضباط اللوجستي في ${location}.`,
        metrics: { budget: 55, schedule: 50, risk: 40, creative: 75 },
        agentInsights: {
          logistics: "يحتاج تجهيزاً متوسطاً وتنسيقاً واضحاً بين الأقسام.",
          budget: "تكلفة متوسطة مقابل جودة بصرية أفضل.",
          schedule: "مناسب إذا كانت العناصر الخاصة متاحة في نفس اليوم.",
          creative: "يوفر مكاسب بصرية واضحة من دون تضخم كبير.",
          risk: "مخاطر قابلة للإدارة بشرط مراجعة الراكور والسلامة.",
        },
        recommended: false,
      },
      {
        id: generateId("scenario"),
        name: "الخيار الإبداعي العالي",
        description: `رفع قيمة المشهد بصرياً وإنتاجياً عبر استخدام كامل العناصر الخاصة في ${location}.`,
        metrics: { budget: 80, schedule: 75, risk: 65, creative: 95 },
        agentInsights: {
          logistics: "يتطلب تنسيقاً متقدماً بين الأقسام ومراجعة مسبقة للموقع.",
          budget: "الأعلى تكلفة بسبب العناصر الخاصة والكثافة التشغيلية.",
          schedule: "قد يحتاج وقت تصوير إضافياً أو بروفة منفصلة.",
          creative: "الأقوى من حيث الأثر البصري والإحساس الدرامي.",
          risk: "يرتفع معه خطر التأخير وتعارض الموارد إذا لم تضبط الخطة جيداً.",
        },
        recommended: false,
      },
    ],
  };
}

function buildFallbackKeywords(content: string) {
  return {
    soundKeywords: uniqueStrings(
      keywordMatches(content, [
        "شرطة",
        "siren",
        "radio",
        "هاتف",
        "موسيقى",
        "صوت",
        "صرخة",
      ]),
    ),
    propKeywords: uniqueStrings(
      keywordMatches(content, [
        "هاتف",
        "حقيبة",
        "مفك",
        "سلاح",
        "سكين",
        "مفتاح",
        "كوب",
      ]),
    ),
    setDressing: uniqueStrings(
      keywordMatches(content, [
        "أريكة",
        "طاولة",
        "نافذة",
        "كرسي",
        "غرفة",
        "مطبخ",
        "سرير",
      ]),
    ),
    vehicles: uniqueStrings(
      keywordMatches(content, [
        "سيارة",
        "دورية",
        "motorcycle",
        "truck",
        "boat",
      ]),
    ),
    animals: uniqueStrings(
      keywordMatches(content, ["كلب", "قطة", "حصان", "dog", "cat"]),
    ),
    stunts: uniqueStrings(
      keywordMatches(content, [
        "قتال",
        "هرب",
        "مطاردة",
        "سقط",
        "jump",
        "fight",
      ]),
    ),
    spfx: uniqueStrings(
      keywordMatches(content, [
        "مطر صناعي",
        "دخان",
        "نار",
        "rain rig",
        "smoke",
      ]),
    ),
    graphics: uniqueStrings(
      keywordMatches(content, ["شاشة", "هاتف", "monitor", "screen"]),
    ),
    continuity: uniqueStrings(
      keywordMatches(content, ["مكسور", "ملطخ", "wet", "bloody", "dirty"]),
    ),
  };
}

export function buildFallbackAnalysis(scene: ParsedScene): {
  analysis: BreakdownSceneAnalysis;
  scenarios: ScenarioAnalysis;
} {
  const content = scene.content;
  const header = scene.headerData;
  const cast = detectCharacters(content);
  const kw = buildFallbackKeywords(content);

  const warnings = [
    header.timeOfDay === "UNKNOWN" ? "وقت اليوم غير محسوم في رأس المشهد." : "",
    kw.continuity.length > 0
      ? "هناك عناصر راكور تحتاج متابعة بين المشاهد."
      : "",
  ].filter(Boolean);

  const baseAnalysis = {
    headerData: header,
    cast,
    costumes: [],
    makeup: [],
    setDressing: kw.setDressing,
    graphics: kw.graphics,
    sound: kw.soundKeywords,
    soundRequirements: kw.soundKeywords,
    equipment: [],
    specialEquipment: [],
    vehicles: kw.vehicles,
    locations: [header.location],
    extras: [],
    extrasGroups: [] as ExtrasGroup[],
    props: kw.propKeywords,
    handProps: kw.propKeywords,
    silentBits: [],
    stunts: kw.stunts,
    animals: kw.animals,
    spfx: kw.spfx,
    vfx: [],
    continuity: kw.continuity,
    continuityNotes: kw.continuity,
    warnings,
    summary: `تحليل احتياطي للمشهد ${header.sceneNumber} في ${header.location}.`,
    source: "fallback" as const,
  };

  const analysis: BreakdownSceneAnalysis = {
    ...baseAnalysis,
    elements: buildBreakdownElements(baseAnalysis),
    stats: buildSceneStats(baseAnalysis),
  };

  return {
    analysis,
    scenarios: buildFallbackScenarios(scene),
  };
}

function normalizeCastMembers(aiData: AiBreakdownData): CastMember[] {
  return aiData.cast.map((member) => ({
    ...member,
    role: member.role || "Bit Part",
    age: member.age || "Unknown",
    gender: member.gender || "Unknown",
    description: member.description || "",
    motivation: member.motivation || "",
  }));
}

export function normalizeAiAnalysis(
  parsedScene: ParsedScene,
  aiData: AiBreakdownData,
): {
  analysis: BreakdownSceneAnalysis;
  scenarios: ScenarioAnalysis;
} {
  const baseAnalysis = {
    headerData: parsedScene.headerData,
    cast: normalizeCastMembers(aiData),
    costumes: uniqueStrings(aiData.costumes),
    makeup: uniqueStrings(aiData.makeup),
    setDressing: uniqueStrings(aiData.setDressing),
    graphics: uniqueStrings(aiData.graphics),
    sound: uniqueStrings(aiData.sound),
    soundRequirements: uniqueStrings(aiData.soundRequirements),
    equipment: uniqueStrings(aiData.equipment),
    specialEquipment: uniqueStrings(aiData.specialEquipment),
    vehicles: uniqueStrings(aiData.vehicles),
    locations: uniqueStrings([
      parsedScene.headerData.location,
      ...aiData.locations,
    ]),
    extras: uniqueStrings(aiData.extras),
    extrasGroups:
      aiData.extrasGroups.length > 0
        ? aiData.extrasGroups.map((group) => ({
            description: group.description,
            count: Math.max(0, group.count),
          }))
        : inferExtrasGroups(aiData.extras),
    props: uniqueStrings(aiData.props),
    handProps: uniqueStrings(aiData.handProps),
    silentBits: uniqueStrings(aiData.silentBits),
    stunts: uniqueStrings(aiData.stunts),
    animals: uniqueStrings(aiData.animals),
    spfx: uniqueStrings(aiData.spfx),
    vfx: uniqueStrings(aiData.vfx),
    continuity: uniqueStrings(aiData.continuity),
    continuityNotes: uniqueStrings(aiData.continuityNotes),
    warnings: uniqueStrings(aiData.warnings),
    summary:
      aiData.summary || `تفكيك المشهد ${parsedScene.headerData.sceneNumber}`,
    source: "ai" as const,
  };

  const analysis: BreakdownSceneAnalysis = {
    ...baseAnalysis,
    elements: buildBreakdownElements(baseAnalysis),
    stats: buildSceneStats(baseAnalysis),
  };

  const scenarios: ScenarioAnalysis = {
    scenarios: aiData.scenarios.scenarios.map((scenario) => ({
      ...scenario,
      metrics: {
        budget: clampMetric(scenario.metrics.budget),
        schedule: clampMetric(scenario.metrics.schedule),
        risk: clampMetric(scenario.metrics.risk),
        creative: clampMetric(scenario.metrics.creative),
      },
    })),
  };

  return { analysis, scenarios };
}

export function buildAiPrompt(scene: ParsedScene): string {
  return `
أنت مشرف تفكيك إنتاج سينمائي محترف.
حلل المشهد التالي وأعد كائن JSON فقط من دون أي نص إضافي.

أعد الحقول التالية:
- summary
- warnings
- cast: مصفوفة من كائنات تحتوي على name و role و age و gender و description و motivation
- costumes
- makeup
- setDressing
- graphics
- sound
- soundRequirements
- equipment
- specialEquipment
- vehicles
- locations
- extras
- extrasGroups: مصفوفة من كائنات فيها description و count
- props
- handProps
- silentBits
- stunts
- animals
- spfx
- vfx
- continuity
- continuityNotes
- scenarios: ثلاثة بدائل إنتاجية تحتوي على metrics و agentInsights

القواعد:
- لا تكرر العنصر نفسه بصيغ مختلفة.
- ضع العناصر بالعربية إذا كان النص عربياً.
- إذا لم يوجد شيء في فئة ما أعد مصفوفة فارغة.
- التزم بحدود المشهد فقط.

بيانات رأس المشهد:
${formatSceneHeader(scene.headerData)}

محتوى المشهد:
${scene.content}
`;
}

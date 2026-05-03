import ExcelJS from "exceljs";

import type {
  BudgetAnalysis,
  BudgetDocument,
  BudgetLineItem,
  BudgetRuntimeMeta,
} from "../../../(main)/BUDGET/types";

interface BudgetFallbackInput {
  title?: string;
  scenario?: string;
}

interface BudgetCategoryDraft {
  code: string;
  name: string;
  items: BudgetLineItem[];
}

const DEFAULT_TITLE = "مشروع ميزانية إنتاج";
const DEFAULT_SCENARIO = "وصف إنتاجي مختصر";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function countMatches(text: string, pattern: RegExp): number {
  return Array.from(text.matchAll(pattern)).length;
}

function inferScenarioStats(scenario: string) {
  const normalized = scenario.trim() ? scenario : DEFAULT_SCENARIO;
  const explicitSceneCount = countMatches(
    normalized,
    /\bSCENE\b|مشهد|داخلي|خارجي/giu
  );
  const explicitLocationCount = countMatches(
    normalized,
    /شارع|موقع|قصر|منزل|سيارة|صحراء|مدينة|warehouse|highway|strip/giu
  );
  const sceneCount = clamp(
    explicitSceneCount > 0 ? explicitSceneCount : 1,
    1,
    30
  );
  const locationCount = clamp(
    explicitLocationCount > 0 ? explicitLocationCount : 1,
    1,
    12
  );
  const castSignals = countMatches(
    normalized,
    /بطل|بطلة|شخصية|ممثل|ممثلين|cast|jack|sarah/giu
  );
  const actionSignals = countMatches(
    normalized,
    /مطاردة|انفجار|سيارات|قتال|stunt|explosion|helicopter|gun/giu
  );
  const shootingDays = clamp(
    3 + sceneCount * 2 + locationCount + actionSignals * 2,
    5,
    45
  );

  return {
    actionSignals,
    castCount: clamp(2 + castSignals + actionSignals, 2, 25),
    locationCount,
    sceneCount,
    shootingDays,
  };
}

function lineItem(
  code: string,
  description: string,
  amount: number,
  unit: string,
  rate: number
): BudgetLineItem {
  const safeAmount = Math.max(0, Math.round(amount));
  const safeRate = Math.max(0, Math.round(rate));

  return {
    code,
    description,
    amount: safeAmount,
    unit,
    rate: safeRate,
    total: safeAmount * safeRate,
  };
}

function category(draft: BudgetCategoryDraft) {
  const total = draft.items.reduce((sum, item) => sum + item.total, 0);

  return {
    ...draft,
    total,
  };
}

function section(id: string, name: string, drafts: BudgetCategoryDraft[]) {
  const categories = drafts.map(category);
  const total = categories.reduce((sum, item) => sum + item.total, 0);

  return {
    id,
    name,
    categories,
    total,
  };
}

export function buildFallbackBudgetAnalysis(
  input: BudgetFallbackInput
): BudgetAnalysis {
  const scenario = readString(input.scenario, DEFAULT_SCENARIO);
  const stats = inferScenarioStats(scenario);

  return {
    summary: `تحليل محلي مبني على ${stats.sceneCount} مشهد و${stats.locationCount} موقع تقديري، مع ${stats.shootingDays} يوم تصوير مبدئي. تم استخدام وضع الاستمرارية المحلي لأن الخادم الخلفي غير متاح أثناء التشغيل.`,
    recommendations: [
      "قسّم أيام التصوير حسب المواقع لتقليل النقل وتجهيزات الإضاءة.",
      "اعتمد قائمة معدات متوسطة قبل رفع السعة إلى باقة سينمائية كاملة.",
      "خصص بند احتياطي واضح للمخاطر الإنتاجية قبل اعتماد الميزانية.",
      "راجع مشاهد الحركة والمؤثرات مبكرًا لأنها أكثر البنود تأثيرًا في التكلفة.",
    ],
    riskFactors: [
      stats.actionSignals > 0
        ? "توجد مؤشرات حركة أو انفجار؛ يلزم منسق حركات وتأمين إضافي."
        : "المخاطر الفنية منخفضة نسبيًا لكن يلزم تأكيد المواقع.",
      "غياب تفصيل عدد أفراد الطاقم قد يؤدي إلى تقدير أقل من الواقع.",
      "أي تصوير خارجي يحتاج هامشًا للطقس والتصاريح.",
    ],
    costOptimization: [
      "اجمع المواقع المتقاربة في أيام متتابعة.",
      "استخدم معدات مشتركة بين وحدات التصوير عند الإمكان.",
      "ابدأ بباقة ما بعد إنتاج أساسية ثم وسّعها حسب مخرجات التصوير.",
      "احتفظ بمخزون طوارئ منفصل بدل رفع كل بند على حدة.",
    ],
    shootingSchedule: {
      totalDays: stats.shootingDays,
      phases: {
        preProduction: clamp(Math.round(stats.shootingDays * 0.8), 5, 30),
        production: stats.shootingDays,
        postProduction: clamp(Math.round(stats.shootingDays * 1.4), 10, 75),
      },
    },
  };
}

export function buildFallbackBudgetDocument(
  input: BudgetFallbackInput
): BudgetDocument {
  const title = readString(input.title, DEFAULT_TITLE);
  const scenario = readString(input.scenario, DEFAULT_SCENARIO);
  const stats = inferScenarioStats(scenario);
  const crewDays = Math.max(1, stats.shootingDays);
  const actionMultiplier = stats.actionSignals > 0 ? 1.35 : 1;

  const sections = [
    section("above-the-line", "فوق الخط", [
      {
        code: "ATL-TALENT",
        name: "المواهب والإدارة الإبداعية",
        items: [
          lineItem("ATL-001", "إخراج وإشراف إبداعي", 1, "package", 18_000),
          lineItem(
            "ATL-002",
            "طاقم تمثيل رئيسي ومساند",
            stats.castCount,
            "person",
            Math.round(2_200 * actionMultiplier)
          ),
          lineItem("ATL-003", "إنتاج تنفيذي وتحضير", 1, "package", 9_500),
        ],
      },
    ]),
    section("production", "الإنتاج", [
      {
        code: "PROD-CREW",
        name: "الطاقم والتصوير",
        items: [
          lineItem("PROD-001", "طاقم تصوير أساسي", crewDays, "day", 3_600),
          lineItem("PROD-002", "معدات كاميرا وإضاءة", crewDays, "day", 2_450),
          lineItem(
            "PROD-003",
            "مواقع وتصاريح",
            stats.locationCount,
            "location",
            3_200
          ),
          lineItem(
            "PROD-004",
            "حركات ومؤثرات عملية",
            Math.max(1, stats.actionSignals),
            "sequence",
            stats.actionSignals > 0 ? 6_800 : 1_200
          ),
        ],
      },
      {
        code: "PROD-LOG",
        name: "اللوجستيات",
        items: [
          lineItem("LOG-001", "نقل وتجهيز مواقع", crewDays, "day", 950),
          lineItem("LOG-002", "إعاشة وتأمين", crewDays, "day", 720),
        ],
      },
    ]),
    section("post-production", "ما بعد الإنتاج", [
      {
        code: "POST-CORE",
        name: "المونتاج والتسليم",
        items: [
          lineItem("POST-001", "مونتاج صورة", Math.ceil(crewDays * 1.2), "day", 850),
          lineItem("POST-002", "تصحيح لون ومكساج صوت", 1, "package", 12_500),
          lineItem(
            "POST-003",
            "مؤثرات بصرية وتسليم",
            Math.max(1, stats.actionSignals),
            "batch",
            stats.actionSignals > 0 ? 4_500 : 1_500
          ),
        ],
      },
    ]),
  ];

  const subtotal = sections.reduce((sum, item) => sum + item.total, 0);
  const contingency = section("contingency", "احتياطي ومخاطر", [
    {
      code: "CONT-RISK",
      name: "احتياطي إنتاجي",
      items: [
        lineItem(
          "CONT-001",
          "احتياطي مخاطر وتغيرات",
          1,
          "reserve",
          Math.round(subtotal * 0.12)
        ),
      ],
    },
  ]);
  const allSections = [...sections, contingency];

  return {
    sections: allSections,
    grandTotal: allSections.reduce((sum, item) => sum + item.total, 0),
    currency: "USD",
    metadata: {
      title,
      genre: stats.actionSignals > 0 ? "حركة / دراما" : "دراما إنتاجية",
      locations: [`${stats.locationCount} مواقع تقديرية`],
      shootingDays: stats.shootingDays,
    },
  };
}

export function buildFallbackMeta(reason: string): BudgetRuntimeMeta {
  return {
    source: "fallback",
    generatedAt: new Date().toISOString(),
    fallbackReason: reason,
  };
}

export function readBudgetFallbackInput(payload: unknown): BudgetFallbackInput {
  const record =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  return {
    scenario: readString(record["scenario"]),
    title: readString(record["title"]),
  };
}

export async function buildBudgetWorkbookBuffer(
  budget: BudgetDocument
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "The Copy";
  workbook.created = new Date();

  const summary = workbook.addWorksheet("Summary");
  summary.columns = [
    { header: "Field", key: "field", width: 24 },
    { header: "Value", key: "value", width: 36 },
  ];
  summary.addRows([
    { field: "Title", value: budget.metadata?.title ?? DEFAULT_TITLE },
    { field: "Currency", value: budget.currency },
    { field: "Grand total", value: budget.grandTotal },
    { field: "Shooting days", value: budget.metadata?.shootingDays ?? "" },
  ]);

  const lines = workbook.addWorksheet("Budget Lines");
  lines.columns = [
    { header: "Section", key: "section", width: 24 },
    { header: "Category", key: "category", width: 24 },
    { header: "Code", key: "code", width: 16 },
    { header: "Description", key: "description", width: 36 },
    { header: "Amount", key: "amount", width: 12 },
    { header: "Unit", key: "unit", width: 16 },
    { header: "Rate", key: "rate", width: 14 },
    { header: "Total", key: "total", width: 14 },
    { header: "Notes", key: "notes", width: 36 },
  ];

  for (const budgetSection of budget.sections) {
    for (const budgetCategory of budgetSection.categories) {
      for (const item of budgetCategory.items) {
        lines.addRow({
          amount: item.amount,
          category: budgetCategory.name,
          code: item.code,
          description: item.description,
          notes: item.notes ?? "",
          rate: item.rate,
          section: budgetSection.name,
          total: item.total,
          unit: item.unit,
        });
      }
    }
  }

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

export function buildBudgetExportFilename(budget: BudgetDocument): string {
  const title = budget.metadata?.title?.trim() ?? "";
  const fallbackTitle = title.length > 0 ? title : "budget";
  const safeTitle = fallbackTitle.replace(/[^\p{L}\p{N}\-_ ]/gu, "").trim();
  return `${safeTitle.length > 0 ? safeTitle : "budget"}_budget.xlsx`;
}

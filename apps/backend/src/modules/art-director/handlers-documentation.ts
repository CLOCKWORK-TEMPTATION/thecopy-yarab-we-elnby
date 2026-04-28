import { randomUUID } from "node:crypto";

import {
  success,
  failure,
  asString,
  asNumber,
  asRecord,
  isRecord,
  slugify,
  buildProductionId,
  uniqueById,
  extractNestedRecord,
  summarizeBook,
  summarizeStyleGuide,
} from "./handlers-shared";
import { runPlugin } from "./plugin-executor";
import { AutomaticDocumentationGenerator } from "./plugins/documentation-generator";
import {
  readStore,
  updateStore,
  type StoredProductionBook,
  type StoredStyleGuide,
  type StoredDecision,
} from "./store";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";

function filterRecordArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function extractStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => asString(item)).filter(Boolean)
    : [];
}

export async function handleDocumentationState(): Promise<ArtDirectorHandlerResponse> {
  const store = await readStore();
  const lastBook = store.productionBooks.find((b) => b.id === store.lastBookId);
  const lastGuide = store.styleGuides.find(
    (g) => g.id === store.lastStyleGuideId,
  );

  return success({
    data: {
      productionBook: lastBook ? summarizeBook(lastBook) : null,
      styleGuide: lastGuide ? summarizeStyleGuide(lastGuide) : null,
      decisionsCount: store.decisions.length,
    },
  });
}

function buildBookSection(section: Record<string, unknown>) {
  return {
    id: asString(section["id"]) || randomUUID(),
    title: asString(section["title"]),
    titleAr: asString(section["titleAr"]) || asString(section["title"]),
    type: asString(section["type"]),
    content: asString(section["content"]),
    contentAr: asString(section["contentAr"]) || asString(section["content"]),
    images: extractStringArray(section["images"]),
    order: asNumber(section["order"]),
  };
}

function buildStoredBook(
  raw: Record<string, unknown>,
  name: string,
  nameAr: string,
  productionId: string,
): StoredProductionBook {
  const now = new Date().toISOString();
  return {
    id: asString(raw["id"]) || randomUUID(),
    title: asString(raw["title"]) || name,
    titleAr: asString(raw["titleAr"]) || nameAr || name,
    productionId,
    createdAt: asString(raw["createdAt"]) || now,
    updatedAt: asString(raw["updatedAt"]) || now,
    sections: filterRecordArray(raw["sections"]).map(buildBookSection),
    metadata: asRecord(raw["metadata"]),
  };
}

export async function handleDocumentationGenerate(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const projectNameAr = asString(payload["projectNameAr"]);
  const projectName = asString(payload["projectName"]) || projectNameAr;
  const director = asString(payload["director"]);
  const productionCompany = asString(payload["productionCompany"]);

  if (!projectName) {
    return failure("اسم المشروع مطلوب");
  }

  const productionId = buildProductionId(projectName);
  const result = await runPlugin(AutomaticDocumentationGenerator, {
    type: "generate-book",
    data: {
      productionId,
      title: projectName,
      titleAr: projectNameAr || projectName,
      includeSections: [
        "overview",
        "locations",
        "props",
        "schedule",
        "technical",
      ],
      projectData: {
        name: projectName,
        director,
        productionCompany,
        artDirector: "CineArchitect",
        status: "Ready for review",
      },
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر إنشاء كتاب الإنتاج");
  }

  const rawBook = extractNestedRecord(result, "book");
  if (!rawBook) {
    return failure("تعذر قراءة كتاب الإنتاج الناتج", 500);
  }

  const storedBook = buildStoredBook(
    rawBook,
    projectName,
    projectNameAr,
    productionId,
  );

  await updateStore((store) => {
    store.productionBooks = uniqueById<StoredProductionBook>(
      store.productionBooks,
      storedBook,
    );
    store.lastProductionId = productionId;
    store.lastBookId = storedBook.id;
  });

  return success({ data: summarizeBook(storedBook) });
}

function buildStoredStyleGuide(
  raw: Record<string, unknown>,
  productionId: string,
  name: string,
): StoredStyleGuide {
  return {
    id: asString(raw["id"]) || randomUUID(),
    productionId,
    title: asString(raw["title"]) || name,
    titleAr: asString(raw["titleAr"]) || name,
    colorPalettes: filterRecordArray(raw["colorPalettes"]),
    typography: asRecord(raw["typography"]),
    visualReferences: filterRecordArray(raw["visualReferences"]),
    moodDescriptions: filterRecordArray(raw["moodDescriptions"]),
    createdAt: asString(raw["createdAt"]) || new Date().toISOString(),
  };
}

const DEFAULT_COLOR_PALETTES = [
  {
    name: "Hero Palette",
    nameAr: "لوحة الهوية",
    colors: [
      { hex: "#2E3A59", name: "Midnight Blue", usage: "primary" },
      { hex: "#C58A4B", name: "Burnished Copper", usage: "accent" },
      { hex: "#F2E9DD", name: "Paper White", usage: "background" },
    ],
    mood: "cinematic",
  },
];

const DEFAULT_MOOD_DESCRIPTIONS = [
  {
    sceneName: "Default Workspace",
    mood: "focused",
    moodAr: "مركز",
    visualNotes: "Warm key art direction with structured contrast",
    visualNotesAr: "هوية دافئة مع تباين منضبط ووضوح بصري",
  },
];

export async function handleDocumentationStyleGuide(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const projectName = asString(payload["projectName"]) || "مشروع جديد";
  const productionId = buildProductionId(projectName);

  const result = await runPlugin(AutomaticDocumentationGenerator, {
    type: "generate-style-guide",
    data: {
      productionId,
      title: projectName,
      colorPalettes: DEFAULT_COLOR_PALETTES,
      moodDescriptions: DEFAULT_MOOD_DESCRIPTIONS,
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر إنشاء دليل الأسلوب");
  }

  const rawGuide = extractNestedRecord(result, "styleGuide");
  if (!rawGuide) {
    return failure("تعذر قراءة دليل الأسلوب الناتج", 500);
  }

  const storedGuide = buildStoredStyleGuide(
    rawGuide,
    productionId,
    projectName,
  );
  await updateStore((s) => {
    s.styleGuides = uniqueById<StoredStyleGuide>(s.styleGuides, storedGuide);
    s.lastProductionId = productionId;
    s.lastStyleGuideId = storedGuide.id;
  });

  return success({ data: summarizeStyleGuide(storedGuide) });
}

function buildStoredDecision(
  raw: Record<string, unknown>,
  title: string,
  productionId: string,
  payload: Record<string, unknown>,
): StoredDecision {
  const rationale = asString(payload["rationale"]);
  return {
    id: asString(raw["id"]) || randomUUID(),
    productionId,
    decision: title,
    decisionAr: title,
    rationale: asString(raw["rationale"]) || rationale,
    rationaleAr: asString(raw["rationaleAr"]) || rationale,
    madeBy: asString(raw["madeBy"]) || "Art Director",
    madeAt: asString(raw["madeAt"]) || new Date().toISOString(),
    category: asString(raw["category"]) || "creative",
    status: asString(raw["status"]) || "proposed",
    relatedDecisions: extractStringArray(raw["relatedDecisions"]),
  };
}

export async function handleDocumentationDecision(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const title = asString(payload["title"]);
  const description = asString(payload["description"]);

  if (!title || !description) {
    return failure("عنوان القرار ووصفه مطلوبان");
  }

  const productionId = buildProductionId(
    asString(payload["projectName"]) || "art-director-default",
  );
  const result = await runPlugin(AutomaticDocumentationGenerator, {
    type: "log-decision",
    data: {
      productionId,
      decision: title,
      decisionAr: title,
      rationale: asString(payload["rationale"]),
      rationaleAr: asString(payload["rationale"]),
      madeBy: "Art Director",
      category: asString(payload["category"]) || "creative",
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر توثيق القرار");
  }

  const rawDecision = extractNestedRecord(result, "decision");
  if (!rawDecision) {
    return failure("تعذر قراءة القرار الموثق", 500);
  }

  const storedDecision = buildStoredDecision(
    rawDecision,
    title,
    productionId,
    payload,
  );
  await updateStore((s) => {
    s.decisions = uniqueById<StoredDecision>(s.decisions, storedDecision);
    s.lastProductionId = productionId;
  });

  return success({ data: { decision: storedDecision } });
}

const VALID_FORMATS = new Set(["json", "markdown", "md"]);

function renderBookMarkdown(book: StoredProductionBook): string {
  const sorted = book.sections.sort((a, b) => a.order - b.order);
  const body = sorted.flatMap((s) => [
    `## ${s.titleAr}`,
    "",
    s.contentAr || s.content,
    "",
  ]);
  return [
    `# ${book.titleAr}`,
    "",
    `الاسم الإنجليزي: ${book.title}`,
    `تاريخ الإنشاء: ${book.createdAt}`,
    "",
    ...body,
  ].join("\n");
}

export async function handleDocumentationExport(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const format = asString(payload["format"]) || "markdown";
  const normalized = VALID_FORMATS.has(format) ? format : "markdown";
  const store = await readStore();
  const bookId = (asString(payload["bookId"]) || store.lastBookId) ?? "";
  const book = store.productionBooks.find((item) => item.id === bookId);

  if (!book) {
    return failure("لا يوجد كتاب إنتاج جاهز للتصدير");
  }

  const isJson = normalized === "json";
  const content = isJson
    ? JSON.stringify(book, null, 2)
    : renderBookMarkdown(book);

  return success({
    data: {
      content,
      filename: `${slugify(book.title || book.titleAr)}.${isJson ? "json" : "md"}`,
      mimeType: isJson
        ? "application/json;charset=utf-8"
        : "text/markdown;charset=utf-8",
      format: normalized,
    },
  });
}

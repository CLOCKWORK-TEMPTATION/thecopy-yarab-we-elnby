import type { PluginOutput } from "./types";

export interface ArtDirectorHandlerResponse {
  status: number;
  body: Record<string, unknown>;
}

export const DEFAULT_PRODUCTION_ID = "art-director-default";

export function success(
  data: Record<string, unknown> = {},
  status = 200
): ArtDirectorHandlerResponse {
  return {
    status,
    body: {
      success: true,
      ...data,
    },
  };
}

export function failure(
  error: string,
  status = 400,
  extra: Record<string, unknown> = {}
): ArtDirectorHandlerResponse {
  return {
    status,
    body: {
      success: false,
      error,
      ...extra,
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

export function asBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }

  return fallback;
}

export function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asString(item))
      .filter((item) => item.length > 0);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function slugify(value: string): string {
  let slug = "";
  let needsSeparator = false;

  for (const char of value.trim().toLowerCase()) {
    if (/^[a-z0-9\u0600-\u06FF]$/u.test(char)) {
      if (needsSeparator && slug.length > 0) {
        slug += "-";
      }
      slug += char;
      needsSeparator = false;
    } else if (slug.length > 0) {
      needsSeparator = true;
    }
  }

  return slug || DEFAULT_PRODUCTION_ID;
}

export function uniqueById<T extends { id?: string }>(
  items: T[],
  nextItem: T
): T[] {
  if (!nextItem.id) {
    return [...items, nextItem];
  }

  const nextItems = items.filter((item) => item.id !== nextItem.id);
  nextItems.push(nextItem);
  return nextItems;
}

export function extractNestedRecord(
  result: PluginOutput,
  key: string
): Record<string, unknown> | null {
  const data = asRecord(result.data);
  const nested = data[key];
  return isRecord(nested) ? nested : null;
}

export function mapLocationType(type: string): string {
  const normalized = type.toLowerCase();
  if (normalized === "natural") return "outdoor";
  return normalized || "interior";
}

export function mapLocationTypeLabel(type: string): string {
  const LABEL_MAP: Record<string, string> = {
    outdoor: "خارجي",
    studio: "استوديو",
    exterior: "خارجي",
  };
  const normalized = mapLocationType(type);
  return LABEL_MAP[normalized] ?? "داخلي";
}

export function parseDimensions(value: unknown): {
  width: number;
  height: number;
  depth: number;
} {
  const raw = asString(value);
  const matches = raw.match(/(\d+(?:\.\d+)?)/g) ?? [];
  const [width = "1", height = "1", depth = "1"] = matches;

  return {
    width: Number(width),
    height: Number(height),
    depth: Number(depth),
  };
}

const SET_CATEGORY_MAP: [string[], string][] = [
  [["أثاث", "furniture"], "furniture"],
  [["إكسسوارات", "prop"], "prop"],
  [["إضاءة", "lighting"], "lighting-rig"],
  [["هياكل", "structure"], "structure"],
  [["أرض", "floor"], "floor"],
  [["خلف", "backdrop"], "backdrop"],
];

export function mapSetCategory(value: string): string {
  const normalized = value.toLowerCase();
  for (const [keywords, category] of SET_CATEGORY_MAP) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return category;
    }
  }
  return "furniture";
}

const SET_VALUE_BASELINES: Record<string, number> = {
  "lighting-rig": 750,
  structure: 1200,
  backdrop: 600,
};

export function estimateSetValue(
  category: string,
  dimensions: { width: number; height: number; depth: number }
): number {
  const volume = Math.max(
    dimensions.width * dimensions.height * dimensions.depth,
    1
  );
  const baseline = SET_VALUE_BASELINES[category] ?? 450;
  return Math.round(baseline + volume * 12);
}

const MOOD_LABELS: Record<string, string> = {
  romantic: "رومانسي",
  dramatic: "درامي",
  mysterious: "غامض",
  cheerful: "مرح",
  melancholic: "حزين",
  tense: "متوتر",
  dark: "داكن",
  neutral: "محايد",
};

export function buildMoodThemeLabel(mood: string): string {
  return MOOD_LABELS[mood] || "محايد";
}

export function buildProductionId(name: string): string {
  return slugify(name || DEFAULT_PRODUCTION_ID);
}

export function summarizeBook(
  book: Record<string, unknown>
): Record<string, unknown> {
  const sections = Array.isArray(book["sections"])
    ? book["sections"]
        .filter(isRecord)
        .map((section) => asString(section["titleAr"]))
    : [];

  return {
    id: asString(book["id"]),
    title: asString(book["title"]),
    titleAr: asString(book["titleAr"]),
    sections,
    createdAt: asString(book["createdAt"]),
  };
}

export function summarizeStyleGuide(
  guide: Record<string, unknown>
): Record<string, unknown> {
  const colorPalettes = Array.isArray(guide["colorPalettes"])
    ? guide["colorPalettes"].filter(isRecord)
    : [];
  const paletteNames = colorPalettes
    .map(
      (palette) => asString(palette["nameAr"]) || asString(palette["name"])
    )
    .filter(Boolean);

  const typography = asRecord(guide["typography"]);
  const typographyValues = [
    asString(typography["primaryFont"]),
    asString(typography["secondaryFont"]),
  ].filter(Boolean);

  return {
    id: asString(guide["id"]),
    name: asString(guide["title"]),
    nameAr: asString(guide["titleAr"]) || asString(guide["title"]),
    elements: [...paletteNames, ...typographyValues],
  };
}

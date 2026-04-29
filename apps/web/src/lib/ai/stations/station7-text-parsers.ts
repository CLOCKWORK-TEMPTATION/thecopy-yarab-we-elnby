/**
 * @fileoverview Text extraction and parsing helpers for Station 7.
 * Extracted from station7-finalization.ts to keep each file ≤ 500 lines.
 */

import { asRecord } from "./station7-score-utils";

import type { AudienceResonance, RewritingSuggestion } from "./station7-types";

// ---------------------------------------------------------------------------
// Generic text extraction
// ---------------------------------------------------------------------------

function extractFromRecord(record: Record<string, unknown>): string | null {
  if (typeof record["raw"] === "string") return record["raw"];
  if (typeof record["text"] === "string") return record["text"];
  if (typeof record["report"] === "string") return record["report"];
  return null;
}

function extractPrimitive(content: unknown): string | null {
  if (content === null || content === undefined) return "";
  if (typeof content === "number" || typeof content === "boolean")
    return String(content);
  return null;
}

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;

  const record = asRecord(content);
  if (record) {
    const fromRecord = extractFromRecord(record);
    if (fromRecord !== null) return fromRecord;
    return extractPrimitive(content) ?? "";
  }

  return extractPrimitive(content) ?? "";
}

// ---------------------------------------------------------------------------
// SWOT text parser
// ---------------------------------------------------------------------------

function detectSection<TSection extends string>(
  trimmed: string,
  sections: Record<string, TSection>
): TSection | null {
  for (const [arabicName, englishKey] of Object.entries(sections)) {
    if (trimmed.includes(arabicName)) {
      return englishKey;
    }
  }
  return null;
}

export function parseStructuredText(text: string): {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
} {
  const result = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    opportunities: [] as string[],
    threats: [] as string[],
  };

  const sections: Record<string, keyof typeof result> = {
    "نقاط القوة": "strengths",
    "نقاط الضعف": "weaknesses",
    الفرص: "opportunities",
    التهديدات: "threats",
  };

  let currentSection: keyof typeof result | null = null;
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    const detectedSection = detectSection(trimmed, sections);
    if (detectedSection) {
      currentSection = detectedSection;
    } else if (currentSection && trimmed.startsWith("-")) {
      const item = trimmed.substring(1).trim();
      if (item) result[currentSection].push(item);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Audience resonance parser
// ---------------------------------------------------------------------------

const AUDIENCE_SCORE_FIELDS = [
  ["التأثير العاطفي", "emotionalImpact"],
  ["التفاعل الفكري", "intellectualEngagement"],
  ["القابلية للارتباط", "relatability"],
  ["قابلية التذكر", "memorability"],
  ["الإمكانات الفيروسية", "viralPotential"],
] as const;

const AUDIENCE_SECTIONS = [
  ["الاستجابة الأولية", "primary"],
  ["الاستجابات الثانوية", "secondary"],
  ["العناصر المثيرة للجدل", "controversial"],
] as const;

const parseFirstNumber = (value: string): number | undefined => {
  const match = /(\d+)/.exec(value);
  return match?.[1] ? parseInt(match[1]) : undefined;
};

const applyAudienceScoreField = (
  trimmed: string,
  result: Partial<AudienceResonance>
): boolean => {
  const metric = AUDIENCE_SCORE_FIELDS.find(([label]) =>
    trimmed.includes(label)
  );
  const score = metric ? parseFirstNumber(trimmed) : undefined;
  if (!metric || score === undefined) return false;

  result[metric[1]] = score;
  return true;
};

const readAudienceSection = (trimmed: string): string | undefined =>
  AUDIENCE_SECTIONS.find(([label]) => trimmed.includes(label))?.[1];

const appendAudienceBullet = (
  section: string,
  item: string,
  result: Partial<AudienceResonance>
): void => {
  if (section === "secondary") result.secondaryResponses?.push(item);
  else if (section === "controversial")
    result.controversialElements?.push(item);
  else if (section === "primary") result.primaryResponse = item;
};

export function parseAudienceResonance(
  text: string
): Partial<AudienceResonance> {
  const result: Partial<AudienceResonance> = {
    secondaryResponses: [],
    controversialElements: [],
  };

  const lines = text.split("\n");
  let currentSection = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (applyAudienceScoreField(trimmed, result)) {
      continue;
    }

    const nextSection = readAudienceSection(trimmed);
    if (nextSection) {
      currentSection = nextSection;
    } else if (trimmed.startsWith("-")) {
      const item = trimmed.substring(1).trim();
      if (item) appendAudienceBullet(currentSection, item, result);
    } else if (
      currentSection === "primary" &&
      trimmed &&
      !trimmed.includes(":")
    ) {
      result.primaryResponse = trimmed;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Rewriting suggestions parser
// ---------------------------------------------------------------------------

const REWRITING_TEXT_FIELDS = [
  ["الموقع:", "location"],
  ["المشكلة الحالية:", "currentIssue"],
  ["الاقتراح:", "suggestedRewrite"],
  ["التبرير:", "reasoning"],
] as const;

const readAfterLabel = (line: string, label: string): string | undefined => {
  const value = line.split(label)[1]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
};

const readSuggestionPriority = (
  line: string
): RewritingSuggestion["priority"] => {
  const priority = readAfterLabel(line, "الأولوية:")?.toLowerCase();
  if (priority?.includes("must")) return "must";
  if (priority?.includes("should")) return "should";
  return "could";
};

const applyRewritingSuggestionLine = (
  line: string,
  suggestion: Partial<RewritingSuggestion>
): void => {
  const textField = REWRITING_TEXT_FIELDS.find(([label]) =>
    line.includes(label)
  );
  if (textField) {
    const value = readAfterLabel(line, textField[0]);
    if (value) suggestion[textField[1]] = value;
    return;
  }

  if (line.includes("التأثير:")) {
    const impact = parseFirstNumber(line);
    if (impact !== undefined) suggestion.impact = impact;
  } else if (line.includes("الأولوية:")) {
    suggestion.priority = readSuggestionPriority(line);
  }
};

function parseSuggestionBlock(block: string): RewritingSuggestion | null {
  const lines = block
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);
  const suggestion: Partial<RewritingSuggestion> = {};

  for (const line of lines) {
    applyRewritingSuggestionLine(line, suggestion);
  }

  if (
    suggestion.location &&
    suggestion.currentIssue &&
    suggestion.suggestedRewrite
  ) {
    return suggestion as RewritingSuggestion;
  }
  return null;
}

export function parseRewritingSuggestions(text: string): RewritingSuggestion[] {
  const blocks = text.split("---").filter((b) => b.trim());
  return blocks
    .map(parseSuggestionBlock)
    .filter((s): s is RewritingSuggestion => s !== null);
}

/**
 * @fileoverview Text extraction and parsing helpers for Station 7.
 * Extracted from station7-finalization.ts to keep each file ≤ 500 lines.
 */

import { asRecord } from "./station7-score-utils";
import type { AudienceResonance, RewritingSuggestion } from "./station7-types";

// ---------------------------------------------------------------------------
// Generic text extraction
// ---------------------------------------------------------------------------

export function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  const record = asRecord(content);
  if (record) {
    if (typeof record["raw"] === "string") return record["raw"];
    if (typeof record["text"] === "string") return record["text"];
    if (typeof record["report"] === "string") return record["report"];
    if (content === null || content === undefined) return "";
    if (typeof content === "number" || typeof content === "boolean")
      return String(content);
    return "";
  }
  if (content === null || content === undefined) return "";
  if (typeof content === "number" || typeof content === "boolean")
    return String(content);
  return "";
}

// ---------------------------------------------------------------------------
// SWOT text parser
// ---------------------------------------------------------------------------

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
    for (const [arabicName, englishKey] of Object.entries(sections)) {
      if (trimmed.includes(arabicName)) {
        currentSection = englishKey;
        break;
      }
    }
    if (currentSection && trimmed.startsWith("-")) {
      const item = trimmed.substring(1).trim();
      if (item) result[currentSection].push(item);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Audience resonance parser
// ---------------------------------------------------------------------------

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

    if (trimmed.includes("التأثير العاطفي")) {
      const match = /(\d+)/.exec(trimmed);
      if (match?.[1]) result.emotionalImpact = parseInt(match[1]);
    } else if (trimmed.includes("التفاعل الفكري")) {
      const match = /(\d+)/.exec(trimmed);
      if (match?.[1]) result.intellectualEngagement = parseInt(match[1]);
    } else if (trimmed.includes("القابلية للارتباط")) {
      const match = /(\d+)/.exec(trimmed);
      if (match?.[1]) result.relatability = parseInt(match[1]);
    } else if (trimmed.includes("قابلية التذكر")) {
      const match = /(\d+)/.exec(trimmed);
      if (match?.[1]) result.memorability = parseInt(match[1]);
    } else if (trimmed.includes("الإمكانات الفيروسية")) {
      const match = /(\d+)/.exec(trimmed);
      if (match?.[1]) result.viralPotential = parseInt(match[1]);
    } else if (trimmed.includes("الاستجابة الأولية")) {
      currentSection = "primary";
    } else if (trimmed.includes("الاستجابات الثانوية")) {
      currentSection = "secondary";
    } else if (trimmed.includes("العناصر المثيرة للجدل")) {
      currentSection = "controversial";
    } else if (trimmed.startsWith("-")) {
      const item = trimmed.substring(1).trim();
      if (currentSection === "secondary" && item)
        result.secondaryResponses!.push(item);
      else if (currentSection === "controversial" && item)
        result.controversialElements!.push(item);
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

export function parseRewritingSuggestions(text: string): RewritingSuggestion[] {
  const suggestions: RewritingSuggestion[] = [];
  const blocks = text.split("---").filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);
    const suggestion: Partial<RewritingSuggestion> = {};

    for (const line of lines) {
      if (line.includes("الموقع:")) {
        const location = line.split("الموقع:")[1]?.trim();
        if (location) suggestion.location = location;
      } else if (line.includes("المشكلة الحالية:")) {
        const currentIssue = line.split("المشكلة الحالية:")[1]?.trim();
        if (currentIssue) suggestion.currentIssue = currentIssue;
      } else if (line.includes("الاقتراح:")) {
        const suggestedRewrite = line.split("الاقتراح:")[1]?.trim();
        if (suggestedRewrite) suggestion.suggestedRewrite = suggestedRewrite;
      } else if (line.includes("التبرير:")) {
        const reasoning = line.split("التبرير:")[1]?.trim();
        if (reasoning) suggestion.reasoning = reasoning;
      } else if (line.includes("التأثير:")) {
        const match = /(\d+)/.exec(line);
        if (match?.[1]) suggestion.impact = parseInt(match[1]);
      } else if (line.includes("الأولوية:")) {
        const priority = line.split("الأولوية:")[1]?.trim().toLowerCase();
        if (priority?.includes("must")) suggestion.priority = "must";
        else if (priority?.includes("should")) suggestion.priority = "should";
        else suggestion.priority = "could";
      }
    }

    if (
      suggestion.location &&
      suggestion.currentIssue &&
      suggestion.suggestedRewrite
    ) {
      suggestions.push(suggestion as RewritingSuggestion);
    }
  }

  return suggestions;
}

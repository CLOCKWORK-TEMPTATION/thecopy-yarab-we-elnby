import { ARABIC_STOP_WORDS, GENRE_RULES, THEME_RULES } from "./constants";
import type { TextChunk } from "./types";

export function normalizeWhitespace(text: string): string {
  return text.replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function splitSentences(text: string): string[] {
  return text
    .split(/[.!?؟]+/g)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

export function tokenizeArabic(text: string): string[] {
  return (text.match(/[\u0600-\u06FF]{3,}/g) ?? [])
    .map((token) => token.trim())
    .filter((token) => !ARABIC_STOP_WORDS.has(token));
}

export function extractCharacterCandidates(text: string): string[] {
  const explicitNames = new Set<string>();

  for (const match of text.matchAll(
    /(?:^|\n)\s*([\u0600-\u06FF]{3,}(?:\s+[\u0600-\u06FF]{3,}){0,2})\s*:/gm
  )) {
    const candidate = match[1]?.trim();
    if (candidate) {
      explicitNames.add(candidate);
    }
  }

  for (const match of text.matchAll(
    /(?:قال|رد|سأل|أجاب|صرخ|همس)\s+([\u0600-\u06FF]{3,}(?:\s+[\u0600-\u06FF]{3,}){0,1})/gm
  )) {
    const candidate = match[1]?.trim();
    if (candidate) {
      explicitNames.add(candidate);
    }
  }

  const tokens = tokenizeArabic(text);
  const frequencies = new Map<string, number>();
  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  const frequentTokens = [...frequencies.entries()]
    .filter(([, count]) => count >= 3)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8)
    .map(([token]) => token);

  return [...new Set([...explicitNames, ...frequentTokens])].slice(0, 8);
}

export function detectThemes(text: string): string[] {
  const foundThemes = THEME_RULES.filter((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  ).map((rule) => rule.theme);

  if (foundThemes.length > 0) {
    return foundThemes.slice(0, 4);
  }

  return ["الصراع", "التحول", "العلاقات الإنسانية"];
}

export function detectGenre(text: string): string {
  const matched = GENRE_RULES.find((rule) =>
    rule.keywords.some((keyword) => text.includes(keyword))
  );

  return matched?.genre ?? "دراما معاصرة";
}

export function detectTone(text: string): string {
  if (/(خوف|رعب|تهديد|ظلام|قلق)/.test(text)) {
    return "متوتر ومشحون";
  }

  if (/(حب|حنين|شوق|اشتياق)/.test(text)) {
    return "عاطفي وحميم";
  }

  if (/(جريمة|قتل|تحقيق|مطاردة)/.test(text)) {
    return "حاد وحافل بالمخاطر";
  }

  return "درامي متوازن";
}

export function summarizeText(text: string, maxSentences: number): string {
  const normalized = normalizeWhitespace(text);
  const sentences = splitSentences(normalized);

  if (sentences.length === 0) {
    return normalized.slice(0, 280);
  }

  return sentences.slice(0, maxSentences).join("، ");
}

export function buildChunks(text: string, chunkSize: number): TextChunk[] {
  const chunks: TextChunk[] = [];

  if (text.length <= chunkSize) {
    return [
      {
        id: "chunk-1",
        content: text,
        startIndex: 0,
        endIndex: text.length,
      },
    ];
  }

  const paragraphs = splitParagraphs(text);
  let currentChunk = "";
  let chunkStart = 0;
  let cursor = 0;

  for (const paragraph of paragraphs) {
    const candidate = currentChunk
      ? `${currentChunk}\n\n${paragraph}`
      : paragraph;
    if (candidate.length > chunkSize && currentChunk) {
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        content: currentChunk,
        startIndex: chunkStart,
        endIndex: chunkStart + currentChunk.length,
      });
      chunkStart = cursor;
      currentChunk = paragraph;
    } else {
      currentChunk = candidate;
    }
    cursor += paragraph.length + 2;
  }

  if (currentChunk) {
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      content: currentChunk,
      startIndex: chunkStart,
      endIndex: chunkStart + currentChunk.length,
    });
  }

  return chunks;
}

import { clamp } from "./seven-stations-fallback/score-utils";
import { serializeAnalysisValue } from "./seven-stations-fallback/serialize";
import { buildStationOutputs } from "./seven-stations-fallback/station-builders";
import {
  buildChunks,
  detectGenre,
  detectThemes,
  detectTone,
  extractCharacterCandidates,
  normalizeWhitespace,
  splitParagraphs,
  splitSentences,
  summarizeText,
} from "./seven-stations-fallback/text-analysis";

import type {
  AnalysisPipelinePayload,
  FallbackInput,
} from "./seven-stations-fallback/types";

export type { AnalysisPipelinePayload } from "./seven-stations-fallback/types";
export { serializeAnalysisValue };

export function buildFallbackSevenStationsResult(
  input: FallbackInput
): AnalysisPipelinePayload {
  const startedAt = Date.now();
  const normalizedText = normalizeWhitespace(input.fullText);
  const paragraphs = splitParagraphs(input.fullText);
  const sentences = splitSentences(input.fullText);
  const characters = extractCharacterCandidates(normalizedText);
  const themes = detectThemes(normalizedText);
  const genre = detectGenre(normalizedText);
  const tone = detectTone(normalizedText);
  const chunks = buildChunks(input.fullText, 1800);

  const dialogueMatches = input.fullText.match(/[:«»"“”]+/g) ?? [];
  const dialogueRatio = clamp(
    Math.round((dialogueMatches.length / Math.max(sentences.length, 1)) * 20),
    15,
    75
  );
  const baseScore = clamp(
    Math.round(
      52 +
        Math.min(paragraphs.length, 12) * 2 +
        Math.min(characters.length, 6) * 3 +
        Math.min(themes.length, 4) * 4
    ),
    45,
    88
  );
  const efficiencyScore = clamp(
    baseScore + Math.round(dialogueRatio * 0.12),
    45,
    92
  );
  const healthScore = clamp(
    efficiencyScore -
      (characters.length < 2 ? 8 : 0) -
      (paragraphs.length < 3 ? 6 : 0),
    35,
    90
  );
  const overallScore = clamp(
    Math.round((efficiencyScore + healthScore) / 2 + 4),
    40,
    92
  );
  const summary = summarizeText(normalizedText, 3);
  const warningList = input.warning ? [input.warning] : [];

  return {
    success: true,
    mode: "fallback",
    warnings: warningList,
    stationOutputs: buildStationOutputs({
      projectName: input.projectName,
      warning: input.warning,
      normalizedText,
      paragraphs,
      sentences,
      characters,
      themes,
      genre,
      tone,
      summary,
      efficiencyScore,
      healthScore,
      overallScore,
      warningList,
    }),
    metadata: {
      stationsCompleted: 7,
      totalExecutionTime: Date.now() - startedAt,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      projectName: input.projectName,
      analysisMode: "fallback",
      textLength: input.fullText.length,
      chunkCount: chunks.length,
      ragEnabled: chunks.length > 1,
    },
  };
}

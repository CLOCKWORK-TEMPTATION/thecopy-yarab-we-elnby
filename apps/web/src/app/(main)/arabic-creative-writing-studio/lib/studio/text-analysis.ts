import type { TextAnalysis } from "../../types";
import type { TextStats } from "../../types/studio";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function numberFromRecord(
  record: Record<string, unknown>,
  key: string,
  fallback: number
): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function detectEmotionalTone(text: string): TextAnalysis["emotionalTone"] {
  const positiveWords = ["أمل", "نجاح", "فرح", "حب", "نور", "انتصار"];
  const negativeWords = ["خوف", "حزن", "فشل", "ظلام", "موت", "ضياع"];
  const positiveScore = positiveWords.filter((word) =>
    text.includes(word)
  ).length;
  const negativeScore = negativeWords.filter((word) =>
    text.includes(word)
  ).length;

  if (positiveScore > negativeScore) {
    return "positive";
  }
  if (negativeScore > positiveScore) {
    return "negative";
  }
  return "neutral";
}

export function collectTextStats(text: string): TextStats {
  const trimmedText = text.trim();
  const words = trimmedText ? trimmedText.split(/\s+/).filter(Boolean) : [];
  const paragraphs = trimmedText
    ? trimmedText.split(/\n{2,}/).filter((paragraph) => paragraph.trim())
    : [];
  const sentences = trimmedText
    ? trimmedText.split(/[.!؟?。]+/).filter((sentence) => sentence.trim())
    : [];
  const uniqueWords = new Set(words.map((word) => word.toLocaleLowerCase()));
  const averageWordsPerSentence =
    sentences.length > 0 ? words.length / sentences.length : words.length;
  const averageSentencesPerParagraph =
    paragraphs.length > 0
      ? sentences.length / paragraphs.length
      : sentences.length;
  const vocabularyDiversity =
    words.length > 0 ? (uniqueWords.size / words.length) * 100 : 0;
  const sentenceLengths = sentences.map(
    (sentence) => sentence.trim().split(/\s+/).filter(Boolean).length
  );
  const sentenceVariety =
    sentenceLengths.length > 1
      ? Math.min(
          100,
          Math.max(...sentenceLengths) - Math.min(...sentenceLengths) + 50
        )
      : 50;

  return {
    words,
    paragraphs,
    sentences,
    averageWordsPerSentence,
    averageSentencesPerParagraph,
    readabilityScore: clampMetric(100 - averageWordsPerSentence * 2),
    vocabularyDiversity: clampMetric(vocabularyDiversity),
    sentenceVariety: clampMetric(sentenceVariety),
  };
}

export function buildFallbackTextAnalysis(
  text: string,
  stats: TextStats,
  suggestions: string[]
): TextAnalysis {
  return {
    wordCount: stats.words.length,
    characterCount: text.length,
    paragraphCount: stats.paragraphs.length,
    sentenceCount: stats.sentences.length,
    averageWordsPerSentence: stats.averageWordsPerSentence,
    averageSentencesPerParagraph: stats.averageSentencesPerParagraph,
    readabilityScore: stats.readabilityScore,
    vocabularyDiversity: stats.vocabularyDiversity,
    sentenceVariety: stats.sentenceVariety,
    emotionalTone: detectEmotionalTone(text),
    qualityMetrics: {
      clarity: stats.readabilityScore,
      creativity: stats.vocabularyDiversity,
      coherence: clampMetric(
        (stats.readabilityScore + stats.sentenceVariety) / 2
      ),
      impact: clampMetric(
        (stats.vocabularyDiversity + stats.sentenceVariety) / 2
      ),
    },
    suggestions,
  };
}

function resolveAnalysisSuggestions(
  rawAnalysis: Record<string, unknown>,
  fallbackSuggestions: string[]
): string[] {
  if (Array.isArray(rawAnalysis["suggestions"])) {
    return rawAnalysis["suggestions"].filter(
      (suggestion): suggestion is string => typeof suggestion === "string"
    );
  }

  return typeof rawAnalysis["analysis"] === "string"
    ? [rawAnalysis["analysis"]]
    : fallbackSuggestions;
}

function resolveEmotionalTone(
  text: string,
  rawAnalysis: Record<string, unknown>
): TextAnalysis["emotionalTone"] {
  return rawAnalysis["emotionalTone"] === "positive" ||
    rawAnalysis["emotionalTone"] === "negative" ||
    rawAnalysis["emotionalTone"] === "neutral"
    ? rawAnalysis["emotionalTone"]
    : detectEmotionalTone(text);
}

export function buildTextAnalysis(text: string, rawAnalysis: unknown): TextAnalysis {
  const stats = collectTextStats(text);
  const fallbackSuggestions = [
    "راجع تنوع الجمل والإيقاع قبل الاعتماد النهائي.",
  ];

  if (!isRecord(rawAnalysis)) {
    return buildFallbackTextAnalysis(text, stats, fallbackSuggestions);
  }

  const qualityMetrics = isRecord(rawAnalysis["qualityMetrics"])
    ? rawAnalysis["qualityMetrics"]
    : {};
  const suggestions = resolveAnalysisSuggestions(
    rawAnalysis,
    fallbackSuggestions
  );

  return {
    wordCount: numberFromRecord(rawAnalysis, "wordCount", stats.words.length),
    characterCount: numberFromRecord(
      rawAnalysis,
      "characterCount",
      text.length
    ),
    paragraphCount: numberFromRecord(
      rawAnalysis,
      "paragraphCount",
      stats.paragraphs.length
    ),
    sentenceCount: numberFromRecord(
      rawAnalysis,
      "sentenceCount",
      stats.sentences.length
    ),
    averageWordsPerSentence: numberFromRecord(
      rawAnalysis,
      "averageWordsPerSentence",
      stats.averageWordsPerSentence
    ),
    averageSentencesPerParagraph: numberFromRecord(
      rawAnalysis,
      "averageSentencesPerParagraph",
      stats.averageSentencesPerParagraph
    ),
    readabilityScore: numberFromRecord(
      rawAnalysis,
      "readabilityScore",
      stats.readabilityScore
    ),
    vocabularyDiversity: numberFromRecord(
      rawAnalysis,
      "vocabularyDiversity",
      stats.vocabularyDiversity
    ),
    sentenceVariety: numberFromRecord(
      rawAnalysis,
      "sentenceVariety",
      stats.sentenceVariety
    ),
    emotionalTone: resolveEmotionalTone(text, rawAnalysis),
    qualityMetrics: {
      clarity: numberFromRecord(
        qualityMetrics,
        "clarity",
        stats.readabilityScore
      ),
      creativity: numberFromRecord(
        qualityMetrics,
        "creativity",
        stats.vocabularyDiversity
      ),
      coherence: numberFromRecord(
        qualityMetrics,
        "coherence",
        clampMetric((stats.readabilityScore + stats.sentenceVariety) / 2)
      ),
      impact: numberFromRecord(
        qualityMetrics,
        "impact",
        clampMetric((stats.vocabularyDiversity + stats.sentenceVariety) / 2)
      ),
    },
    suggestions: suggestions.length > 0 ? suggestions : fallbackSuggestions,
  };
}

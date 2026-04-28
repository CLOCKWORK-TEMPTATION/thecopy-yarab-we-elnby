import { GeminiModel, GeminiService } from "../../gemini-service";
import {
  clamp,
  normalizeComplexity,
  normalizePacingSpeed,
  normalizeVocabulary,
} from "../normalizers";
import { parseJSON } from "../parsers";

import type { NarrativeStyleAnalysis, NarrativeStyleResponse } from "../types";

export async function analyzeNarrativeStyle(
  geminiService: GeminiService,
  text: string
): Promise<NarrativeStyleAnalysis> {
  const contextText = text.slice(0, Math.min(20000, text.length));

  const prompt = `Analyze the narrative style of this text.

Assess:
1. Overall tone and tone elements
2. Pacing: overall speed, variation, strengths, weaknesses
3. Language style: complexity, vocabulary, sentence structure, literary devices
4. Point of view
5. Time structure

Provide JSON:
{
  "overall_tone": "tone description",
  "tone_elements": ["element1", "element2"],
  "pacing": {
    "overall": "moderate",
    "variation": 7.5,
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"]
  },
  "language_style": {
    "complexity": "moderate",
    "vocabulary": "rich",
    "sentence_structure": "description",
    "literary_devices": ["device1"]
  },
  "point_of_view": "third person limited",
  "time_structure": "chronological"
}

Text excerpt:
${contextText}`;

  try {
    const response = await geminiService.generate<{ raw: string }>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.4,
      maxTokens: 2000,
      systemInstruction:
        "You are an expert literary analyst. Provide detailed JSON analysis.",
    });

    const parsed = parseJSON<NarrativeStyleResponse>(response.content);

    if (!parsed?.overall_tone) {
      throw new Error("Invalid narrative style response");
    }

    return toNarrativeStyleAnalysis(parsed);
  } catch (error) {
    throw new Error(
      `Failed to analyze narrative style: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function toNarrativeStyleAnalysis(
  parsed: NarrativeStyleResponse
): NarrativeStyleAnalysis {
  return {
    overallTone: parsed.overall_tone,
    toneElements: parsed.tone_elements || [],
    pacingAnalysis: {
      overall: normalizePacingSpeed(parsed.pacing?.overall),
      variation: clamp(parsed.pacing?.variation || 5, 0, 10),
      strengths: parsed.pacing?.strengths || [],
      weaknesses: parsed.pacing?.weaknesses || [],
    },
    languageStyle: {
      complexity: normalizeComplexity(parsed.language_style?.complexity),
      vocabulary: normalizeVocabulary(parsed.language_style?.vocabulary),
      sentenceStructure: parsed.language_style?.sentence_structure || "",
      literaryDevices: parsed.language_style?.literary_devices || [],
    },
    pointOfView: parsed.point_of_view || "غير محدد",
    timeStructure: parsed.time_structure || "غير محدد",
  };
}

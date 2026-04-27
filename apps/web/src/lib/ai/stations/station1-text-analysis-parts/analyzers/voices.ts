import { GeminiModel, GeminiService } from "../../gemini-service";
import { getDefaultVoiceAnalysis } from "../defaults";
import { clamp } from "../normalizers";
import { parseJSON } from "../parsers";

import type {
  CharacterProfile,
  VoiceAnalysis,
  VoiceAnalysisResponse,
  VoiceProfile,
} from "../types";

export async function analyzeVoices(
  geminiService: GeminiService,
  text: string,
  characters: CharacterProfile[]
): Promise<VoiceAnalysis> {
  if (characters.length < 2) {
    return getDefaultVoiceAnalysis();
  }

  const contextText = text.slice(0, Math.min(25000, text.length));
  const characterNames = characters.map((c) => c.name).join(", ");

  const prompt = `Analyze the distinctiveness of character voices.

Characters: ${characterNames}

For each character, assess:
1. Distinctiveness (0-10): how unique their voice is
2. Characteristics: speech patterns, vocabulary, tone
3. Sample lines: representative dialogue

Identify overlaps:
- Characters with similar voices
- Similarity percentage
- Examples of overlap
- Recommendations for differentiation

Provide JSON:
{
  "profiles": [
    {
      "character": "name",
      "distinctiveness": 8.5,
      "characteristics": ["trait1", "trait2"],
      "sample_lines": ["line1", "line2"]
    }
  ],
  "overlaps": [
    {
      "character1": "name1",
      "character2": "name2",
      "similarity": 75,
      "examples": ["example1"],
      "recommendation": "suggestion"
    }
  ],
  "overall_distinctiveness": 7.5
}

Text excerpt:
${contextText}`;

  try {
    const response = await geminiService.generate<{ raw: string }>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
      maxTokens: 3000,
      systemInstruction:
        "You are an expert in character voice analysis. Provide detailed JSON analysis.",
    });

    const parsed = parseJSON<VoiceAnalysisResponse>(response.content);

    if (!parsed || !Array.isArray(parsed.profiles)) {
      return getDefaultVoiceAnalysis();
    }

    const profiles = new Map<string, VoiceProfile>();
    parsed.profiles.forEach((p) => {
      profiles.set(p.character, {
        character: p.character,
        distinctiveness: clamp(p.distinctiveness, 0, 10),
        characteristics: p.characteristics || [],
        sampleLines: p.sample_lines || [],
      });
    });

    return {
      profiles,
      overlapIssues: (parsed.overlaps || []).map((o) => ({
        character1: o.character1,
        character2: o.character2,
        similarity: clamp(o.similarity, 0, 100),
        examples: o.examples || [],
        recommendation: o.recommendation || "",
      })),
      overallDistinctiveness: clamp(parsed.overall_distinctiveness, 0, 10),
    };
  } catch (error) {
    console.error("Failed to analyze voices:", error);
    return getDefaultVoiceAnalysis();
  }
}

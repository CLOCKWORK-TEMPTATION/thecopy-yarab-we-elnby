import { GeminiModel, GeminiService } from "../../gemini-service";
import { normalizeArcType, normalizeRole } from "../normalizers";
import { parseJSON } from "../parsers";
import { MAX_PARALLEL_REQUESTS, processInBatches } from "../text-utils";

import type {
  CharacterAnalysisResponse,
  CharacterProfile,
  CharacterRef,
  CharactersResponse,
} from "../types";

export async function identifyMajorCharacters(
  geminiService: GeminiService,
  text: string
): Promise<CharacterRef[]> {
  const contextText = text.slice(0, Math.min(20000, text.length));

  const prompt = `Analyze this narrative and identify the major characters.

For each character, determine:
- Name
- Role (protagonist/antagonist/supporting/minor)
- Prominence (0-10 scale based on narrative presence)

Focus on characters who:
- Appear frequently
- Drive the plot
- Have clear motivations and goals
- Undergo development

List 3-10 characters in JSON format:
{
  "characters": [
    {"name": "character name", "role": "protagonist", "prominence": 10},
    ...
  ]
}

Text excerpt:
${contextText}`;

  const response = await geminiService.generate<{ raw: string }>({
    prompt,
    model: GeminiModel.FLASH,
    temperature: 0.3,
    maxTokens: 1500,
    systemInstruction:
      "You are an expert character analyst. Provide structured JSON output.",
  });

  try {
    const parsed = parseJSON<CharactersResponse>(response.content);

    if (!parsed?.characters || !Array.isArray(parsed.characters)) {
      throw new Error("Invalid characters response format");
    }

    return parsed.characters
      .filter((c) => c.name && c.role && typeof c.prominence === "number")
      .sort((a, b) => b.prominence - a.prominence)
      .slice(0, 10);
  } catch (error) {
    throw new Error(
      `Failed to parse characters: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function analyzeCharactersInDepth(
  geminiService: GeminiService,
  text: string,
  charactersData: CharacterRef[]
): Promise<CharacterProfile[]> {
  const analyses = await processInBatches(
    charactersData,
    MAX_PARALLEL_REQUESTS,
    (char) => analyzeCharacter(geminiService, text, char.name, char.role)
  );

  return analyses.filter((a): a is CharacterProfile => a !== null);
}

export async function analyzeCharacter(
  geminiService: GeminiService,
  text: string,
  name: string,
  role: string
): Promise<CharacterProfile | null> {
  const contextText = text.slice(0, Math.min(25000, text.length));

  const prompt = `Conduct a deep character analysis for: ${name}

Analyze:
1. Personality traits (list 3-7 key traits)
2. Motivations (what drives this character)
3. Goals (what they want to achieve)
4. Obstacles (what stands in their way)
5. Character arc:
   - Type: positive/negative/flat/complex
   - Description: how they change
   - Key moments: pivotal scenes

Provide JSON:
{
  "personality_traits": ["trait1", "trait2", ...],
  "motivations": ["motivation1", ...],
  "goals": ["goal1", ...],
  "obstacles": ["obstacle1", ...],
  "arc_type": "positive",
  "arc_description": "description",
  "key_moments": ["moment1", ...],
  "confidence": 0.85
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
        "You are an expert character psychologist. Provide detailed JSON analysis.",
    });

    const parsed = parseJSON<CharacterAnalysisResponse>(response.content);

    if (!parsed || !Array.isArray(parsed.personality_traits)) {
      return null;
    }

    return {
      name,
      role: normalizeRole(role),
      personalityTraits: parsed.personality_traits || [],
      motivations: parsed.motivations || [],
      goals: parsed.goals || [],
      obstacles: parsed.obstacles || [],
      arc: {
        type: normalizeArcType(parsed.arc_type),
        description: parsed.arc_description || "",
        keyMoments: parsed.key_moments || [],
      },
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    // SECURITY FIX: Pass name as separate argument to prevent format string injection
    console.error("Failed to analyze character:", name, error);
    return null;
  }
}

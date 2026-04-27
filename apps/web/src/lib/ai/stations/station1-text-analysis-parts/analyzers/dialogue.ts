import { GeminiModel, GeminiService } from "../../gemini-service";
import { getDefaultDialogueMetrics } from "../defaults";
import { clamp, normalizeIssues } from "../normalizers";
import { parseJSON } from "../parsers";

import type {
  CharacterProfile,
  DialogueAnalysisResponse,
  DialogueMetrics,
} from "../types";

export async function analyzeDialogue(
  geminiService: GeminiService,
  text: string,
  characters: CharacterProfile[]
): Promise<DialogueMetrics> {
  const contextText = text.slice(0, Math.min(25000, text.length));
  const characterNames = characters.map((c) => c.name).join(", ");

  const prompt = `Analyze the dialogue quality in this narrative.

Main characters: ${characterNames}

Evaluate:
1. Efficiency (0-10): how economical and purposeful
2. Distinctiveness (0-10): how unique each voice is
3. Naturalness (0-10): how realistic and authentic
4. Subtext (0-10): how much is conveyed indirectly

Identify issues:
- Redundancy: repetitive or unnecessary dialogue
- Inconsistency: out of character speech
- Exposition dumps: unnatural information delivery
- On-the-nose: overly explicit dialogue
- Pacing: rhythm problems

Provide JSON:
{
  "efficiency": 7.5,
  "distinctiveness": 8.0,
  "naturalness": 7.0,
  "subtext": 6.5,
  "issues": [
    {
      "type": "redundancy",
      "location": "scene description",
      "severity": "medium",
      "suggestion": "improvement suggestion"
    }
  ]
}

Text excerpt:
${contextText}`;

  try {
    const response = await geminiService.generate<{ raw: string }>({
      prompt,
      model: GeminiModel.PRO,
      temperature: 0.3,
      maxTokens: 2500,
      systemInstruction:
        "You are an expert dialogue analyst. Provide detailed JSON analysis.",
    });

    const parsed = parseJSON<DialogueAnalysisResponse>(response.content);

    if (!parsed || typeof parsed.efficiency !== "number") {
      return getDefaultDialogueMetrics();
    }

    return {
      efficiency: clamp(parsed.efficiency, 0, 10),
      distinctiveness: clamp(parsed.distinctiveness, 0, 10),
      naturalness: clamp(parsed.naturalness, 0, 10),
      subtext: clamp(parsed.subtext, 0, 10),
      issues: normalizeIssues(parsed.issues || []),
    };
  } catch (error) {
    console.error("Failed to analyze dialogue:", error);
    return getDefaultDialogueMetrics();
  }
}

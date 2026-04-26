/* eslint-disable @typescript-eslint/no-explicit-any */
import { platformGenAIService } from '@/services/platform-genai.service';

interface ValidateShotInput {
  imageBase64?: string;
  mimeType?: string;
  mood?: string;
  analysisType?: string;
}

interface ColorGradingInput {
  sceneType?: string;
  mood?: string;
  temperature?: number;
}

function parseShotValidationPayload(text: string): Record<string, any> {
  const normalized = text.trim();
  const candidates = new Set<string>();

  candidates.add(normalized);

  const fenceStripped = normalized
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (fenceStripped) {
    candidates.add(fenceStripped);
  }

  const firstBrace = fenceStripped.indexOf("{");
  const lastBrace = fenceStripped.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.add(fenceStripped.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Try the next normalized candidate.
    }
  }

  throw new Error("The AI provider returned an invalid shot validation payload.");
}

export class CineAIService {
   
  async validateShot(input: ValidateShotInput): Promise<Record<string, any>> {
    const withImage = Boolean(input.imageBase64 && input.mimeType);

    if (withImage) {
      const text = await platformGenAIService.generateTextFromMedia(
        `You are an expert cinematographer. Analyze this frame technically and return ONLY valid JSON:
{
  "score": 0,
  "status": "excellent",
  "exposure": "Good",
  "composition": "Good",
  "focus": "Good",
  "colorBalance": "Good",
  "suggestions": ["string"],
  "technicalDetails": {
    "histogram": "string",
    "waveform": "string",
    "vectorscope": "string"
  },
  "strengths": ["string"],
  "improvements": ["string"]
}`,
        {
          data: input.imageBase64!,
          mimeType: input.mimeType!,
        },
        { temperature: 0.25, maxOutputTokens: 4096 }
      );

      return parseShotValidationPayload(text);
    }

    const prompt = `You are an expert cinematographer. No reference frame is available, so perform a technical preflight review based on the provided intent and return ONLY valid JSON:
{
  "score": 0,
  "status": "good",
  "exposure": "Good",
  "composition": "Good",
  "focus": "Good",
  "colorBalance": "Good",
  "suggestions": ["string"],
  "technicalDetails": {
    "histogram": "string",
    "waveform": "string",
    "vectorscope": "string"
  },
  "strengths": ["string"],
  "improvements": ["string"]
}

Input:
${JSON.stringify(input ?? {}, null, 2)}`;

    return platformGenAIService.generateJson<Record<string, any>>(prompt, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    });
  }

  async generateColorPalette(input: ColorGradingInput): Promise<Record<string, any>> {
    if (!input.sceneType?.trim()) {
      throw new Error('Scene type is required.');
    }

    const prompt = `You are a cinematic color grading expert.

Return ONLY valid JSON:
{
  "palette": ["#000000", "#111111", "#222222", "#333333", "#444444"],
  "primaryColor": "#000000",
  "secondaryColor": "#111111",
  "accentColor": "#222222",
  "suggestions": ["string"],
  "lutRecommendation": "string",
  "cinematicReferences": ["string"]
}

Input:
${JSON.stringify(input, null, 2)}`;

    return platformGenAIService.generateJson<Record<string, any>>(prompt, {
      temperature: 0.35,
      maxOutputTokens: 4096,
    });
  }
}

export const cineAIService = new CineAIService();

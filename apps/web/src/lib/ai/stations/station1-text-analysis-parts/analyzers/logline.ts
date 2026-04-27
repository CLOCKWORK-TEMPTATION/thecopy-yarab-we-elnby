import { GeminiModel, GeminiService } from "../../gemini-service";
import { extractText } from "../parsers";

export async function generateLogline(
  geminiService: GeminiService,
  text: string
): Promise<string> {
  const contextText = text.slice(0, Math.min(15000, text.length));

  const prompt = `Analyze this narrative text and generate a compelling logline.

A logline should be 1-2 sentences that capture:
- The protagonist
- Their goal
- The main obstacle/conflict
- The stakes

Text excerpt:
${contextText}

Generate a concise, engaging logline in Arabic.`;

  const response = await geminiService.generate<{ raw: string }>({
    prompt,
    model: GeminiModel.FLASH,
    temperature: 0.6,
    maxTokens: 300,
    systemInstruction:
      "You are an expert story analyst. Provide clear, concise analysis.",
  });

  const logline = extractText(response.content);

  if (!logline || logline.length < 20) {
    throw new Error("Failed to generate valid logline");
  }

  return logline;
}

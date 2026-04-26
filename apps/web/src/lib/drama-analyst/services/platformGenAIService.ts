import { z } from "zod";

import { geminiService } from "./geminiService";

interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface JsonGenerationOptions<T> extends GenerationOptions {
  schema?: z.ZodType<T>;
}

function extractJsonPayload(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
    if (fenced?.[1]) {
      return fenced[1].trim();
    }
  }

  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");

  const hasObject = objectStart >= 0 && objectEnd > objectStart;
  const hasArray = arrayStart >= 0 && arrayEnd > arrayStart;

  if (hasArray && (!hasObject || arrayStart < objectStart)) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  if (hasObject) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }

  return trimmed;
}

class PlatformGenAIService {
  generateText(
    prompt: string,
    options: GenerationOptions = {}
  ): Promise<string> {
    return geminiService.generateText(prompt, options);
  }

  async generateJson<T>(
    prompt: string,
    options: JsonGenerationOptions<T> = {}
  ): Promise<T> {
    const text = await this.generateText(prompt, {
      temperature: options.temperature ?? 0.3,
      ...(options.maxTokens !== undefined
        ? { maxTokens: options.maxTokens }
        : {}),
      ...(options.model !== undefined ? { model: options.model } : {}),
    });
    const parsed = JSON.parse(extractJsonPayload(text)) as unknown;
    return options.schema ? options.schema.parse(parsed) : (parsed as T);
  }
}

export const platformGenAIService = new PlatformGenAIService();

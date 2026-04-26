import { geminiService } from "@/services/gemini.service";

export async function callGeminiText(prompt: string): Promise<string> {
  return geminiService.analyzeText(prompt, "general");
}

export function toText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

export function safeSub(text: string, start = 0, end?: number): string {
  return text.slice(start, end);
}

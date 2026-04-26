// Gemini AI Core Integration for Frontend
// Routes all Gemini calls through Backend API for security and caching

import { analyzeScript, getShotSuggestion, chatWithAI } from "@/lib/api";

/**
 * Model identifier type
 */
export type ModelId =
  | "gemini-1.5-flash"
  | "gemini-1.5-pro"
  | "gemini-pro"
  | "gemini-flash";

/**
 * Convert Gemini response to plain text
 */
export function toText(response: unknown): string {
  if (typeof response === "string") return response;
  if (
    response &&
    typeof response === "object" &&
    "text" in response &&
    typeof response.text === "string"
  ) {
    return response.text;
  }
  if (
    response &&
    typeof response === "object" &&
    "response" in response &&
    response.response &&
    typeof response.response === "object" &&
    "text" in response.response &&
    typeof response.response.text === "function"
  ) {
    return response.response.text();
  }
  return JSON.stringify(response);
}

/**
 * Safe string substitution helper
 */
export function safeSub(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key] !== undefined ? values[key] : match;
  });
}

/**
 * Call Gemini with text prompt
 */
export async function callGeminiText(
  prompt: string,
  _options?: {
    model?: ModelId;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const response = await geminiCore.chatWithAI(prompt);
  return toText(response);
}

// Core Gemini functions that call Backend API
export const geminiCore = {
  // Analyze screenplay content via Backend
  async analyzeScreenplay(
    content: string,
    _analysisType = "structure",
    projectId?: string
  ) {
    if (!projectId) {
      throw new Error("projectId is required for screenplay analysis");
    }

    const response = await analyzeScript(projectId, content);
    return response.data;
  },

  // Generate shot suggestions via Backend
  async generateShotSuggestion(sceneDescription: string, shotType = "medium") {
    const response = await getShotSuggestion(sceneDescription, shotType);
    return response.data;
  },

  // Chat with AI via Backend
  async chatWithAI(message: string, context?: Record<string, unknown>) {
    const response = await chatWithAI(message, undefined, context);
    return response.data;
  },
};

// Stream response for real-time updates (via Backend)
export async function streamFlash(
  prompt: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  // For now, use regular chat - streaming can be implemented later
  const response = await geminiCore.chatWithAI(prompt);

  const text = (() => {
    if (!response) return "";
    if (typeof response === "string") return response;

    const r = response as unknown as {
      text?: unknown;
      message?: unknown;
      content?: unknown;
      data?: unknown;
    };

    if (typeof r.text === "string") return r.text;
    if (typeof r.message === "string") return r.message;
    if (typeof r.content === "string") return r.content;

    const data = r.data as
      | { text?: unknown; message?: unknown; content?: unknown }
      | undefined;
    if (data) {
      if (typeof data.text === "string") return data.text;
      if (typeof data.message === "string") return data.message;
      if (typeof data.content === "string") return data.content;
    }

    return "";
  })();

  if (onChunk && text) {
    onChunk(text);
  }

  return text;
}

export default geminiCore;

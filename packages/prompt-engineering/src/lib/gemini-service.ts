// lib/gemini-service.ts
// Gemini service wrapper for Arabic Prompt Engineering Studio
// This module is intentionally self-contained so the package can stay
// independent from app-level code and external workspace source aliases.

export type PromptStudioGeminiModel = "gemini-2.5-flash" | "gemini-2.5-pro";

export interface PromptStudioGeminiClient {
  readonly model: PromptStudioGeminiModel;
  readonly temperature: number;
  readonly maxTokens: number;
  readonly apiKey: string | undefined;
  estimateTokens: typeof estimateTokenCount;
  validatePrompt: typeof validatePrompt;
}

/**
 * Client-side Gemini service configuration
 * Note: API key should be handled securely on the server-side
 */
export interface PromptStudioGeminiConfig {
  apiKey?: string;
  model?: PromptStudioGeminiModel;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Get Gemini service instance for prompt engineering studio
 * This is a client-side wrapper that provides simplified access
 */
export function createPromptStudioGeminiService(
  config?: PromptStudioGeminiConfig
): PromptStudioGeminiClient {
  const apiKey =
    config?.apiKey ||
    (typeof window !== "undefined"
      ? undefined // Client-side: API key should come from server
      : process.env["GEMINI_API_KEY_PROD"] ||
        process.env["GEMINI_API_KEY_STAGING"] ||
        "");

  if (!apiKey && typeof window === "undefined") {
    throw new Error(
      "Gemini API key is required. Please provide it in the config or set GEMINI_API_KEY environment variable."
    );
  }

  return {
    apiKey,
    model: config?.model ?? "gemini-2.5-flash",
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens ?? 8192,
    estimateTokens: estimateTokenCount,
    validatePrompt,
  };
}

/**
 * Simplified prompt generation function
 */
export async function generatePromptAnalysis(
  _prompt: string,
  _options: {
    model?: PromptStudioGeminiModel;
    temperature?: number;
    systemInstruction?: string;
  } = {}
): Promise<string> {
  // Note: This should be called from a server action in Next.js
  // For client-side, use API routes instead
  throw new Error(
    "generatePromptAnalysis should be called from a server action or API route. " +
      "Direct client-side calls are not supported for security reasons."
  );
}

/**
 * Estimate token count for a prompt
 * Rough estimation: ~4 characters per token for Arabic/English mixed text
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  // Arabic text tends to be more token-dense
  // Rough estimate: 3-4 characters per token for Arabic, 4 for English
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = text.length - arabicChars;

  const arabicTokens = Math.ceil(arabicChars / 3);
  const englishTokens = Math.ceil(englishChars / 4);

  return arabicTokens + englishTokens;
}

/**
 * Estimate cost for a prompt (rough calculation)
 * Based on Gemini pricing (this is an approximation)
 */
export function estimatePromptCost(
  promptTokens: number,
  completionTokens: number = 0,
  model: PromptStudioGeminiModel = "gemini-2.5-flash"
): number {
  // Rough pricing estimates (these should be updated based on actual Gemini pricing)
  const inputPricePer1K = model === "gemini-2.5-pro" ? 0.001 : 0.0001; // Example prices
  const outputPricePer1K = model === "gemini-2.5-pro" ? 0.002 : 0.0002; // Example prices

  const inputCost = (promptTokens / 1000) * inputPricePer1K;
  const outputCost = (completionTokens / 1000) * outputPricePer1K;

  return inputCost + outputCost;
}

/**
 * Validate prompt length and complexity
 */
export function validatePrompt(prompt: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!prompt || prompt.trim().length === 0) {
    errors.push("الـ prompt فارغ");
  }

  if (prompt.length < 10) {
    warnings.push("الـ prompt قصير جداً وقد لا يكون واضحاً");
  }

  if (prompt.length > 10000) {
    warnings.push("الـ prompt طويل جداً وقد يؤثر على الأداء");
  }

  const tokenCount = estimateTokenCount(prompt);
  if (tokenCount > 8000) {
    warnings.push(`عدد الـ tokens كبير جداً (${tokenCount})`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

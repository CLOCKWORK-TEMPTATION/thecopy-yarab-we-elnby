import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AIRequest, AIResponse } from "../core/types";
import { buildPrompt } from "../orchestration/promptBuilder";
import { config } from "../config/environment";
import { sanitization } from "./sanitizationService";
import { log } from "./loggerService";

// =====================================================
// Gemini Service Configuration
// =====================================================

interface GeminiConfig {
  apiKey: string;
  model: string;
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

interface GenerateTextOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

class GeminiService {
  private config: GeminiConfig;
  private ai: GoogleGenAI | null = null;

  constructor() {
    this.config = {
      apiKey: config.api.geminiKey,
      model: config.api.geminiModel,
      maxRetries: config.api.retries,
      retryDelay: 1000,
      timeout: config.api.timeout,
    };

    if (this.config.apiKey) {
      this.initialize();
    }
  }

  private initialize(): void {
    try {
      this.ai = new GoogleGenAI({ apiKey: this.config.apiKey });
      log.info("✅ Gemini API initialized successfully", null, "GeminiService");
    } catch (error) {
      log.error("❌ Failed to initialize Gemini", error, "GeminiService");
      throw error;
    }
  }

  async generateText(
    prompt: string,
    options: GenerateTextOptions = {}
  ): Promise<string> {
    if (!this.ai) {
      throw new Error(
        "Gemini model not initialized. Please check your API key."
      );
    }

    const effectiveModel = options.model ?? this.config.model;

    log.info(
      `[Gemini Service] Generating content with model ${effectiveModel}`,
      {
        tokenLimit: options.maxTokens ?? 48192,
        temperature: options.temperature ?? 0.9,
      },
      "GeminiService"
    );

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        log.debug(
          `🔄 Gemini API call attempt ${attempt}/${this.config.maxRetries}`,
          null,
          "GeminiService"
        );

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error("Request timeout")),
            this.config.timeout
          );
        });

        const generatePromise = this.ai.models.generateContent({
          model: effectiveModel,
          contents: prompt,
          config: {
            temperature: options.temperature ?? 0.9,
            maxOutputTokens: options.maxTokens ?? 48192,
          },
        });

        const result = await Promise.race([generatePromise, timeoutPromise]);
        const text = result.text;

        if (!text) {
          throw new Error("Empty response from Gemini");
        }

        log.info("✅ Gemini API call successful", null, "GeminiService");
        return text;
      } catch (error: any) {
        lastError = error;
        log.error(
          `❌ Gemini API error (attempt ${attempt})`,
          error,
          "GeminiService"
        );

        if (attempt < this.config.maxRetries) {
          const delay = this.config.retryDelay * attempt;
          log.debug(`⏳ Retrying in ${delay}ms...`, null, "GeminiService");
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Gemini API failed after ${this.config.maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  async analyze(request: AIRequest): Promise<AIResponse> {
    try {
      log.info(
        "📝 Starting Gemini analysis",
        { agent: request.agent },
        "GeminiService"
      );

      const sanitized = sanitization.text(request.prompt);
      const sanitizedRequest = { ...request, prompt: sanitized };
      const prompt = buildPrompt(sanitizedRequest);

      const rawResponse = await this.generateText(prompt);

      log.info(
        "✅ Gemini analysis completed",
        { agent: request.agent },
        "GeminiService"
      );

      return {
        text: rawResponse,
        parsed: null,
        raw: rawResponse,
        agent: request.agent,
      };
    } catch (error) {
      log.error("❌ Gemini analysis failed", error, "GeminiService");
      throw error;
    }
  }

  isInitialized(): boolean {
    return this.ai !== null;
  }

  getModelInfo(): { model: string; maxTokens: number } {
    return {
      model: this.config.model,
      maxTokens: 48192,
    };
  }
}

// =====================================================
// Singleton Export
// =====================================================

export const geminiService = new GeminiService();

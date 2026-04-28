// Gemini Service Configuration and Utilities
// Provides centralized access to Gemini AI capabilities

import { GoogleGenerativeAI } from "@google/generative-ai";

// Model enum for identifying models
export enum GeminiModel {
  FLASH = "gemini-1.5-flash",
  PRO = "gemini-1.5-pro",
  FLASH_LITE = "gemini-flash",
}

// Model configurations
export interface GeminiModelInfo {
  name: string;
  version: string;
  maxTokens: number;
  capabilities: string[];
}

export interface GeminiConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
}

export interface GeminiOperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

// Available Gemini models
export const GEMINI_MODELS: Record<string, GeminiModelInfo> = {
  "gemini-1.5-flash": {
    name: "Gemini 1.5 Flash",
    version: "1.5-flash",
    maxTokens: 1048576,
    capabilities: ["text", "vision", "multimodal", "streaming"],
  },
  "gemini-1.5-pro": {
    name: "Gemini 1.5 Pro",
    version: "1.5-pro",
    maxTokens: 2097152,
    capabilities: ["text", "vision", "multimodal", "streaming", "long-context"],
  },
  "gemini-pro": {
    name: "Gemini Pro",
    version: "pro",
    maxTokens: 32768,
    capabilities: ["text", "multimodal"],
  },
};

// Default configurations for different use cases
export const GEMINI_CONFIGS: Record<string, GeminiConfig> = {
  analysis: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048,
  },
  creative: {
    temperature: 0.9,
    topK: 50,
    topP: 0.98,
    maxOutputTokens: 1024,
  },
  chat: {
    temperature: 0.8,
    topK: 40,
    topP: 0.9,
    maxOutputTokens: 512,
  },
  summary: {
    temperature: 0.3,
    topK: 20,
    topP: 0.8,
    maxOutputTokens: 256,
  },
};

// Service class for Gemini operations
export class GeminiService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey || typeof window === "undefined") {
      // Server-side or with explicit API key
      const key =
        apiKey ??
        process.env["GEMINI_API_KEY"] ??
        process.env["GOOGLE_GENAI_API_KEY"];
      if (key) {
        const GoogleGenAI = require("@google/generative-ai") as {
          GoogleGenerativeAI: typeof GoogleGenerativeAI;
        };
        this.genAI = new GoogleGenAI.GoogleGenerativeAI(key);
      }
    }
  }

  // Get model with configuration
  getModel(modelName = "gemini-1.5-flash", configName = "analysis") {
    if (!this.genAI) {
      throw new Error("Gemini AI not initialized");
    }

    const model = GEMINI_MODELS[modelName];
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    const config = GEMINI_CONFIGS[configName] ?? GEMINI_CONFIGS["analysis"];

    return this.genAI.getGenerativeModel({
      model: model.version,
      ...(config && { generationConfig: config }),
    });
  }

  // Check if service is available
  isAvailable(): boolean {
    return this.genAI !== null;
  }

  // Get available models
  getAvailableModels(): string[] {
    return Object.keys(GEMINI_MODELS);
  }

  // Get model capabilities
  getModelCapabilities(modelName: string): string[] {
    const model = GEMINI_MODELS[modelName];
    return model?.capabilities ?? [];
  }

  // Test connection to Gemini API
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.genAI) {
        return { success: false, error: "Gemini AI not initialized" };
      }

      const model = this.getModel("gemini-1.5-flash", "chat");
      await model.generateContent("Hello");

      return { success: true };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to connect to Gemini API"),
      };
    }
  }

  // Analyze text
  async analyzeText(text: string): Promise<GeminiOperationResult> {
    try {
      if (!this.genAI) {
        return { success: false, error: "Gemini AI not initialized" };
      }

      const model = this.getModel("gemini-1.5-flash", "analysis");
      const prompt = `قم بتحليل النص التالي من حيث:
1. الأسلوب والنبرة
2. المفردات والتركيب
3. الموضوعات والأفكار الرئيسية
4. نقاط القوة والضعف
5. اقتراحات للتحسين

النص:
${text}`;

      const result = await model.generateContent(prompt);
      const response = result.response;
      const analysisText = response.text();

      return {
        success: true,
        data: {
          analysis: analysisText,
          wordCount: text.split(/\s+/).length,
          characterCount: text.length,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to analyze text"),
      };
    }
  }

  // Enhance prompt
  async enhancePrompt(
    prompt: string,
    genre: string,
    technique: string
  ): Promise<GeminiOperationResult> {
    try {
      if (!this.genAI) {
        return { success: false, error: "Gemini AI not initialized" };
      }

      const model = this.getModel("gemini-1.5-flash", "creative");
      const enhancementPrompt = `قم بتحسين وتطوير المحفز الإبداعي التالي:

المحفز الأصلي: ${prompt}
النوع الأدبي: ${genre}
الأسلوب: ${technique}

قدم نسخة محسنة ومفصلة من المحفز تتضمن:
1. عناصر سردية أكثر عمقاً
2. تفاصيل حسية وجمالية
3. أبعاد للشخصيات (إن وجدت)
4. توتر أو صراع واضح
5. إمكانيات للتطوير`;

      const result = await model.generateContent(enhancementPrompt);
      const response = result.response;
      const enhancedText = response.text();

      return {
        success: true,
        data: {
          enhancedPrompt: enhancedText,
          originalPrompt: prompt,
          genre,
          technique,
        },
      };
    } catch (error: unknown) {
      return {
        success: false,
        error: getErrorMessage(error, "Failed to enhance prompt"),
      };
    }
  }

  // Generate content (generic method)
  async generateContent(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<string> {
    try {
      if (!this.genAI) {
        throw new Error("Gemini AI not initialized");
      }

      const modelName = options?.model ?? "gemini-1.5-flash";
      const model = this.getModel(modelName, "chat");

      const result = await model.generateContent(prompt);
      const response = result.response;
      return response.text();
    } catch (error: unknown) {
      throw new Error(
        `Failed to generate content: ${getErrorMessage(error, "Unknown error")}`
      );
    }
  }

  async generateText(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      model?: string;
    }
  ): Promise<string> {
    return this.generateContent(prompt, options);
  }
}

// Export singleton instance
export const geminiService = new GeminiService();

// Utility functions
export function isGeminiAvailable(): boolean {
  return geminiService.isAvailable();
}

export function getGeminiModels(): string[] {
  return geminiService.getAvailableModels();
}

export function getModelCapabilities(modelName: string): string[] {
  return geminiService.getModelCapabilities(modelName);
}

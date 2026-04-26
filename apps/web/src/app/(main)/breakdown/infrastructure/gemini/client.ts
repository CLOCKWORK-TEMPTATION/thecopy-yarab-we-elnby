import { GoogleGenAI } from "@google/genai";

import { logger } from "@/lib/ai/utils/logger";

import { BreakdownError } from "../../domain/errors";

import { getGeminiApiKeyFromEnv } from "./env";

export interface AppConfig {
  apiKey: string;
  isConfigured: boolean;
  environment: "development" | "production" | "preview";
}

const getWindowValue = (key: string): string | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const windowObject = window as unknown as Record<string, unknown>;
  const value = windowObject[key];
  return typeof value === "string" ? value : undefined;
};

export const getAPIKey = (): string => {
  return getGeminiApiKeyFromEnv() || getWindowValue("GEMINI_API_KEY") ?? "";
};

export const isValidAPIKey = (key: string): boolean => {
  if (!key || typeof key !== "string") {
    return false;
  }

  const isPlaceholder = /placeholder|change|your.*key|xxx|demo/i.test(key);
  return key.length > 20 && !isPlaceholder;
};

export const getAppConfig = (): AppConfig => {
  const apiKey = getAPIKey();
  const isConfigured = isValidAPIKey(apiKey);

  if (!isConfigured) {
    logger.warn(
      "⚠️ تحذير: مفتاح GEMINI_API_KEY غير مُعد بشكل صحيح. ميزات الذكاء الاصطناعي لن تعمل."
    );
    logger.warn("الرجاء تعيين GEMINI_API_KEY في ملف .env.local");
  }

  return {
    apiKey,
    isConfigured,
    environment:
      (process.env.NODE_ENV as AppConfig["environment"]) || "development",
  };
};

let geminiClient: GoogleGenAI | null = null;

export const getGeminiClient = (apiKey?: string): GoogleGenAI => {
  const resolvedKey = apiKey ?? getAPIKey();

  if (!resolvedKey) {
    throw new BreakdownError(
      "مفتاح GEMINI_API_KEY مطلوب. الرجاء تعيينه في ملف .env.local",
      { code: "MISSING_API_KEY" }
    );
  }

  if (!geminiClient || apiKey) {
    geminiClient = new GoogleGenAI({ apiKey: resolvedKey });
  }

  return geminiClient;
};

export const resetGeminiClientForTests = (): void => {
  geminiClient = null;
};

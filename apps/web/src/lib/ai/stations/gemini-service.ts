import "server-only";
import { GoogleGenAI, type GenerateContentConfig } from "@google/genai";

import { getApiKey } from "../../../env";
import { logger } from "../utils/logger";

export enum GeminiModel {
  PRO = "gemini-2.5-pro",
  FLASH = "gemini-2.5-flash",
  FLASH_LITE = "gemini-2.5-flash-lite",
}

export interface GeminiConfig {
  apiKey: string;
  defaultModel: GeminiModel;
  maxRetries: number;
  timeout: number;
  fallbackModel?: GeminiModel;
  enableCaching?: boolean;
  enableRateLimiting?: boolean;
  requestsPerMinute?: number;
}

export interface GeminiRequest<T> {
  prompt: string;
  model?: GeminiModel;
  context?: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  validator?: (value: unknown) => value is T;
  allowPartial?: boolean;
  onPartialFallback?: (value: unknown) => T;
  stopSequences?: string[];
  topP?: number;
  topK?: number;
}

export interface GeminiResponse<T> {
  model: GeminiModel;
  content: T;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata: {
    timestamp: Date;
    latency: number;
    cached: boolean;
    retryCount: number;
  };
}

interface FallbackRequestContext<T> {
  request: GeminiRequest<T>;
  fallbackModel: GeminiModel;
  primaryModel: GeminiModel;
  cacheKey: string;
  retryCount: number;
  attempt: number;
}

interface CacheEntry<T> {
  response: GeminiResponse<T>;
  timestamp: number;
  expiresAt: number;
}

interface RateLimitState {
  requests: number[];
  lastReset: number;
}

export class GeminiService {
  private ai: GoogleGenAI;
  private config: GeminiConfig;
  private cache: Map<string, CacheEntry<unknown>>;
  private rateLimitState: RateLimitState;
  private readonly CACHE_TTL = 3600000;
  private readonly RATE_LIMIT_WINDOW = 60000;

  constructor(config: GeminiConfig) {
    this.config = {
      ...config,
      enableCaching: config.enableCaching ?? true,
      enableRateLimiting: config.enableRateLimiting ?? true,
      requestsPerMinute: config.requestsPerMinute ?? 60,
    };

    this.ai = new GoogleGenAI({ apiKey: config.apiKey });
    this.cache = new Map();
    this.rateLimitState = {
      requests: [],
      lastReset: Date.now(),
    };

    this.validateModels();
    this.startCacheCleanup();
  }

  private validateModels(): void {
    const allowedModels = Object.values(GeminiModel);
    if (!allowedModels.includes(this.config.defaultModel)) {
      throw new Error(
        `Invalid model: ${this.config.defaultModel}. ` +
          `Only ${allowedModels.join(", ")} are allowed.`
      );
    }

    if (
      this.config.fallbackModel &&
      !allowedModels.includes(this.config.fallbackModel)
    ) {
      throw new Error(
        `Invalid fallback model: ${this.config.fallbackModel}. ` +
          `Only ${allowedModels.join(", ")} are allowed.`
      );
    }
  }

  async generate<T>(request: GeminiRequest<T>): Promise<GeminiResponse<T>> {
    this.validateModels();

    if (this.config.enableRateLimiting) {
      await this.enforceRateLimit();
    }

    const cacheKey = this.generateCacheKey(request);

    if (this.config.enableCaching) {
      const cached = this.getFromCache<T>(cacheKey, request);
      if (cached) {
        logger.info("[GeminiService] Returning cached response", { cacheKey });
        return cached;
      }
    }

    const primaryModel = request.model ?? this.config.defaultModel;
    let retryCount = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        const response = await this.performRequest<T>(
          {
            ...request,
            model: primaryModel,
          },
          attempt
        );

        response.metadata.retryCount = retryCount;

        if (this.config.enableCaching) {
          this.saveToCache(cacheKey, response);
        }

        return response;
      } catch (primaryError) {
        retryCount++;

        if (attempt === this.config.maxRetries) {
          const fallbackModel = this.config.fallbackModel;
          if (fallbackModel && fallbackModel !== primaryModel) {
            return this.performFallbackRequest({
              request,
              fallbackModel,
              primaryModel,
              cacheKey,
              retryCount,
              attempt,
            });
          }

          return this.handleError<T>(primaryError, {
            ...request,
            model: primaryModel,
          });
        }

        const backoffDelay = Math.min(1000 * Math.pow(2, attempt), 30000);
        logger.warn(
          `[GeminiService] Request failed. Retrying in ${backoffDelay}ms`,
          {
            attempt: attempt + 1,
            maxRetries: this.config.maxRetries,
            error:
              primaryError instanceof Error ? primaryError.message : "Unknown",
          }
        );

        await this.delay(backoffDelay);
      }
    }

    throw new Error("Unexpected: exceeded retry loop without resolution");
  }

  private async performFallbackRequest<T>({
    request,
    fallbackModel,
    primaryModel,
    cacheKey,
    retryCount,
    attempt,
  }: FallbackRequestContext<T>): Promise<GeminiResponse<T>> {
    logger.warn(
      "[GeminiService] Primary model exhausted retries. Trying fallback model.",
      {
        primaryModel,
        fallbackModel,
        attempt,
      }
    );

    try {
      const fallbackResponse = await this.performRequest<T>(
        {
          ...request,
          model: fallbackModel,
        },
        0
      );

      fallbackResponse.metadata.retryCount = retryCount;

      if (this.config.enableCaching) {
        this.saveToCache(cacheKey, fallbackResponse);
      }

      return fallbackResponse;
    } catch (fallbackError) {
      return this.handleError<T>(fallbackError, {
        ...request,
        model: fallbackModel,
      });
    }
  }

  private async performRequest<T>(
    request: GeminiRequest<T>,
    attemptNumber: number
  ): Promise<GeminiResponse<T>> {
    const startTime = Date.now();
    const modelName = request.model ?? this.config.defaultModel;

    const systemPart = request.systemInstruction
      ? `System Instructions: ${request.systemInstruction}\n\n`
      : "";

    const contextPart = request.context
      ? `Context: ${request.context}\n\n`
      : "";

    const fullPrompt = `${systemPart}${contextPart}${request.prompt}`;

    const finalConfig: GenerateContentConfig = {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 8192,
      topP: request.topP ?? 0.95,
      topK: request.topK ?? 40,
    };

    if (request.stopSequences && request.stopSequences.length > 0) {
      finalConfig.stopSequences = request.stopSequences;
    }

    logger.info(`[GeminiService] Generating content with model ${modelName}`, {
      promptLength: fullPrompt.length,
      temperature: finalConfig.temperature,
      maxTokens: finalConfig.maxOutputTokens,
      attemptNumber,
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Request timeout")),
        this.config.timeout
      );
    });

    const requestPromise = this.ai.models.generateContent({
      model: modelName,
      contents: fullPrompt,
      config: finalConfig,
    });

    const result = await Promise.race([requestPromise, timeoutPromise]);

    const text = result.text ?? "";
    const latency = Date.now() - startTime;

    const usage = this.estimateTokenUsage(fullPrompt, text);

    logger.info("[GeminiService] Content generated successfully", {
      model: modelName,
      latency,
      outputTokens: usage.completionTokens,
      attemptNumber,
    });

    return {
      model: modelName,
      content: this.parseResponse<T>(text, request),
      usage,
      metadata: {
        timestamp: new Date(),
        latency,
        cached: false,
        retryCount: 0,
      },
    };
  }

  private parseResponse<T>(responseText: string, request: GeminiRequest<T>): T {
    const { validator, allowPartial, onPartialFallback } = request;

    if (validator) {
      const rawData = { raw: responseText };
      if (validator(rawData)) {
        return rawData;
      }

      if (allowPartial && onPartialFallback) {
        const partial = onPartialFallback(rawData);
        if (partial !== undefined) {
          logger.info("[GeminiService] Using partial fallback for response");
          return partial;
        }
      }

      logger.error("[GeminiService] Response failed validation");
      throw new Error("Gemini response failed validation");
    }

    return { raw: responseText } as T;
  }

  private handleError<T>(error: unknown, request: GeminiRequest<T>): never {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error(
      `[GeminiService] Failed to generate content with model ${request.model}`,
      {
        error: message,
      }
    );
    throw error instanceof Error ? error : new Error(message);
  }

  private generateCacheKey(request: GeminiRequest<unknown>): string {
    const model = request.model ?? this.config.defaultModel;
    const temp = request.temperature ?? 0.7;
    const maxTokens = request.maxTokens ?? 8192;

    const keyData = {
      model,
      prompt: request.prompt.substring(0, 500),
      context: request.context?.substring(0, 200),
      systemInstruction: request.systemInstruction?.substring(0, 200),
      temp,
      maxTokens,
    };

    return JSON.stringify(keyData);
  }

  private getFromCache<T>(
    cacheKey: string,
    request: GeminiRequest<T>
  ): GeminiResponse<T> | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(cacheKey);
      return null;
    }

    if (request.validator && !request.validator(entry.response.content)) {
      this.cache.delete(cacheKey);
      return null;
    }

    const typedResponse = entry.response as GeminiResponse<T>;
    const response = { ...typedResponse };
    response.metadata = { ...response.metadata, cached: true };
    return response;
  }

  private saveToCache<T>(cacheKey: string, response: GeminiResponse<T>): void {
    const entry: CacheEntry<T> = {
      response: { ...response },
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
    };
    this.cache.set(cacheKey, entry);
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        if (now > entry.expiresAt) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info(
          `[GeminiService] Cache cleanup: removed ${cleaned} expired entries`
        );
      }
    }, 300000);
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    if (now - this.rateLimitState.lastReset > this.RATE_LIMIT_WINDOW) {
      this.rateLimitState.requests = [];
      this.rateLimitState.lastReset = now;
    }

    this.rateLimitState.requests = this.rateLimitState.requests.filter(
      (timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW
    );

    if (
      this.rateLimitState.requests.length >=
      (this.config.requestsPerMinute ?? 60)
    ) {
      const oldestRequest = this.rateLimitState.requests[0];
      const waitTime = oldestRequest
        ? this.RATE_LIMIT_WINDOW - (now - oldestRequest)
        : 0;

      logger.warn(`[GeminiService] Rate limit reached. Waiting ${waitTime}ms`, {
        requestsInWindow: this.rateLimitState.requests.length,
        limit: this.config.requestsPerMinute,
      });

      await this.delay(waitTime);
      return this.enforceRateLimit();
    }

    this.rateLimitState.requests.push(now);
  }

  private estimateTokenUsage(
    prompt: string,
    completion: string
  ): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    const promptTokens = Math.ceil(prompt.length / 4);
    const completionTokens = Math.ceil(completion.length / 4);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  clearCache(): void {
    this.cache.clear();
    logger.info("[GeminiService] Cache cleared");
  }

  getCacheStats(): {
    size: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    if (this.cache.size === 0) {
      return { size: 0, oldestEntry: 0, newestEntry: 0 };
    }

    const timestamps = Array.from(this.cache.values()).map((e) => e.timestamp);
    return {
      size: this.cache.size,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps),
    };
  }

  getRateLimitStats(): {
    requestsInWindow: number;
    limit: number;
    resetAt: number;
  } {
    const now = Date.now();
    const requestsInWindow = this.rateLimitState.requests.filter(
      (timestamp) => now - timestamp < this.RATE_LIMIT_WINDOW
    ).length;

    return {
      requestsInWindow,
      limit: this.config.requestsPerMinute ?? 60,
      resetAt: this.rateLimitState.lastReset + this.RATE_LIMIT_WINDOW,
    };
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.generate({
        prompt: 'Test connection. Reply with "OK".',
        temperature: 0.1,
        maxTokens: 10,
      });
      logger.info("[GeminiService] Connection test successful");
      return true;
    } catch (error) {
      logger.error("[GeminiService] Connection test failed:", error);
      return false;
    }
  }

  getConfig(): Readonly<GeminiConfig> {
    return { ...this.config };
  }

  updateConfig(updates: Partial<GeminiConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateModels();
    logger.info("[GeminiService] Configuration updated", updates);
  }
}

export function createGeminiService(config: GeminiConfig): GeminiService {
  return new GeminiService(config);
}

export function createProductionGeminiService(apiKey: string): GeminiService {
  return new GeminiService({
    apiKey,
    defaultModel: GeminiModel.PRO,
    fallbackModel: GeminiModel.FLASH,
    maxRetries: 5,
    timeout: 180_000,
    enableCaching: true,
    enableRateLimiting: true,
    requestsPerMinute: 50,
  });
}

export function createDevelopmentGeminiService(apiKey: string): GeminiService {
  return new GeminiService({
    apiKey,
    defaultModel: GeminiModel.FLASH,
    fallbackModel: GeminiModel.FLASH_LITE,
    maxRetries: 2,
    timeout: 60_000,
    enableCaching: false,
    enableRateLimiting: false,
    requestsPerMinute: 100,
  });
}

// Singleton instance for use in BaseStation and other core modules
let geminiServiceSingleton: GeminiService | null = null;

/**
 * Get or create the singleton GeminiService instance
 * Uses environment variables to determine the API key and configuration
 */
export function getGeminiService(config?: GeminiConfig): GeminiService {
  if (!geminiServiceSingleton) {
    if (config) {
      geminiServiceSingleton = new GeminiService(config);
    } else {
      // Try to get API key from environment (server-side only)
      let apiKey: string;
      try {
        apiKey = getApiKey();
      } catch {
        // Fallback: try to get from process.env directly
        apiKey =
          process.env["GEMINI_API_KEY_PROD"] ??
          process.env["GEMINI_API_KEY_STAGING"] ??
          "";
      }

      if (!apiKey) {
        throw new Error(
          "GeminiService requires a config object or GEMINI_API_KEY environment variable"
        );
      }

      // Determine environment and create appropriate service
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        geminiServiceSingleton = createProductionGeminiService(apiKey);
      } else {
        geminiServiceSingleton = createDevelopmentGeminiService(apiKey);
      }
    }
  }
  return geminiServiceSingleton;
}

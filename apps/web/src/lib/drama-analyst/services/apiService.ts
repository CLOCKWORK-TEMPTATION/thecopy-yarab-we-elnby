import { AIRequest, AIResponse, Result } from "../core/types";

import { geminiService } from "./geminiService";
import { log } from "./loggerService";

// =====================================================
// Unified API Service
// =====================================================

interface APIServiceConfig {
  useBackend: boolean;
  fallbackToDirect: boolean;
  healthCheckInterval: number;
}

class APIService {
  private config: APIServiceConfig;
  private backendHealthy = false;

  constructor() {
    this.config = {
      useBackend: false, // Always use direct API for local development
      fallbackToDirect: true,
      healthCheckInterval: 30000, // 30 seconds
    };

    // Initial health check
    this.checkBackendHealth();
  }

  private checkBackendHealth(): void {
    // Skip health check for local development
    this.backendHealthy = false;
  }

  async callModel(req: AIRequest): Promise<Result<AIResponse>> {
    // Always use direct Gemini API
    log.info("🔄 Using direct Gemini API...", null, "APIService");
    try {
      const geminiResponse = await geminiService.analyze(req);
      return { ok: true, value: geminiResponse };
    } catch (error: unknown) {
      log.error("❌ Gemini API call failed", error, "APIService");
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : "Gemini API call failed";
      return {
        ok: false,
        error: {
          code: "GEMINI_API_ERROR",
          message,
          cause: error,
        },
      };
    }
  }

  getConfig(): APIServiceConfig {
    return { ...this.config };
  }

  isBackendHealthy(): boolean {
    return this.backendHealthy;
  }
}

// Singleton instance
const apiService = new APIService();

// =====================================================
// Public API
// =====================================================

export async function callModel(req: AIRequest): Promise<Result<AIResponse>> {
  return apiService.callModel(req);
}

export function getAPIConfig() {
  return apiService.getConfig();
}

export function isBackendHealthy() {
  return apiService.isBackendHealthy();
}

export { APIService };

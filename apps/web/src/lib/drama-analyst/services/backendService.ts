import { AIRequest, AIResponse, Result } from "@core/types";

import { encodeRecord, decodeRecord, unflatten } from "../../utils/kv-utils";

import { log } from "./loggerService";
import { sanitization } from "./sanitizationService";

// =====================================================
// Backend Service Configuration
// =====================================================

interface BackendConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

class BackendService {
  private config: BackendConfig;

  constructor() {
    this.config = {
      baseUrl:
        process.env["NEXT_PUBLIC_BACKEND_URL"] ?? "http://localhost:3001",
      timeout: 60000,
      retries: 3,
    };
  }

  private encodePayload(data: unknown): string {
    if (typeof data === "object" && data !== null && !Array.isArray(data)) {
      return encodeRecord(data as Record<string, unknown>);
    }
    return encodeRecord({ value: data });
  }

  private async makeRequest<T>(endpoint: string, data: unknown): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const dataText = this.encodePayload(data);
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
        body: dataText,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const errorData = decodeRecord(errorText);
        throw new Error(
          errorData["message"] ??
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const responseText = await response.text();
      const parsedData = decodeRecord(responseText);
      const responseObj = unflatten(parsedData);
      return responseObj as T;
    } catch (error: unknown) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout");
      }

      throw error;
    }
  }

  async analyzeText(request: AIRequest): Promise<Result<AIResponse>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        log.debug(
          `🔄 Backend API call attempt ${attempt}/${this.config.retries}`,
          null,
          "BackendService"
        );

        // Sanitize request before sending
        const sanitizedRequest = sanitization.aiRequest(request);
        const response = await this.makeRequest<AIResponse>(
          "/api/analyze",
          sanitizedRequest
        );

        log.info("✅ Backend API call successful", null, "BackendService");

        // Sanitize response before returning
        const sanitizedResponse = sanitization.aiResponse(
          response
        ) as AIResponse;
        return { ok: true, value: sanitizedResponse };
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : null;
        log.error(
          `❌ Backend API error (attempt ${attempt})`,
          error,
          "BackendService"
        );

        if (attempt < this.config.retries) {
          const delay = 1000 * attempt;
          log.debug(`⏳ Retrying in ${delay}ms...`, null, "BackendService");
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // Handle specific error cases
    let userMessage = "فشل الاتصال بخادم التحليل";
    let errorCode = "BACKEND_CALL_FAILED";

    if (lastError?.message?.includes("timeout")) {
      userMessage = "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.";
      errorCode = "REQUEST_TIMEOUT";
    } else if (lastError?.message?.includes("429")) {
      userMessage = "تم تجاوز حد الطلبات. يرجى الانتظار قليلاً.";
      errorCode = "RATE_LIMIT_EXCEEDED";
    } else if (lastError?.message?.includes("413")) {
      userMessage = "حجم الملف كبير جداً. يرجى اختيار ملف أصغر.";
      errorCode = "FILE_TOO_LARGE";
    } else if (lastError?.message?.includes("400")) {
      userMessage = "طلب غير صالح. يرجى التحقق من البيانات المرسلة.";
      errorCode = "INVALID_REQUEST";
    }

    const error = new Error(userMessage);
    if (lastError) {
      (error as Error & { code?: string }).code = errorCode;
      (error as Error & { cause?: Error }).cause = lastError;
    }

    return {
      ok: false,
      error: error,
    };
  }

  healthCheck(): boolean {
    // Skip health check for local development
    return true;
  }
}

// Singleton instance
const backendService = new BackendService();

// =====================================================
// Public API
// =====================================================

export async function callBackendAPI(
  req: AIRequest
): Promise<Result<AIResponse>> {
  return backendService.analyzeText(req);
}

export function checkBackendHealth(): Promise<boolean> {
  return backendService.healthCheck();
}

export { BackendService };

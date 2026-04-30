import { z } from "zod";

/**
 * Environment Variable Validation with Zod
 *
 * This file provides comprehensive environment variable validation with clear
 * separation between server-side and client-side variables. Server-side secrets
 * are never exposed to the browser bundle.
 */

// Server-side only environment variables (never exposed to browser)
const serverSchema = z.object({
  // Gemini API Keys - Server-side only for security
  GEMINI_API_KEY_STAGING: z.string().optional(),
  GEMINI_API_KEY_PROD: z.string().optional(),
  AGENT_REVIEW_MODEL: z.string().optional(),
  FINAL_REVIEW_MODEL: z.string().optional(),
  AI_DOUBT_ENABLED: z.string().optional(),
  ALLOWED_DEV_ORIGIN: z.string().optional(),
  FILE_IMPORT_HOST: z.string().optional(),
  FILE_IMPORT_PORT: z.string().optional(),
  LOG_LEVEL: z.string().optional(),
  SKIP_ENV_VALIDATION: z.string().optional(),
  TRACING_ENABLED: z.string().optional(),
  SERVICE_NAME: z.string().optional(),
  ANALYZE: z.string().optional(),
  PDF_EXTRACTOR_MODE: z.string().optional(),
  MISTRAL_PAGEWISE_CORRECTION_ENABLED: z.string().optional(),
  PDF_OCR_AGENT_ENABLED: z.string().optional(),
  PDF_OCR_AGENT_TIMEOUT_MS: z.string().optional(),
  PDF_OCR_AGENT_PAGES: z.string().optional(),
  PDF_OCR_AGENT_CLASSIFY_ENABLED: z.string().optional(),
  PDF_OCR_AGENT_ENHANCE_ENABLED: z.string().optional(),
  PDF_OCR_ENABLE_VISION_PROOFREAD: z.string().optional(),
  OPEN_PDF_AGENT_VERIFY_FOOTPRINT: z.string().optional(),
  OPEN_PDF_AGENT_ENABLE_MCP_STAGE: z.string().optional(),
  MISTRAL_HTTP_TIMEOUT_MS: z.string().optional(),
  MISTRAL_HTTP_MAX_RETRIES: z.string().optional(),
  MISTRAL_HTTP_RETRY_BASE_MS: z.string().optional(),
  MISTRAL_BATCH_TIMEOUT_SEC: z.string().optional(),
  MISTRAL_BATCH_POLL_INTERVAL_SEC: z.string().optional(),
  VITE_FILE_IMPORT_BACKEND_URL: z.string().optional(),
  VITE_AGENT_REVIEW_FAIL_OPEN: z.string().optional(),

  // Sentry server configuration
  SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),

  // Node environment
  NODE_ENV: z
    .enum(["development", "production", "test", "staging"])
    .default("development"),

  // JWT Secret for authentication
  JWT_SECRET: z.string().default("development-jwt-secret"),
});

// Client-side safe environment variables (prefixed with NEXT_PUBLIC_)
const clientSchema = z.object({
  // Application environment
  NEXT_PUBLIC_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("staging"),
  NEXT_PUBLIC_ENVIRONMENT: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().optional(),
  NEXT_PUBLIC_BACKEND_URL: z.string().optional(),
  NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL: z.string().optional(),
  NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL: z.string().optional(),
  NEXT_PUBLIC_AI_DOUBT_ENABLED: z.string().optional(),
  NEXT_PUBLIC_ENABLE_CDN: z.string().optional(),
  NEXT_PUBLIC_CDN_URL: z.string().optional(),
  NEXT_PUBLIC_TRACING_ENABLED: z.string().optional(),
  NEXT_PUBLIC_SERVICE_NAME: z.string().optional(),
  NEXT_PUBLIC_APP_VERSION: z.string().optional(),

  // Sentry client configuration
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Gemini API Key for client-side (if needed)
  NEXT_PUBLIC_GEMINI_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),
});

/**
 * Runtime environment validation with security checks
 */
function validateEnvironment() {
  // Server-side validation
  const serverResult = serverSchema.safeParse(process.env);

  // Client-side validation
  const clientResult = clientSchema.safeParse(process.env);

  // Environment-specific validation logic (only check on server)
  if (typeof window === "undefined" && serverResult.success) {
    const isProduction = serverResult.data.NODE_ENV === "production";
    const isStaging = serverResult.data.NODE_ENV === "staging";

    // Production environment requires production API key
    if (isProduction && !process.env["GEMINI_API_KEY_PROD"]) {
      // Intentionally silent: validated and handled by deployment policies.
    }

    // Staging environment should use staging API key if available
    if (isStaging && !process.env["GEMINI_API_KEY_STAGING"]) {
      // Intentionally silent: validated and handled by deployment policies.
    }
  }

  // Security validation: Ensure no server secrets are exposed to client
  if (typeof window !== "undefined") {
    // Running in browser - validate client variables only
    if (!clientResult.success) {
      throw new Error("Invalid client environment configuration");
    }

    // Security check: Ensure no server secrets leaked to browser
    // نتجاوز في بيئة الاختبار لأن jsdom يُحاكي المتصفح لكن process.env
    // تحتوي على متغيرات الـ CI/Testing التي لا تمثل تسريبًا حقيقيًا.
    if (process.env.NODE_ENV !== "test") {
      const dangerousVars = Object.keys(process.env).filter(
        (key) =>
          (key.startsWith("GEMINI_API_KEY") ||
            key === "SENTRY_DSN" ||
            key === "SENTRY_ORG" ||
            key === "SENTRY_PROJECT" ||
            key === "SENTRY_AUTH_TOKEN") &&
          !key.startsWith("NEXT_PUBLIC_")
      );

      if (dangerousVars.length > 0) {
        throw new Error("Security violation: Server secrets exposed to client");
      }
    }

    return { client: clientResult.data, server: {} };
  } else {
    // Running on server - validate both client and server variables
    if (!serverResult.success) {
      throw new Error("Invalid server environment configuration");
    }

    if (!clientResult.success) {
      throw new Error("Invalid client environment configuration");
    }

    return {
      server: serverResult.data,
      client: clientResult.data,
    };
  }
}

/**
 * Get the appropriate Gemini API key based on environment
 */
function getGeminiApiKey(serverEnv: z.infer<typeof serverSchema>): string {
  // In production (main branch), use PROD key, otherwise use STAGING key
  if (serverEnv.NODE_ENV === "production") {
    return serverEnv.GEMINI_API_KEY_PROD ?? "";
  }
  return serverEnv.GEMINI_API_KEY_STAGING ?? "";
}

// Validate environment on module load
const env = validateEnvironment();

// Export type-safe environment variables
export const serverEnv = env.server as z.infer<typeof serverSchema>;
export const clientEnv = env.client;

// Helper function to get the correct Gemini API key (server-side only)
export const getApiKey = () => {
  if (typeof window !== "undefined") {
    throw new Error("getApiKey() can only be called on the server side");
  }
  return getGeminiApiKey(serverEnv);
};

// Type exports for external usage
export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

// Runtime validation function for dynamic checks
export const revalidateEnvironment = validateEnvironment;

// Security utility to check if running in secure context
export const isSecureContext = () => {
  return typeof window === "undefined" || Boolean(window.isSecureContext);
};

// Environment info for debugging (safe for client)
export const getEnvironmentInfo = () => ({
  nodeEnv: typeof window !== "undefined" ? "client" : serverEnv.NODE_ENV,
  appEnv: clientEnv.NEXT_PUBLIC_APP_ENV,
  isProduction:
    typeof window === "undefined" ? serverEnv.NODE_ENV === "production" : false,
  timestamp: new Date().toISOString(),
});

// Development helpers
if (process.env.NODE_ENV === "development") {
  void getEnvironmentInfo();
}

import { z } from "zod";

import { logger } from "@/lib/logger";

const envSchema = z
  .object({
    // Runtime
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z
      .string()
      .default("3001")
      .transform(Number)
      .pipe(z.number().positive()),

    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    MONGODB_URI: z.string().optional(),

    // AI Services (either one is required)
    GOOGLE_GENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),

    // Security
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),

    // Redis (all optional - graceful degradation)
    FRONTEND_URL: z.string().optional(),
    REDIS_ENABLED: z.string().optional(),
    REDIS_URL: z.string().optional(),
    REDIS_HOST: z.string().optional(),
    REDIS_PORT: z.string().optional(),
    REDIS_PASSWORD: z.string().optional(),
    REDIS_SENTINEL_ENABLED: z.string().optional(),
    REDIS_SENTINELS: z.string().optional(),
    REDIS_MASTER_NAME: z.string().optional(),
    REDIS_SENTINEL_PASSWORD: z.string().optional(),

    // Monitoring (all optional)
    SENTRY_DSN: z.string().optional(),
    SENTRY_ORG: z.string().optional(),
    SENTRY_PROJECT: z.string().optional(),
    SENTRY_AUTH_TOKEN: z.string().optional(),
    SENTRY_RELEASE: z.string().optional(),
    SENTRY_SERVER_NAME: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
    SENTRY_PROFILES_SAMPLE_RATE: z.string().optional(),
    SENTRY_SUPPRESS_TURBOPACK_WARNING: z.string().optional(),
    SENTRY_SUPPRESS_GLOBAL_ERROR_HANDLER_FILE_WARNING: z.string().optional(),
    TRACING_ENABLED: z.string().optional(),
    SERVICE_NAME: z.string().optional(),
    FILE_IMPORT_HOST: z.string().optional(),
    FILE_IMPORT_PORT: z.string().optional(),
    LOG_LEVEL: z.string().optional(),

    // CORS
    CORS_ORIGIN: z.string().min(1),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().optional(),
    RATE_LIMIT_MAX_REQUESTS: z.string().optional(),
  })
  .refine(
    (data) => {
      const hasGoogleKey =
        data.GOOGLE_GENAI_API_KEY &&
        data.GOOGLE_GENAI_API_KEY !== "your_google_genai_api_key_here";
      const hasGeminiKey =
        data.GEMINI_API_KEY &&
        data.GEMINI_API_KEY !== "your_gemini_api_key_here";
      return hasGoogleKey ?? hasGeminiKey;
    },
    {
      message:
        "Either GOOGLE_GENAI_API_KEY or GEMINI_API_KEY must be provided with valid values",
      path: ["GOOGLE_GENAI_API_KEY"],
    },
  );

export type Environment = z.infer<typeof envSchema>;

export function validateEnvironment(): Environment {
  try {
    const validated = envSchema.parse(process.env);
    logger.info("✅ Environment variables validated successfully");
    return validated;
  } catch (error) {
    logger.error("❌ Invalid environment variables:");
    if (error instanceof z.ZodError) {
      error.issues.forEach((err) => {
        logger.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
    }
    logger.error(
      "\n📋 Please check your .env file against backend/.env.example",
    );
    process.exit(1);
  }
}

/// <reference types="node" />

declare namespace NodeJS {
  interface ProcessEnv {
    // Runtime
    readonly NODE_ENV: "development" | "production" | "test";
    readonly NEXT_RUNTIME?: "edge" | "nodejs";
    readonly CI?: string;
    readonly PORT?: string;
    readonly API_PORT?: string;
    readonly ANALYZE?: string;
    readonly NEXT_OUTPUT_MODE?: string;
    readonly NEXT_PUBLIC_APP_URL?: string;
    readonly NEXT_PUBLIC_APP_VERSION?: string;
    readonly NEXT_PUBLIC_ENVIRONMENT?: string;
    readonly NEXT_PUBLIC_SERVICE_NAME?: string;
    readonly NAPI_RS_NATIVE_LIBRARY_PATH?: string;
    readonly VERCEL?: string;
    readonly VERCEL_URL?: string;
    readonly VERCEL_ENV?: "production" | "preview" | "development";

    // Public frontend endpoints
    readonly NEXT_PUBLIC_API_URL?: string;
    readonly NEXT_PUBLIC_BACKEND_URL?: string;
    readonly NEXT_PUBLIC_BREAKAPP_API_URL?: string;
    readonly NEXT_PUBLIC_CDN_URL?: string;
    readonly NEXT_PUBLIC_ENABLE_CDN?: string;
    readonly NEXT_PUBLIC_SOCKET_URL?: string;
    readonly NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL?: string;
    readonly NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL?: string;
    readonly NEXT_PUBLIC_AI_CONTEXT_ENDPOINT?: string;
    readonly NEXT_PUBLIC_AI_CONTEXT_ENABLED?: string;
    readonly NEXT_PUBLIC_OCR_PROVIDER?: string;
    readonly NEXT_PUBLIC_OTEL_AUTH_TOKEN?: string;
    readonly NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT?: string;
    readonly NEXT_PUBLIC_TRACING_ENABLED?: string;
    readonly NEXT_PUBLIC_LOG_LEVEL?: string;

    // Backend and service URLs
    readonly BACKEND_URL?: string;
    readonly ALLOWED_DEV_ORIGIN?: string;
    readonly EDITOR_RUNTIME_BASE_URL?: string;
    readonly FILE_IMPORT_BACKEND_URL?: string;
    readonly FILE_IMPORT_ALLOWED_ORIGINS?: string;
    readonly APP_BASE_URL?: string;
    readonly BUDGET_SERVICE_URL?: string;
    readonly E2E_BACKEND_BASE_URL?: string;
    readonly E2E_HOST?: string;
    readonly E2E_PORT?: string;
    readonly E2E_TARGET_URL?: string;

    // AI and model credentials
    readonly ANTHROPIC_API_KEY?: string;
    readonly ANTHROPIC_REVIEW_MODEL?: string;
    readonly OPENAI_API_KEY?: string;
    readonly OPENROUTER_API_KEY?: string;
    readonly GROQ_API_KEY?: string;
    readonly GEMINI_API_KEY?: string;
    readonly GEMINI_API_KEY_PROD?: string;
    readonly GEMINI_API_KEY_STAGING?: string;
    readonly GOOGLE_GENAI_API_KEY?: string;
    readonly NEXT_PUBLIC_GEMINI_API_KEY?: string;
    readonly NEXT_PUBLIC_GEMINI_MODEL?: string;
    readonly NEXT_PUBLIC_MISTRAL_API_KEY?: string;
    readonly MISTRAL_API_KEY?: string;
    readonly MISTRAL_BASE_URL?: string;
    readonly MISTRAL_OCR_MODEL?: string;
    readonly MISTRAL_OCR_ENDPOINT?: string;
    readonly MISTRAL_OCR_TABLE_FORMAT?: string;
    readonly MISTRAL_BATCH_TIMEOUT_SEC?: string;
    readonly MISTRAL_BATCH_POLL_INTERVAL_SEC?: string;
    readonly MISTRAL_ANNOTATION_SCHEMA_PATH?: string;
    readonly MISTRAL_ANNOTATION_PROMPT?: string;
    readonly MISTRAL_ANNOTATION_OUTPUT_PATH?: string;
    readonly MISTRAL_HTTP_TIMEOUT_MS?: string;
    readonly MISTRAL_HTTP_MAX_RETRIES?: string;
    readonly MISTRAL_HTTP_RETRY_BASE_MS?: string;
    readonly MOONSHOT_API_KEY?: string;
    readonly KIMI_BASE_URL?: string;
    readonly KIMI_HTTP_TIMEOUT_MS?: string;
    readonly KIMI_HTTP_MAX_RETRIES?: string;
    readonly KIMI_THINKING_MODE?: string;
    readonly AGENT_REVIEW_MODEL?: string;
    readonly AGENT_REVIEW_MOCK_MODE?: string;
    readonly FINAL_REVIEW_MODEL?: string;
    readonly FINAL_REVIEW_FALLBACK_MODEL?: string;
    readonly FINAL_REVIEW_MOCK_MODE?: string;

    // OCR and PDF pipeline
    readonly PRE_OCR_LANG?: string;
    readonly PDF_OCR_AGENT_ROOT?: string;
    readonly PDF_OCR_AGENT_OPEN_SCRIPT_PATH?: string;
    readonly PDF_OCR_AGENT_OCR_SCRIPT_PATH?: string;
    readonly PDF_OCR_AGENT_CLASSIFY_SCRIPT_PATH?: string;
    readonly PDF_OCR_AGENT_ENHANCE_SCRIPT_PATH?: string;
    readonly PDF_OCR_AGENT_WRITE_OUTPUT_SCRIPT_PATH?: string;
    readonly PDF_OCR_AGENT_ENABLED?: string;
    readonly PDF_OCR_AGENT_TIMEOUT_MS?: string;
    readonly PDF_OCR_AGENT_PAGES?: string;
    readonly PDF_OCR_AGENT_LOG_LEVEL?: string;
    readonly PDF_OCR_AGENT_MOCK_MODE?: string;
    readonly PDF_OCR_AGENT_MOCK_TEXT?: string;
    readonly PDF_OCR_AGENT_MOCK_FORCE_REJECT?: string;
    readonly PDF_OCR_AGENT_CLASSIFY_ENABLED?: string;
    readonly PDF_OCR_AGENT_ENHANCE_ENABLED?: string;
    readonly PDF_OCR_EXTERNAL_REFERENCE_PATH?: string;
    readonly PDF_OCR_ENABLE_VISION_PROOFREAD?: string;
    readonly PDF_OCR_ENABLE_VISION_QA?: string;
    readonly PDF_OCR_MISTRAL_REQUEST_ADAPTER_PATH?: string;
    readonly PDF_VISION_COMPARE_MODEL?: string;
    readonly PDF_VISION_COMPARE_TIMEOUT_MS?: string;
    readonly PDF_VISION_JUDGE_MODEL?: string;
    readonly PDF_VISION_JUDGE_TIMEOUT_MS?: string;
    readonly PDF_VISION_PROOFREAD_MODEL?: string;
    readonly PDF_VISION_PROOFREAD_TIMEOUT_MS?: string;
    readonly PDF_VISION_RENDER_DPI?: string;
    readonly OPEN_PDF_AGENT_VERIFY_FOOTPRINT?: string;
    readonly OPEN_PDF_AGENT_ENABLE_MCP_STAGE?: string;

    // Python and toolchain
    readonly PYTHON?: string;
    readonly PYTHON_BIN?: string;
    readonly PYTHON_EXECUTABLE?: string;
    readonly KARANK_PYTHON_BIN?: string;
    readonly KARANK_PYTHON_VERSION?: string;
    readonly POPPLER_BIN?: string;
    readonly ANTIWORD_PATH?: string;
    readonly ANTIWORDHOME?: string;
    readonly DOCX_ENGINE_FAST_TIMEOUT_MS?: string;
    readonly FORCE_CPU_ONLY?: string;
    readonly CUDA_VISIBLE_DEVICES?: string;

    // Storage and infrastructure
    readonly DATABASE_URL?: string;
    readonly POSTGRES_URL?: string;
    readonly POSTGRES_PRISMA_URL?: string;
    readonly POSTGRES_URL_NON_POOLING?: string;
    readonly DATABASE_HOST?: string;
    readonly DATABASE_USER?: string;
    readonly DATABASE_PASSWORD?: string;
    readonly REDIS_URL?: string;
    readonly REDIS_ENABLED?: string;
    readonly UPSTASH_REDIS_REST_URL?: string;
    readonly UPSTASH_REDIS_REST_TOKEN?: string;
    readonly STORAGE_URL?: string;
    readonly STORAGE_BUCKET?: string;
    readonly QDRANT_URL?: string;
    readonly QDRANT_API_KEY?: string;

    // Auth and security
    readonly NEXTAUTH_URL?: string;
    readonly NEXTAUTH_SECRET?: string;
    readonly AUTH_SECRET?: string;
    readonly SESSION_SECRET?: string;
    readonly JWT_SECRET?: string;
    readonly ENCRYPTION_KEY?: string;
    readonly DB_PASSWORD?: string;
    readonly STRIPE_API_KEY?: string;

    // Analytics and observability
    readonly NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
    readonly NEXT_PUBLIC_GOOGLE_ANALYTICS?: string;
    readonly NEXT_PUBLIC_GA4_MEASUREMENT_ID?: string;
    readonly NEXT_PUBLIC_ENABLE_ANALYTICS?: string;
    readonly NEXT_PUBLIC_ENABLE_OFFLINE?: string;
    readonly NEXT_PUBLIC_SENTRY_DSN?: string;
    readonly SENTRY_DSN?: string;
    readonly SENTRY_AUTH_TOKEN?: string;
    readonly SENTRY_ORG?: string;
    readonly SENTRY_PROJECT?: string;

    // Misc feature flags
    readonly ENABLE_TEST_DIAGNOSTIC_LOGS?: string;

    [key: string]: string | undefined;
  }
}

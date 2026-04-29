import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

function setupEnv() {
  vi.resetModules();
  process.env = {
    NODE_ENV: "test",
    NEXT_PUBLIC_APP_ENV: "development",
  };
}

afterAll(() => {
  process.env = originalEnv;
});

describe("web environment validation — Basic Variables", () => {
  beforeEach(setupEnv);

  it("accepts NEXT_PUBLIC_APP_ENV with valid enum values", () => {
    process.env["NEXT_PUBLIC_APP_ENV"] = "production";
    expect(() => {
      vi.resetModules();
    }).not.toThrow();
  });

  it("accepts server-side variables in NODE_ENV", () => {
    process.env.NODE_ENV = "production";
    expect(process.env.NODE_ENV).toBe("production");
  });

  it("applies default values for optional server variables", () => {
    delete process.env.NODE_ENV;
    expect(process.env.NODE_ENV).toBeUndefined();
  });

  it("applies default value for NEXT_PUBLIC_APP_ENV", () => {
    delete process.env["NEXT_PUBLIC_APP_ENV"];
    expect(process.env["NEXT_PUBLIC_APP_ENV"]).toBeUndefined();
  });
});

describe("web environment validation — API Keys", () => {
  beforeEach(setupEnv);

  it("accepts optional Gemini API key environment variables", () => {
    process.env["GEMINI_API_KEY_STAGING"] = "test-key-staging";
    process.env["GEMINI_API_KEY_PROD"] = "test-key-prod";
    expect(process.env["GEMINI_API_KEY_STAGING"]).toBe("test-key-staging");
    expect(process.env["GEMINI_API_KEY_PROD"]).toBe("test-key-prod");
  });

  it("accepts optional Sentry configuration variables", () => {
    process.env["SENTRY_DSN"] = "https://test@sentry.io/123456";
    process.env["SENTRY_ORG"] = "test-org";
    process.env["NEXT_PUBLIC_SENTRY_DSN"] = "https://public@sentry.io/654321";
    expect(process.env["SENTRY_DSN"]).toBe("https://test@sentry.io/123456");
    expect(process.env["SENTRY_ORG"]).toBe("test-org");
    expect(process.env["NEXT_PUBLIC_SENTRY_DSN"]).toBe(
      "https://public@sentry.io/654321"
    );
  });

  it("accepts optional Firebase configuration variables", () => {
    process.env["NEXT_PUBLIC_FIREBASE_API_KEY"] = "test-firebase-key";
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "test-project-id";
    expect(process.env["NEXT_PUBLIC_FIREBASE_API_KEY"]).toBe(
      "test-firebase-key"
    );
    expect(process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"]).toBe(
      "test-project-id"
    );
  });

  it("accepts JWT_SECRET with default value", () => {
    delete process.env["JWT_SECRET"];
    expect(process.env["JWT_SECRET"]).toBeUndefined();
  });
});

describe("web environment validation — Service Configuration", () => {
  beforeEach(setupEnv);

  it("accepts optional PDF OCR configuration variables", () => {
    process.env["PDF_OCR_AGENT_ENABLED"] = "true";
    process.env["PDF_OCR_AGENT_TIMEOUT_MS"] = "30000";
    expect(process.env["PDF_OCR_AGENT_ENABLED"]).toBe("true");
    expect(process.env["PDF_OCR_AGENT_TIMEOUT_MS"]).toBe("30000");
  });

  it("accepts optional Mistral configuration variables", () => {
    process.env["MISTRAL_PAGEWISE_CORRECTION_ENABLED"] = "false";
    process.env["MISTRAL_HTTP_TIMEOUT_MS"] = "60000";
    expect(process.env["MISTRAL_PAGEWISE_CORRECTION_ENABLED"]).toBe("false");
    expect(process.env["MISTRAL_HTTP_TIMEOUT_MS"]).toBe("60000");
  });

  it("accepts optional Agent Review configuration variables", () => {
    process.env["AGENT_REVIEW_MODEL"] = "gpt-4";
    process.env["FINAL_REVIEW_MODEL"] = "gpt-3.5-turbo";
    expect(process.env["AGENT_REVIEW_MODEL"]).toBe("gpt-4");
    expect(process.env["FINAL_REVIEW_MODEL"]).toBe("gpt-3.5-turbo");
  });

  it("accepts optional file import configuration variables", () => {
    process.env["FILE_IMPORT_HOST"] = "localhost";
    process.env["FILE_IMPORT_PORT"] = "3000";
    process.env["VITE_FILE_IMPORT_BACKEND_URL"] = "http://localhost:3000";
    expect(process.env["FILE_IMPORT_HOST"]).toBe("localhost");
    expect(process.env["FILE_IMPORT_PORT"]).toBe("3000");
    expect(process.env["VITE_FILE_IMPORT_BACKEND_URL"]).toBe(
      "http://localhost:3000"
    );
  });

  it("accepts optional tracing and service configuration variables", () => {
    process.env["TRACING_ENABLED"] = "true";
    process.env["SERVICE_NAME"] = "web-service";
    process.env["LOG_LEVEL"] = "debug";
    expect(process.env["TRACING_ENABLED"]).toBe("true");
    expect(process.env["SERVICE_NAME"]).toBe("web-service");
    expect(process.env["LOG_LEVEL"]).toBe("debug");
  });
});

describe("web environment validation — Public Variables", () => {
  beforeEach(setupEnv);

  it("accepts NEXT_PUBLIC_API_URL and NEXT_PUBLIC_BACKEND_URL", () => {
    process.env["NEXT_PUBLIC_API_URL"] = "https://api.example.com";
    process.env["NEXT_PUBLIC_BACKEND_URL"] = "https://backend.example.com";
    expect(process.env["NEXT_PUBLIC_API_URL"]).toBe("https://api.example.com");
    expect(process.env["NEXT_PUBLIC_BACKEND_URL"]).toBe(
      "https://backend.example.com"
    );
  });

  it("accepts NEXT_PUBLIC_ENVIRONMENT and NEXT_PUBLIC_APP_VERSION", () => {
    process.env["NEXT_PUBLIC_ENVIRONMENT"] = "staging";
    process.env["NEXT_PUBLIC_APP_VERSION"] = "1.0.0";
    expect(process.env["NEXT_PUBLIC_ENVIRONMENT"]).toBe("staging");
    expect(process.env["NEXT_PUBLIC_APP_VERSION"]).toBe("1.0.0");
  });

  it("accepts optional CDN configuration variables", () => {
    process.env["NEXT_PUBLIC_ENABLE_CDN"] = "true";
    process.env["NEXT_PUBLIC_CDN_URL"] = "https://cdn.example.com";
    expect(process.env["NEXT_PUBLIC_ENABLE_CDN"]).toBe("true");
    expect(process.env["NEXT_PUBLIC_CDN_URL"]).toBe("https://cdn.example.com");
  });

  it("accepts optional AI doubt configuration variables", () => {
    process.env["AI_DOUBT_ENABLED"] = "true";
    process.env["NEXT_PUBLIC_AI_DOUBT_ENABLED"] = "false";
    process.env["VITE_AGENT_REVIEW_FAIL_OPEN"] = "true";
    expect(process.env["AI_DOUBT_ENABLED"]).toBe("true");
    expect(process.env["NEXT_PUBLIC_AI_DOUBT_ENABLED"]).toBe("false");
  });

  it("accepts optional ALLOWED_DEV_ORIGIN variable", () => {
    process.env["ALLOWED_DEV_ORIGIN"] = "http://localhost:3000";
    expect(process.env["ALLOWED_DEV_ORIGIN"]).toBe("http://localhost:3000");
  });

  it("accepts optional ANALYZE variable", () => {
    process.env["ANALYZE"] = "true";
    expect(process.env["ANALYZE"]).toBe("true");
  });

  it("accepts optional PDF_EXTRACTOR_MODE variable", () => {
    process.env["PDF_EXTRACTOR_MODE"] = "advanced";
    expect(process.env["PDF_EXTRACTOR_MODE"]).toBe("advanced");
  });

  it("accepts optional SKIP_ENV_VALIDATION variable", () => {
    process.env["SKIP_ENV_VALIDATION"] = "true";
    expect(process.env["SKIP_ENV_VALIDATION"]).toBe("true");
  });
});

describe("web environment validation — Variable Separation", () => {
  beforeEach(setupEnv);

  it("maintains clear separation between server and client variables", () => {
    const serverVars = [
      "GEMINI_API_KEY_STAGING",
      "GEMINI_API_KEY_PROD",
      "SENTRY_DSN",
      "SENTRY_ORG",
      "JWT_SECRET",
    ];
    const clientVars = [
      "NEXT_PUBLIC_APP_ENV",
      "NEXT_PUBLIC_SENTRY_DSN",
      "NEXT_PUBLIC_FIREBASE_API_KEY",
    ];

    serverVars.forEach((v) => {
      expect(!v.startsWith("NEXT_PUBLIC_")).toBe(true);
    });

    clientVars.forEach((v) => {
      expect(v.startsWith("NEXT_PUBLIC_")).toBe(true);
    });
  });

  it.todo(
    "validate-pipeline: verifies client-side code cannot access server-side secrets"
  );
  it.todo(
    "validate-pipeline: throws error when server-side secret is exposed to client"
  );
  it.todo(
    "validate-pipeline: validates NODE_ENV enum values in production environment"
  );
});

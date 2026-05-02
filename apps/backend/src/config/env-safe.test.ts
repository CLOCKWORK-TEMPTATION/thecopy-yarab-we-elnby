import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;
let tempDir = "";

function writeExampleFile(): string {
  tempDir = mkdtempSync(join(tmpdir(), "env-safe-"));
  const examplePath = join(tempDir, ".env.example");
  writeFileSync(
    examplePath,
    [
      "NODE_ENV=production",
      ["DATABASE_URL=postgresql://user", ":pass", "@localhost:5432/app"].join(""),
      "JWT_SECRET=change-me-to-a-secure-random-string-at-least-32-chars",
      "QDRANT_URL=http://localhost:6333",
      "PERSISTENT_MEMORY_INFRA_REQUIRED=false",
      "MEMORY_INFRA_REQUIRED=false",
    ].join("\n"),
  );
  return examplePath;
}

function mockDotenvSafe(missing: string[]): void {
  vi.doMock("dotenv-safe", () => ({
    default: {
      config: vi.fn(() => {
        if (missing.length > 0) {
          const error = new Error("missing env") as Error & {
            missing: string[];
          };
          error.missing = missing;
          throw error;
        }
        return {};
      }),
    },
  }));
}

function mockDotenvSafeMessage(message: string): void {
  vi.doMock("dotenv-safe", () => ({
    default: {
      config: vi.fn(() => {
        throw new Error(message);
      }),
    },
  }));
}

beforeEach(() => {
  vi.resetModules();
  tempDir = "";
  process.env = {
    NODE_ENV: "production",
    BACKEND_ENV_EXAMPLE_FILE: writeExampleFile(),
  };
});

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("dotenv-safe");
  process.env = originalEnv;
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("env-safe optional infrastructure keys", () => {
  it("does not fail production startup for optional persistent memory infra keys", async () => {
    mockDotenvSafe([
      "QDRANT_URL",
      "PERSISTENT_MEMORY_INFRA_REQUIRED",
      "MEMORY_INFRA_REQUIRED",
    ]);

    const { runEnvSafeCheck } = await import("./env-safe");

    expect(runEnvSafeCheck()).toMatchObject({
      ok: true,
      missing: [
        "QDRANT_URL",
        "PERSISTENT_MEMORY_INFRA_REQUIRED",
        "MEMORY_INFRA_REQUIRED",
      ],
      skipped: false,
    });
    expect(runEnvSafeCheck()).toMatchObject({
      ok: true,
      skipped: true,
      reason: "already-ran",
    });
  });

  it("still fails production startup when a blocking backend key is missing", async () => {
    mockDotenvSafe(["DATABASE_URL", "QDRANT_URL"]);

    const { runEnvSafeCheck } = await import("./env-safe");

    expect(() => runEnvSafeCheck()).toThrow(/DATABASE_URL/);
  });

  it("does not fail when NODE_ENV is absent because env.ts owns its default", async () => {
    mockDotenvSafe(["NODE_ENV"]);

    const { runEnvSafeCheck } = await import("./env-safe");

    expect(runEnvSafeCheck()).toMatchObject({
      ok: true,
      missing: ["NODE_ENV"],
      skipped: false,
    });
  });

  it("treats message-only persistent memory infra keys as optional", async () => {
    mockDotenvSafeMessage(
      "Missing environment variables: QDRANT_URL, PERSISTENT_MEMORY_INFRA_REQUIRED, MEMORY_INFRA_REQUIRED",
    );

    const { runEnvSafeCheck } = await import("./env-safe");

    expect(runEnvSafeCheck()).toMatchObject({
      ok: true,
      missing: [
        "QDRANT_URL",
        "PERSISTENT_MEMORY_INFRA_REQUIRED",
        "MEMORY_INFRA_REQUIRED",
      ],
      skipped: false,
    });
  });
});

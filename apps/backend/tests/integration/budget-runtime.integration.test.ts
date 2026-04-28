import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface RuntimeServer {
  port: number;
  stateDir: string;
  stdoutChunks: string[];
  stderrChunks: string[];
  stop: () => Promise<void>;
}

interface RuntimeServerOptions {
  port: number;
  aiMode: "fallback-only" | "provider-only";
  geminiKey?: string;
}

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendDir = path.resolve(currentDir, "../..");
const distServerPath = path.join(backendDir, "dist", "server.js");

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function reserveAvailablePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(
          new Error(
            "Failed to resolve an ephemeral port for the runtime server.",
          ),
        );
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function reserveAvailablePorts(count: number): Promise<number[]> {
  const ports: number[] = [];

  while (ports.length < count) {
    const port = await reserveAvailablePort();
    if (!ports.includes(port)) {
      ports.push(port);
    }
  }

  return ports;
}

async function waitForServer(port: number): Promise<void> {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/live`);
      if (response.ok) {
        return;
      }
    } catch {
      // تعليق عربي: نستمر في المحاولة حتى يكتمل إقلاع الخادم الفعلي.
    }

    await delay(500);
  }

  throw new Error(
    `Runtime server on port ${port} did not become ready in time.`,
  );
}

function extractCookiePair(setCookieHeader: string | null): {
  cookie: string;
  token: string;
} {
  if (!setCookieHeader) {
    throw new Error(
      "Expected a CSRF cookie to be set by the app-state GET request.",
    );
  }

  const cookie = setCookieHeader.split(";")[0] ?? "";
  const token = cookie.split("=")[1] ?? "";

  if (!cookie || !token) {
    throw new Error("Failed to parse the CSRF cookie returned by the backend.");
  }

  return { cookie, token };
}

async function startRuntimeServer(
  options: RuntimeServerOptions,
): Promise<RuntimeServer> {
  const stateDir = await mkdtemp(path.join(tmpdir(), "budget-runtime-"));
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const child = spawn(process.execPath, [distServerPath], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: "development",
      PORT: String(options.port),
      DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/testdb",
      REDIS_ENABLED: "false",
      WEAVIATE_REQUIRED: "false",
      MEMORY_SYSTEM_ENABLED: "false",
      CORS_ORIGIN: "http://localhost:5100",
      APP_STATE_STORE_DIR: stateDir,
      BUDGET_AI_MODE: options.aiMode,
      GEMINI_API_KEY: options.geminiKey ?? "",
      GOOGLE_GENAI_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdoutChunks.push(String(chunk));
  });
  child.stderr.on("data", (chunk) => {
    stderrChunks.push(String(chunk));
  });

  await waitForServer(options.port);

  const stop = async () => {
    if (!child.killed) {
      child.kill("SIGTERM");
      await Promise.race([
        new Promise<void>((resolve) => {
          child.once("exit", () => resolve());
        }),
        delay(5_000).then(() => {
          if (!child.killed) {
            child.kill("SIGKILL");
          }
        }),
      ]);
    }

    await rm(stateDir, { recursive: true, force: true });
  };

  return {
    port: options.port,
    stateDir,
    stdoutChunks,
    stderrChunks,
    stop,
  };
}

describe("budget runtime integration", () => {
  let fallbackServer: RuntimeServer;
  let providerOnlyServer: RuntimeServer;

  beforeAll(async () => {
    const [fallbackPort, providerPort] = await reserveAvailablePorts(2);

    [fallbackServer, providerOnlyServer] = await Promise.all([
      startRuntimeServer({
        port: fallbackPort!,
        aiMode: "fallback-only",
        geminiKey: "",
      }),
      startRuntimeServer({
        port: providerPort!,
        aiMode: "provider-only",
        geminiKey: "",
      }),
    ]);
  }, 240_000);

  afterAll(async () => {
    await Promise.all([providerOnlyServer?.stop?.(), fallbackServer?.stop?.()]);
  });

  it("ينشئ الميزانية ويصدر الملف ويحفظ الحالة مع سجل fallback منظم", async () => {
    const requestBody = {
      title: "مطاردة على الكورنيش",
      scenario:
        "مشهد مطاردة سيارات نهارية في شارعين مع بطليْن وانفجار واحد وثلاثة أيام تصوير.",
    };

    const generationResponse = await fetch(
      `http://127.0.0.1:${fallbackServer.port}/api/budget/generate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:5100",
        },
        body: JSON.stringify(requestBody),
      },
    );

    expect(generationResponse.status).toBe(200);
    const generationPayload = (await generationResponse.json()) as {
      success: boolean;
      data: {
        budget: {
          grandTotal: number;
          metadata?: { title?: string };
          sections: Array<{ categories: Array<{ items: unknown[] }> }>;
        };
        analysis: { summary: string };
        meta: { source: string; generatedAt: string };
      };
    };

    expect(generationPayload.success).toBe(true);
    expect(generationPayload.data.meta.source).toBe("fallback");
    expect(generationPayload.data.budget.grandTotal).toBeGreaterThan(0);
    expect(generationPayload.data.analysis.summary).toContain(
      "مطاردة على الكورنيش",
    );
    expect(
      generationPayload.data.budget.sections[0]?.categories[0]?.items.length,
    ).toBeGreaterThan(0);

    const exportResponse = await fetch(
      `http://127.0.0.1:${fallbackServer.port}/api/budget/export`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:5100",
        },
        body: JSON.stringify({ budget: generationPayload.data.budget }),
      },
    );

    if (exportResponse.status !== 200) {
      const exportFailureBody = await exportResponse.text();
      throw new Error(
        [
          `Export route failed with status ${exportResponse.status}.`,
          exportFailureBody,
          fallbackServer.stdoutChunks.join("\n"),
          fallbackServer.stderrChunks.join("\n"),
        ].join("\n---\n"),
      );
    }

    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-type")).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    const workbookBuffer = Buffer.from(await exportResponse.arrayBuffer());
    expect(workbookBuffer.byteLength).toBeGreaterThan(0);

    const stateReadResponse = await fetch(
      `http://127.0.0.1:${fallbackServer.port}/api/app-state/BUDGET`,
    );
    expect(stateReadResponse.status).toBe(200);
    const { cookie, token } = extractCookiePair(
      stateReadResponse.headers.get("set-cookie"),
    );

    const stateWriteResponse = await fetch(
      `http://127.0.0.1:${fallbackServer.port}/api/app-state/BUDGET`,
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie,
          origin: "http://localhost:5100",
          "x-xsrf-token": token,
        },
        body: JSON.stringify({
          data: {
            title: requestBody.title,
            scenario: requestBody.scenario,
            meta: generationPayload.data.meta,
          },
        }),
      },
    );

    expect(stateWriteResponse.status).toBe(200);

    const stateVerifyResponse = await fetch(
      `http://127.0.0.1:${fallbackServer.port}/api/app-state/BUDGET`,
    );
    const statePayload = (await stateVerifyResponse.json()) as {
      success: boolean;
      data: { title: string; scenario: string; meta: { source: string } };
    };

    expect(stateVerifyResponse.status).toBe(200);
    expect(statePayload.success).toBe(true);
    expect(statePayload.data.title).toBe(requestBody.title);
    expect(statePayload.data.meta.source).toBe("fallback");

    await delay(250);

    const combinedLogs = fallbackServer.stdoutChunks.join("\n");
    expect(combinedLogs).toContain("budget_runtime_fallback_used");
    expect(combinedLogs).toContain("budget_runtime_fallback_forced");
  }, 120_000);

  it("يرجع 503 عندما يكون المسار في وضع provider-only بدون اعتماد صالح", async () => {
    const response = await fetch(
      `http://127.0.0.1:${providerOnlyServer.port}/api/budget/generate`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:5100",
        },
        body: JSON.stringify({
          title: "اختبار اعتماد",
          scenario: "مشهد داخلي بسيط لمدة يومين.",
        }),
      },
    );

    expect(response.status).toBe(503);
    const payload = (await response.json()) as {
      success: boolean;
      error: string;
    };

    expect(payload.success).toBe(false);
    expect(payload.error).toContain("not configured");
  }, 120_000);
});

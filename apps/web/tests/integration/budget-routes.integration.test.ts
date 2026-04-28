import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface RuntimeServer {
  port: number;
  stateDir: string;
  stdoutChunks: string[];
  stderrChunks: string[];
  stop: () => Promise<void>;
}

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const backendDir = path.resolve(currentDir, "../../../backend");
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
            "Failed to resolve an ephemeral port for the budget web integration backend."
          )
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

async function waitForServer(port: number): Promise<void> {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/live`);
      if (response.ok) {
        return;
      }
    } catch {
      // تعليق عربي: ننتظر جاهزية الخادم الحقيقي قبل اختبار طبقة البروكسي في الويب.
    }

    await delay(500);
  }

  throw new Error(
    `Budget backend on port ${port} did not become ready in time.`
  );
}

function extractCookiePair(setCookieHeader: string | null): {
  cookie: string;
  token: string;
} {
  if (!setCookieHeader) {
    throw new Error(
      "Expected the proxied GET response to carry a CSRF cookie."
    );
  }

  const cookie = setCookieHeader.split(";")[0] ?? "";
  const token = cookie.split("=")[1] ?? "";

  if (!cookie || !token) {
    throw new Error("Failed to parse the proxied CSRF cookie.");
  }

  return { cookie, token };
}

async function stopRuntimeServer(
  child: ReturnType<typeof spawn>,
  stateDir: string
): Promise<void> {
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
}

async function startRuntimeServer(): Promise<RuntimeServer> {
  const port = await reserveAvailablePort();
  const stateDir = await mkdtemp(
    path.join(tmpdir(), "budget-web-integration-")
  );
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(port),
    DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/testdb",
    REDIS_ENABLED: "false",
    WEAVIATE_REQUIRED: "false",
    MEMORY_SYSTEM_ENABLED: "false",
    CORS_ORIGIN: "http://localhost:5000",
    APP_STATE_STORE_DIR: stateDir,
    BUDGET_AI_MODE: "fallback-only",
    GEMINI_API_KEY: "",
    GOOGLE_GENAI_API_KEY: "",
    NODE_OPTIONS: "",
  };

  delete childEnv["VITEST"];
  delete childEnv["VITEST_MODE"];
  delete childEnv["VITEST_POOL_ID"];
  delete childEnv["VITEST_WORKER_ID"];
  delete childEnv["npm_lifecycle_script"];
  delete childEnv["npm_command"];
  delete childEnv["PNPM_SCRIPT_SRC_DIR"];

  const child = spawn(process.execPath, [distServerPath], {
    cwd: backendDir,
    env: childEnv,
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

  try {
    await waitForServer(port);
  } catch (error) {
    await stopRuntimeServer(child, stateDir);
    throw new Error(
      [
        error instanceof Error ? error.message : String(error),
        `Backend exit code: ${child.exitCode ?? "running"}`,
        stdoutChunks.join("\n"),
        stderrChunks.join("\n"),
      ].join("\n---\n")
    );
  }

  const stop = async () => {
    await stopRuntimeServer(child, stateDir);
  };

  return { port, stateDir, stdoutChunks, stderrChunks, stop };
}

describe("budget web integration routes", () => {
  let runtimeServer: RuntimeServer | undefined;

  beforeAll(async () => {
    runtimeServer = await startRuntimeServer();
    Object.assign(process.env, {
      NEXT_PUBLIC_BACKEND_URL: `http://127.0.0.1:${runtimeServer.port}`,
      BACKEND_URL: `http://127.0.0.1:${runtimeServer.port}`,
    });
  }, 180_000);

  afterAll(async () => {
    await runtimeServer?.stop?.();
  });

  it("يمرر توليد الميزانية عبر proxy route ويحافظ على العقد الكامل", async () => {
    const { POST } = await import("@/app/api/budget/generate/route");
    const request = new NextRequest("http://localhost/api/budget/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "مواجهة ليلية",
        scenario:
          "مشهد ليلي في مستودع مع ثلاث شخصيات ومطاردة قصيرة ومؤثرات دخان.",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      success: boolean;
      data: {
        budget: { grandTotal: number };
        analysis: { summary: string };
        meta: { source: string };
      };
    };

    expect(payload.success).toBe(true);
    expect(payload.data.meta.source).toBe("fallback");
    expect(payload.data.budget.grandTotal).toBeGreaterThan(0);
    expect(payload.data.analysis.summary).toContain("مواجهة ليلية");
  }, 120_000);

  it("يرجع خطأ صالحاً عندما تكون حمولة التوليد ناقصة", async () => {
    const { POST } = await import("@/app/api/budget/generate/route");
    const request = new NextRequest("http://localhost/api/budget/generate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "عنوان بلا سيناريو",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);

    const payload = (await response.json()) as {
      success: boolean;
      error: string;
    };

    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Invalid request payload");
  }, 120_000);

  it("يحفظ حالة الميزانية ويستعيدها عبر app-state proxy الرسمي", async () => {
    const routeModule = await import("@/app/api/app-state/[app]/route");
    const context = { params: Promise.resolve({ app: "BUDGET" }) };

    const readRequest = new NextRequest(
      "http://localhost/api/app-state/BUDGET",
      {
        method: "GET",
      }
    );
    const readResponse = await routeModule.GET(readRequest, context);

    expect(readResponse.status).toBe(200);
    const { cookie, token } = extractCookiePair(
      readResponse.headers.get("set-cookie")
    );

    const writeRequest = new NextRequest(
      "http://localhost/api/app-state/BUDGET",
      {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          cookie,
          origin: "http://localhost:5000",
          "x-xsrf-token": token,
        },
        body: JSON.stringify({
          data: {
            title: "مواجهة ليلية",
            scenario: "نسخة محفوظة من السيناريو",
            meta: {
              source: "fallback",
              generatedAt: "2026-04-14T10:30:00.000Z",
            },
          },
        }),
      }
    );

    const writeResponse = await routeModule.PUT(writeRequest, context);
    if (writeResponse.status !== 200) {
      const failurePayload = await writeResponse.text();
      throw new Error(
        [
          `App-state write failed with status ${writeResponse.status}.`,
          failurePayload,
          runtimeServer?.stdoutChunks.join("\n") ?? "",
          runtimeServer?.stderrChunks.join("\n") ?? "",
        ].join("\n---\n")
      );
    }
    expect(writeResponse.status).toBe(200);

    const verifyRequest = new NextRequest(
      "http://localhost/api/app-state/BUDGET",
      {
        method: "GET",
      }
    );
    const verifyResponse = await routeModule.GET(verifyRequest, context);
    expect(verifyResponse.status).toBe(200);

    const payload = (await verifyResponse.json()) as {
      success: boolean;
      data: {
        title: string;
        scenario: string;
        meta: { source: string };
      } | null;
    };

    expect(payload.success).toBe(true);
    expect(payload.data?.title).toBe("مواجهة ليلية");
    expect(payload.data?.scenario).toBe("نسخة محفوظة من السيناريو");
    expect(payload.data?.meta.source).toBe("fallback");
  }, 120_000);
});

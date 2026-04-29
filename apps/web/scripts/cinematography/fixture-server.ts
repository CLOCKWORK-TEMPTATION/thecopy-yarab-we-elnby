// Fixture Server for Cinematography Integration Tests
// خادم تكامل لاختبارات السينماتوغرافيا

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";

import type { IncomingMessage, ServerResponse } from "node:http";

interface FixtureServerState {
  receivedBodies: Record<string, unknown>[];
}

interface StartedFixtureServer {
  baseUrl: string;
  state: FixtureServerState;
  close: () => Promise<void>;
}

const fixtureImagePath = resolve(process.cwd(), "../../public/sample-shot.png");

/**
 * إنشاء ملف صورة fixture
 */
export function createFixtureImageFile(): File {
  const bytes = readFileSync(fixtureImagePath);
  return new File([bytes], "sample-shot.png", {
    type: "image/png",
    lastModified: Date.now(),
  });
}

/**
 * قراءة body طلب HTTP كنص
 */
export function readBodyAsText(request: IncomingMessage): Promise<string> {
  return new Promise((resolveBody, rejectBody) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      raw += chunk;
    });
    request.on("end", () => resolveBody(raw));
    request.on("error", rejectBody);
  });
}

function writeJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown
): void {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function handleFixtureRequest(
  request: IncomingMessage,
  response: ServerResponse,
  state: FixtureServerState
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
  const fixtureMode =
    requestUrl.searchParams.get("fixtureMode") === "fail" ? "fail" : "success";

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    writeJson(response, 200, { ok: true, fixtureMode });
    return;
  }

  if (
    request.method === "POST" &&
    requestUrl.pathname === "/api/cineai/validate-shot"
  ) {
    const bodyText = await readBodyAsText(request);
    const payload = bodyText
      ? (JSON.parse(bodyText) as Record<string, unknown>)
      : {};
    state.receivedBodies.push(payload);

    if (fixtureMode === "fail") {
      writeJson(response, 503, {
        success: false,
        error: "Fixture backend failure",
      });
      return;
    }

    writeJson(response, 200, {
      success: true,
      validation: {
        score: 88,
        exposure: "Balanced",
        composition: "Strong thirds",
        focus: "Sharp",
        colorBalance: "Neutral",
        suggestions: ["تحسين خفيف في فصل الخلفية."],
      },
    });
    return;
  }

  if (
    request.method === "POST" &&
    requestUrl.pathname === "/api/cineai/color-grading"
  ) {
    writeJson(response, 200, {
      success: true,
      sceneType: "generic",
      palette: ["#111111", "#3a3a3a", "#7f5f3a", "#c9a56a", "#f4e2b8"],
    });
    return;
  }

  writeJson(response, 404, { success: false, error: "Not found" });
}

function handleFixtureRequestFailure(
  response: ServerResponse,
  error: unknown
): void {
  const message =
    error instanceof Error ? error.message : "Fixture server error";

  if (response.headersSent) {
    response.end();
    return;
  }

  writeJson(response, 500, { success: false, error: message });
}

/**
 * بدء خادم fixture للتكامل
 */
export async function startFixtureServer(): Promise<StartedFixtureServer> {
  const state: FixtureServerState = {
    receivedBodies: [],
  };

  const server = createServer((request, response) => {
    void handleFixtureRequest(request, response, state).catch(
      (error: unknown) => handleFixtureRequestFailure(response, error)
    );
  });

  await new Promise<void>((resolveStart, rejectStart) => {
    server.once("error", rejectStart);
    server.listen(0, "127.0.0.1", () => resolveStart());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("تعذر الحصول على عنوان خادم التكامل.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close((error?: Error) => {
          if (error) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      }),
  };
}

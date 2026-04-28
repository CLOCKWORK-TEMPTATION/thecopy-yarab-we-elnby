// Fixture Server for Cinematography Integration Tests
// خادم تكامل لاختبارات السينماتوغرافيا

import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { resolve } from "node:path";

interface FixtureServerState {
  receivedBodies: unknown[];
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
export function readBodyAsText(request: any): Promise<string> {
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

/**
 * بدء خادم fixture للتكامل
 */
export async function startFixtureServer(): Promise<StartedFixtureServer> {
  const state: FixtureServerState = {
    receivedBodies: [],
  };

  const server = createServer(
    async (request: any, response: any) => {
      const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
      const fixtureMode =
        requestUrl.searchParams.get("fixtureMode") === "fail"
          ? "fail"
          : "success";

      if (request.method === "GET" && requestUrl.pathname === "/health") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ ok: true, fixtureMode }));
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
          response.writeHead(503, { "content-type": "application/json" });
          response.end(
            JSON.stringify({
              success: false,
              error: "Fixture backend failure",
            })
          );
          return;
        }

        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            success: true,
            validation: {
              score: 88,
              exposure: "Balanced",
              composition: "Strong thirds",
              focus: "Sharp",
              colorBalance: "Neutral",
              suggestions: ["تحسين خفيف في فصل الخلفية."],
            },
          })
        );
        return;
      }

      if (
        request.method === "POST" &&
        requestUrl.pathname === "/api/cineai/color-grading"
      ) {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            success: true,
            sceneType: "generic",
            palette: ["#111111", "#3a3a3a", "#7f5f3a", "#c9a56a", "#f4e2b8"],
          })
        );
        return;
      }

      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ success: false, error: "Not found" }));
    }
  );

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
        server.close((error: Error | null) => {
          if (error) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      }),
  };
}

/* @vitest-environment node */

/**
 * اختبارات تكامل حقيقية لمسار Validate Shot.
 *
 * الهدف:
 * - إثبات أن الـ route يستقبل multipart فعليًا.
 * - إثبات أن التحويل إلى JSON Base64 يتم بعقد صحيح.
 * - إثبات تمرير الاستجابة من خدمة HTTP حقيقية معزولة.
 * - إثبات مسار الفشل القادم من الخدمة الخلفية.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { NextRequest } from "next/server";

interface FixtureServerState {
  receivedBodies: Array<Record<string, unknown>>;
}

interface StartedFixtureServer {
  baseUrl: string;
  close: () => Promise<void>;
  state: FixtureServerState;
}

function readBodyAsText(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let raw = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      raw += chunk;
    });
    request.on("end", () => resolve(raw));
    request.on("error", reject);
  });
}

async function startFixtureServer(
  mode: "success" | "fail"
): Promise<StartedFixtureServer> {
  const state: FixtureServerState = {
    receivedBodies: [],
  };

  const server = createServer(
    async (request: IncomingMessage, response: ServerResponse) => {
      if (
        request.method === "POST" &&
        request.url === "/api/cineai/validate-shot"
      ) {
        const bodyText = await readBodyAsText(request);
        const payload = bodyText
          ? (JSON.parse(bodyText) as Record<string, unknown>)
          : {};
        state.receivedBodies.push(payload);

        if (mode === "fail") {
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

      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ success: false, error: "Not found" }));
    }
  );

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("تعذر الحصول على عنوان خادم الاختبار.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    state,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
  };
}

function createPngFile(): File {
  const bytes = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x04, 0x00, 0x00, 0x00, 0xb5, 0x1c, 0x0c, 0x02, 0x00, 0x00, 0x00,
    0x0b, 0x49, 0x44, 0x41, 0x54, 0x78, 0xda, 0x63, 0xfc, 0xff, 0x1f, 0x00,
    0x03, 0x03, 0x02, 0x00, 0xef, 0x01, 0xf6, 0x84, 0x00, 0x00, 0x00, 0x00,
    0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);

  return new File([bytes], "shot.png", { type: "image/png" });
}

let backendUrlSnapshot: string | undefined;
let nextPublicBackendUrlSnapshot: string | undefined;
let nextPublicApiUrlSnapshot: string | undefined;

beforeEach(() => {
  backendUrlSnapshot = process.env.BACKEND_URL;
  nextPublicBackendUrlSnapshot = process.env.NEXT_PUBLIC_BACKEND_URL;
  nextPublicApiUrlSnapshot = process.env.NEXT_PUBLIC_API_URL;
});

afterEach(() => {
  if (backendUrlSnapshot === undefined) {
    delete process.env.BACKEND_URL;
  } else {
    process.env.BACKEND_URL = backendUrlSnapshot;
  }

  if (nextPublicBackendUrlSnapshot === undefined) {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  } else {
    process.env.NEXT_PUBLIC_BACKEND_URL = nextPublicBackendUrlSnapshot;
  }

  if (nextPublicApiUrlSnapshot === undefined) {
    delete process.env.NEXT_PUBLIC_API_URL;
  } else {
    process.env.NEXT_PUBLIC_API_URL = nextPublicApiUrlSnapshot;
  }

  vi.resetModules();
});

describe("POST /api/cineai/validate-shot - integration", () => {
  it("يمرر multipart إلى خدمة حقيقية بعد تحويل الصورة إلى Base64", async () => {
    const fixture = await startFixtureServer("success");
    try {
      process.env.BACKEND_URL = fixture.baseUrl;
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
      vi.resetModules();

      const { POST } = await import("../route");

      const formData = new FormData();
      formData.set("image", createPngFile());

      const request = new NextRequest(
        "http://localhost:5000/api/cineai/validate-shot",
        {
          method: "POST",
          body: formData,
        }
      );

      const response = await POST(request);
      const payload = (await response.json()) as {
        success?: boolean;
        validation?: { score?: number };
      };

      expect(response.status).toBe(200);
      expect(payload.success).toBe(true);
      expect(payload.validation?.score).toBe(88);

      expect(fixture.state.receivedBodies.length).toBe(1);
      const forwardedBody = fixture.state.receivedBodies[0];
      expect(typeof forwardedBody?.["imageBase64"]).toBe("string");
      expect(forwardedBody?.["mimeType"]).toBe("image/png");
    } finally {
      await fixture.close();
    }
  });

  it("يرفض multipart عند غياب ملف الصورة", async () => {
    const fixture = await startFixtureServer("success");
    try {
      process.env.BACKEND_URL = fixture.baseUrl;
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
      vi.resetModules();

      const { POST } = await import("../route");

      const formData = new FormData();
      formData.set("note", "missing-image");

      const request = new NextRequest(
        "http://localhost:5000/api/cineai/validate-shot",
        {
          method: "POST",
          body: formData,
        }
      );

      const response = await POST(request);
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      expect(response.status).toBe(400);
      expect(payload.success).toBe(false);
      expect(payload.error).toContain("Image is required");
      expect(fixture.state.receivedBodies.length).toBe(0);
    } finally {
      await fixture.close();
    }
  });

  it("يعكس فشل الخدمة الخلفية الفعلية إلى الواجهة دون كسر العقد", async () => {
    const fixture = await startFixtureServer("fail");
    try {
      process.env.BACKEND_URL = fixture.baseUrl;
      delete process.env.NEXT_PUBLIC_API_URL;
      delete process.env.NEXT_PUBLIC_BACKEND_URL;
      vi.resetModules();

      const { POST } = await import("../route");

      const formData = new FormData();
      formData.set("image", createPngFile());

      const request = new NextRequest(
        "http://localhost:5000/api/cineai/validate-shot",
        {
          method: "POST",
          body: formData,
        }
      );

      const response = await POST(request);
      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      expect(response.status).toBe(503);
      expect(payload.success).toBe(false);
      expect(payload.error).toContain("Fixture backend failure");
    } finally {
      await fixture.close();
    }
  });
});

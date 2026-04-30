/**
 * اختبار تكامل: ضمان JSON في كل استجابات analysis controller
 *
 * يتحقق من:
 * - HTTP 200: الرد دائماً JSON مع Content-Type صحيح
 * - HTTP 4xx: الرد JSON {error, code} لا HTML
 * - HTTP 5xx: الرد JSON {error, traceId} لا HTML ولا stack trace
 *
 * قاعدة الفحوصات: يُحظر إضعاف هذا الملف أو تخفيف توقعاته.
 */
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { errorHandler } from "@/middleware";

import type { Application, NextFunction, Request, Response } from "express";

// ======== Mocks ========
interface PipelineResult {
  stations: unknown[];
  summary: string;
}

const { mockRunFullPipeline, mockRunFullPipelineStreaming } = vi.hoisted(() => ({
  mockRunFullPipeline:
    vi.fn<(...args: unknown[]) => Promise<PipelineResult>>(),
  mockRunFullPipelineStreaming: vi.fn(),
}));

interface ErrorResponseBody {
  error?: unknown;
  traceId?: unknown;
}

function getErrorResponseBody(body: unknown): ErrorResponseBody {
  if (typeof body === "object" && body !== null) {
    return body;
  }
  return {};
}

vi.mock("@/services/analysis.service", () => ({
  AnalysisService: class {
    runFullPipeline = mockRunFullPipeline;
    runFullPipelineStreaming = mockRunFullPipelineStreaming;
  },
}));

vi.mock("@/queues/jobs/ai-analysis.job", () => ({
  queueAIAnalysis: vi.fn(),
}));

vi.mock("@/services/analysisStream.registry", () => ({
  analysisStreamRegistry: {
    createSession: vi.fn().mockReturnValue({ id: "test-session" }),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
  },
}));

// ======== Factory ========
function buildApp(): Application {
  const app = express();
  app.use(express.json());

  // مسار التحليل المباشر (seven-stations)
  app.post(
    "/api/public/analysis/seven-stations/run",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { text } = req.body as { text?: string };
        if (!text?.trim()) {
          res
            .status(400)
            .json({ success: false, error: "النص مطلوب", code: "EMPTY_TEXT" });
          return;
        }
        const result = await mockRunFullPipeline({ text });
        res.json({ success: true, data: result });
      } catch (error) {
        next(error);
      }
    },
  );

  // مسار بدء الجلسة (start)
  app.post(
    "/api/public/analysis/seven-stations/start",
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const { text } = req.body as { text?: string };
        if (!text?.trim()) {
          res
            .status(400)
            .json({ success: false, error: "النص مطلوب", code: "EMPTY_TEXT" });
          return;
        }
        res.json({ success: true, analysisId: "test-id-123" });
      } catch (error) {
        next(error);
      }
    },
  );

  // مسار يُحاكي خطأ داخلياً (500)
  app.post(
    "/api/public/analysis/seven-stations/crash",
    (_req: Request, _res: Response, next: NextFunction) => {
      next(new Error("حدث خطأ داخلي غير متوقع"));
    },
  );

  // 404 fallback — يجب أن يُرجع JSON لا HTML
  app.use((_req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(404).json({
      success: false,
      error: "المسار غير موجود",
      code: "NOT_FOUND",
    });
  });

  // errorHandler مركزي (المُصلَح)
  app.use(errorHandler);

  return app;
}

// ======== Helpers ========
function assertJsonContentType(contentType: string): void {
  expect(contentType.toLowerCase()).toContain("application/json");
  expect(contentType.toLowerCase()).not.toContain("text/html");
}

function assertNoHtmlInBody(body: unknown): void {
  const bodyStr = JSON.stringify(body);
  expect(bodyStr).not.toMatch(/<!DOCTYPE/i);
  expect(bodyStr).not.toMatch(/Cannot (GET|POST)/i);
  expect(bodyStr).not.toMatch(/SyntaxError/i);
  expect(bodyStr).not.toMatch(/JSON\.parse/i);
}

function assertNoStackTrace(body: unknown): void {
  const bodyStr = JSON.stringify(body);
  expect(bodyStr).not.toMatch(/"stack":/);
  expect(bodyStr).not.toMatch(/at Object\./);
  expect(bodyStr).not.toMatch(/at Function\./);
}

// ======== Tests ========
let app: Application;

beforeEach(() => {
  vi.clearAllMocks();
  app = buildApp();

  // الحالة الافتراضية: نجاح التحليل
  mockRunFullPipeline.mockResolvedValue({
    stations: [],
    summary: "تحليل ناجح",
  });
});

describe("M1.1 — ضمان JSON في كل حالات HTTP (200 / 4xx / 5xx)", () => {
  describe("HTTP 200 — نجاح التحليل", () => {
    it("200: Content-Type يجب أن يكون application/json", async () => {
      const res = await request(app)
        .post("/api/public/analysis/seven-stations/run")
        .send({ text: "INT. TEST - DAY\nThis is a test scene" })
        .set("Content-Type", "application/json");

      expect(res.status).toBe(200);
      assertJsonContentType(res.headers["content-type"] ?? "");
      assertNoHtmlInBody(res.body);
    });

    it("200: الرد يحتوي success: true", async () => {
      const res = await request(app)
        .post("/api/public/analysis/seven-stations/run")
        .send({ text: "INT. SCENE - DAY\nحوار مسرحي" });

      expect(res.body).toHaveProperty("success", true);
    });

    it("200: start يُرجع analysisId", async () => {
      const res = await request(app)
        .post("/api/public/analysis/seven-stations/start")
        .send({ text: "INT. SCENE - DAY\nحوار مسرحي" });

      expect(res.status).toBe(200);
      assertJsonContentType(res.headers["content-type"] ?? "");
      expect(res.body).toHaveProperty("analysisId");
    });
  });

  describe("HTTP 400 — بيانات خاطئة", () => {
    it("400: نص فارغ → JSON {error, code} لا HTML", async () => {
      const res = await request(app)
        .post("/api/public/analysis/seven-stations/run")
        .send({ text: "" });

      expect(res.status).toBe(400);
      assertJsonContentType(res.headers["content-type"] ?? "");
      assertNoHtmlInBody(res.body);
      expect(res.body).toHaveProperty("error");
      expect(typeof getErrorResponseBody(res.body).error).toBe("string");
    });

    it("400: body فارغ تماماً → JSON لا HTML", async () => {
      const res = await request(app)
        .post("/api/public/analysis/seven-stations/start")
        .send({});

      expect(res.status).toBe(400);
      assertJsonContentType(res.headers["content-type"] ?? "");
      assertNoHtmlInBody(res.body);
    });

    it("400: يتضمن code في الرد", async () => {
      const res = await request(app)
        .post("/api/public/analysis/seven-stations/run")
        .send({ text: "   " });

      expect(res.body).toHaveProperty("code");
    });
  });

  describe("HTTP 404 — مسار غير موجود", () => {
    it("404: مسار مجهول → JSON لا HTML", async () => {
      const res = await request(app)
        .post("/api/public/analysis/nonexistent")
        .send({});

      expect(res.status).toBe(404);
      assertJsonContentType(res.headers["content-type"] ?? "");
      assertNoHtmlInBody(res.body);
      expect(res.body).toHaveProperty("error");
    });

    it("404: GET على مسار POST-only → JSON لا HTML", async () => {
      const res = await request(app).get(
        "/api/public/analysis/seven-stations/run",
      );

      expect(res.status).toBe(404);
      assertJsonContentType(res.headers["content-type"] ?? "");
    });
  });

  describe("HTTP 500 — خطأ داخلي", () => {
    it("500: استثناء غير متوقع → JSON {error, traceId} لا HTML", async () => {
      const res = await request(app)
        .post("/api/public/analysis/seven-stations/crash")
        .send({});

      expect(res.status).toBe(500);
      assertJsonContentType(res.headers["content-type"] ?? "");
      assertNoHtmlInBody(res.body);
      assertNoStackTrace(res.body);
      expect(res.body).toHaveProperty("error");
      expect(res.body).toHaveProperty("traceId");
    });

    it("500: فشل خدمة التحليل → JSON لا HTML", async () => {
      mockRunFullPipeline.mockRejectedValue(
        new Error("فشل داخلي في التحليل"),
      );

      const res = await request(app)
        .post("/api/public/analysis/seven-stations/run")
        .send({ text: "INT. TEST - DAY\nscene" });

      expect(res.status).toBe(500);
      assertJsonContentType(res.headers["content-type"] ?? "");
      assertNoHtmlInBody(res.body);
      assertNoStackTrace(res.body);
    });

    it("500: traceId مختلف في كل طلب", async () => {
      mockRunFullPipeline.mockRejectedValue(new Error("crash"));

      const [r1, r2] = await Promise.all([
        request(app)
          .post("/api/public/analysis/seven-stations/run")
          .send({ text: "INT. A - DAY" }),
        request(app)
          .post("/api/public/analysis/seven-stations/run")
          .send({ text: "INT. B - DAY" }),
      ]);

      const firstBody = getErrorResponseBody(r1.body);
      const secondBody = getErrorResponseBody(r2.body);
      expect(firstBody.traceId).not.toBe(secondBody.traceId);
    });
  });
});

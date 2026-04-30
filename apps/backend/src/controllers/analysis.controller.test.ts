import { beforeEach, describe, expect, it, vi } from "vitest";

import { analysisStreamRegistry } from "@/services/analysisStream.registry";

import { AnalysisController } from "./analysis.controller";

import type { Request, Response } from "express";

type MockFn = ReturnType<typeof vi.fn>;
interface MockRequest {
  body?: unknown;
  get?: MockFn;
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  user?: { email: string; id: string };
}
type MockResponse = Partial<Response> & {
  status: MockFn;
  json: MockFn;
};

const {
  mockRunFullPipeline,
  mockRunFullPipelineStreaming,
  mockQueueAIAnalysis,
} = vi.hoisted(() => ({
  mockRunFullPipeline: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  mockRunFullPipelineStreaming:
    vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  mockQueueAIAnalysis: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("@/services/analysis.service", () => ({
  AnalysisService: class MockAnalysisService {
    runFullPipeline = mockRunFullPipeline;
    runFullPipelineStreaming = mockRunFullPipelineStreaming;
  },
}));

vi.mock("@/queues/jobs/ai-analysis.job", () => ({
  queueAIAnalysis: mockQueueAIAnalysis,
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

let analysisController: AnalysisController;
let mockRequest: MockRequest;
let mockResponse: MockResponse;

beforeEach(() => {
  vi.clearAllMocks();

  analysisController = new AnalysisController();
  mockRequest = {
    body: {},
    user: { email: "owner@example.com", id: "user-123" },
  };
  mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
});

function asRequest(): Request {
  return mockRequest as unknown as Request;
}

function asResponse(): Response {
  return mockResponse as unknown as Response;
}

function anyNumberMatcher(): unknown {
  return expect.any(Number);
}

function anyStringMatcher(): unknown {
  return expect.any(String);
}

function anyArrayMatcher(): unknown {
  return expect.any(Array);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function firstJsonPayload(): Record<string, unknown> {
  const payload: unknown = mockResponse.json.mock.calls[0]?.[0];
  return isRecord(payload) ? payload : {};
}

function arrayField(record: Record<string, unknown>, key: string): unknown[] {
  const value = record[key];
  return Array.isArray(value) ? value : [];
}

function stationId(station: unknown): string {
  return isRecord(station) && typeof station["id"] === "string"
    ? station["id"]
    : "";
}

describe("runSevenStationsPipeline", () => {
  it("يعالج النص عبر خدمة التحليل المباشرة", async () => {
    mockRunFullPipeline.mockResolvedValue({
      pipelineMetadata: { averageConfidence: 0.91 },
      stationOutputs: {
        station7: {
          details: {
            finalReport: "تقرير التحليل الكامل",
          },
        },
      },
    });

    mockRequest.body = { text: "نص درامي للتحليل" };

    await analysisController.runSevenStationsPipeline(
      asRequest(),
      asResponse(),
    );

    expect(mockRunFullPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        fullText: "نص درامي للتحليل",
        projectName: "تحليل سيناريو",
        language: "ar",
      }),
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        report: "تقرير التحليل الكامل",
        confidence: 0.91,
        executionTime: anyNumberMatcher(),
        timestamp: anyStringMatcher(),
        stationsCount: 7,
      }),
    );
  });

  it("يعيد 400 عندما يغيب النص", async () => {
    mockRequest.body = {};

    await analysisController.runSevenStationsPipeline(
      asRequest(),
      asResponse(),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "النص مطلوب ولا يمكن أن يكون فارغاً",
      code: "INVALID_TEXT",
    });
  });

  it("يعيد 400 عندما يكون النص فارغاً", async () => {
    mockRequest.body = { text: "   " };

    await analysisController.runSevenStationsPipeline(
      asRequest(),
      asResponse(),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(400);
  });

  it("يحوّل الطلب إلى قائمة الانتظار في النمط غير المتزامن", async () => {
    mockQueueAIAnalysis.mockResolvedValue("job-123");
    mockRequest.body = { text: "نص طويل", async: true };

    await analysisController.runSevenStationsPipeline(
      asRequest(),
      asResponse(),
    );

    expect(mockQueueAIAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        analysisType: "full",
        options: { text: "نص طويل" },
      }),
    );
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        jobId: "job-123",
        message: "تم إضافة التحليل إلى قائمة الانتظار",
      }),
    );
  });

  it("يعيد 500 عندما تفشل خدمة التحليل", async () => {
    mockRunFullPipeline.mockRejectedValue(new Error("Pipeline failed"));
    mockRequest.body = { text: "نص الاختبار" };

    await analysisController.runSevenStationsPipeline(
      asRequest(),
      asResponse(),
    );

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      error: "حدث خطأ أثناء تحليل النص",
      message: "Pipeline failed",
      code: "ANALYSIS_FAILED",
    });
  });
});

describe("getStationDetails", () => {
  it("يعيد معلومات المحطات السبع", () => {
    analysisController.getStationDetails(asRequest(), asResponse());

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        stations: anyArrayMatcher(),
        totalStations: 7,
        executionOrder: anyStringMatcher(),
        outputFormat: anyStringMatcher(),
      }),
    );

    const stations = arrayField(firstJsonPayload(), "stations");
    expect(stations).toHaveLength(7);
    expect(new Set(stations.map(stationId)).size).toBe(7);
  });
});

describe("public streaming sessions", () => {
  it("ينشئ جلسة بث عامة بمالك مشتق من الطلب وليس مالكاً مجهولاً عاماً", () => {
    mockRunFullPipelineStreaming.mockResolvedValue(undefined);
    mockRequest.body = {
      text: "نص عربي طويل للتحقق من جلسة البث العامة",
      projectName: "اختبار عام",
    };
    mockRequest.ip = "203.0.113.15";
    mockRequest.headers = mockRequest.headers ?? {};
    mockRequest.get = vi.fn((headerName: string) => {
      // Check request headers first (needed for dynamically set headers like x-analysis-token)
      const headerValue = mockRequest.headers?.[headerName.toLowerCase()];
      if (typeof headerValue === "string") return headerValue;
      if (Array.isArray(headerValue)) return headerValue[0];
      // Fall back to static mock values
      return headerName.toLowerCase() === "user-agent" ? "vitest-browser" : undefined;
    });

    analysisController.startPublicStreamSession(asRequest(), asResponse());

    const payload = firstJsonPayload();
    expect(payload).toMatchObject({ success: true });
    expect(payload["analysisId"]).toEqual(anyStringMatcher());
    expect(payload["sessionToken"]).toEqual(anyStringMatcher());
    expect(mockRunFullPipelineStreaming).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisId: payload["analysisId"],
        fullText: "نص عربي طويل للتحقق من جلسة البث العامة",
        projectName: "اختبار عام",
      }),
    );

    const snapshot = analysisStreamRegistry.getSnapshot(
      String(payload["analysisId"]),
    );
    expect(snapshot?.metadata["ownerId"]).toMatch(/^public:/);
    expect(snapshot?.metadata["ownerId"]).not.toBe("anonymous");
    expect(snapshot?.metadata["ownerId"]).not.toBe("user-123");
  });
});

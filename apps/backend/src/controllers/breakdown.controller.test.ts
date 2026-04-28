import { beforeEach, describe, expect, it, vi } from "vitest";

import { breakdownController } from "./breakdown.controller";

import type { Request, Response } from "express";

const { mockBreakdownService } = vi.hoisted(() => ({
  mockBreakdownService: {
    createProjectAndParse: vi.fn(),
    parseProject: vi.fn(),
    analyzeProject: vi.fn(),
    getProjectReport: vi.fn(),
    getProjectSchedule: vi.fn(),
    getSceneBreakdown: vi.fn(),
    reanalyzeScene: vi.fn(),
    exportReport: vi.fn(),
    chat: vi.fn(),
  },
}));

vi.mock("@/services/breakdown/service", () => ({
  breakdownService: mockBreakdownService,
}));

function createMockResponse(): Response & {
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const response = {
    json,
    status: vi.fn(),
  } as unknown as Response & {
    json: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
  };

  response.status.mockImplementation(() => response);
  return response;
}

function objectContainingMatcher(value: Record<string, unknown>): unknown {
  return expect.objectContaining(value);
}

describe("BreakdownController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("يعيد الحالة الصحية للخدمة", () => {
    const res = createMockResponse();

    breakdownController.health({} as Request, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: objectContainingMatcher({
          service: "breakdown",
          status: "ok",
        }),
      }),
    );
  });

  it("يرفض طلب التهيئة إذا غاب نص السيناريو", async () => {
    const req = {
      body: {},
      user: { id: "user-1", email: "test@example.com" },
    } as unknown as Request;
    const res = createMockResponse();

    await breakdownController.bootstrapProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: "بيانات الطلب غير صالحة",
      }),
    );
  });

  it("يعيد 404 إذا لم يجد تقرير المشروع", async () => {
    mockBreakdownService.getProjectReport.mockResolvedValueOnce(null);
    const req = {
      params: { projectId: "project-1" },
      user: { id: "user-1", email: "test@example.com" },
    } as unknown as Request;
    const res = createMockResponse();

    await breakdownController.getProjectReport(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "لم يتم العثور على تقرير بريك دون للمشروع",
    });
  });

  it("يحوّل أخطاء الكيان غير الموجود إلى 404", async () => {
    mockBreakdownService.analyzeProject.mockRejectedValueOnce(
      new Error("المشروع غير موجود"),
    );
    const req = {
      params: { projectId: "missing-project" },
      user: { id: "user-1", email: "test@example.com" },
    } as unknown as Request;
    const res = createMockResponse();

    await breakdownController.analyzeProject(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "المشروع غير موجود",
    });
  });

  it("يرفض أي طلب محمي إذا غاب المستخدم المصادق", async () => {
    const req = {
      params: { projectId: "project-1" },
    } as unknown as Request;
    const res = createMockResponse();

    await breakdownController.analyzeProject(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: "غير مصرح",
    });
    expect(mockBreakdownService.analyzeProject).not.toHaveBeenCalled();
  });

  it("يمرر معرف المستخدم إلى خدمة التهيئة", async () => {
    mockBreakdownService.createProjectAndParse.mockResolvedValueOnce({
      projectId: "project-1",
      title: "مشروع",
      parsed: { scenes: [] },
    });
    const req = {
      body: { scriptContent: "مشهد داخلي" },
      user: { id: "user-42", email: "owner@example.com" },
    } as unknown as Request;
    const res = createMockResponse();

    await breakdownController.bootstrapProject(req, res);

    expect(mockBreakdownService.createProjectAndParse).toHaveBeenCalledWith(
      "مشهد داخلي",
      undefined,
      "user-42",
    );
  });
});

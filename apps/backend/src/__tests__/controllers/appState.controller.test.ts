/**
 * اختبارات وحدة — AppState Controller [UTP-008]
 *
 * يتحقق من:
 * - getState: استرجاع حالة تطبيق صالح
 * - getState: رفض معرّف غير صالح بـ 400
 * - getState: إرجاع null عند عدم وجود حالة
 * - setState: حفظ حالة بنجاح
 * - setState: رفض بدون data بـ 400
 * - clearState: مسح حالة بنجاح
 * - clearState: رفض معرّف غير صالح
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

import { AppStateController } from "@/controllers/appState.controller";

import type { Request, Response } from "express";

// ─── Mock لخدمة App State ───
type AsyncServiceMock = ReturnType<
  typeof vi.fn<(...args: unknown[]) => Promise<unknown>>
>;
type MockFn = ReturnType<typeof vi.fn>;
type TestResponse = Response & {
  _status: number;
  _json: unknown;
  status: MockFn;
  json: MockFn;
};

const mockReadAppState: AsyncServiceMock = vi.fn();
const mockSaveAppState: AsyncServiceMock = vi.fn();
const mockClearAppState: AsyncServiceMock = vi.fn();

vi.mock("@/services/app-state.service", () => ({
  readAppState: (...args: unknown[]): Promise<unknown> =>
    mockReadAppState(...args),
  saveAppState: (...args: unknown[]): Promise<unknown> =>
    mockSaveAppState(...args),
  clearAppState: (...args: unknown[]): Promise<unknown> =>
    mockClearAppState(...args),
}));

// ─── مساعدات ───

function createReq(overrides: Record<string, unknown> = {}): Request {
  return {
    params: {},
    body: {},
    query: {},
    ...overrides,
  } as unknown as Request;
}

function createRes(): TestResponse {
  const res = {
    _status: 200,
    _json: null,
    status: vi.fn((code: number): TestResponse => {
      res._status = code;
      return res;
    }),
    json: vi.fn((data: unknown): TestResponse => {
      res._json = data;
      return res;
    }),
  } as TestResponse;
  return res;
}

function objectContainingMatcher(value: Record<string, unknown>): unknown {
  return expect.objectContaining(value);
}

// ═══ اختبارات ═══

describe("AppStateController", () => {
  let controller: AppStateController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AppStateController();
  });

  // ─── getState ───

  describe("getState", () => {
    it("يجب أن يسترجع حالة تطبيق صالح", async () => {
      mockReadAppState.mockResolvedValue({
        data: { step: 3, analysis: "complete" },
        updatedAt: "2025-01-01T00:00:00Z",
      });

      const req = createReq({ params: { appId: "analysis" } });
      const res = createRes();

      await controller.getState(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: objectContainingMatcher({ step: 3 }),
        }),
      );
    });

    it("يجب أن يرفض معرّف تطبيق غير صالح بـ 400", async () => {
      const req = createReq({ params: { appId: "invalid-app-xyz" } });
      const res = createRes();

      await controller.getState(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: "INVALID_APP_ID",
        }),
      );
    });

    it("يجب أن يُرجع null عند عدم وجود حالة محفوظة", async () => {
      mockReadAppState.mockResolvedValue({ data: {}, updatedAt: null });

      const req = createReq({ params: { appId: "breakdown" } });
      const res = createRes();

      await controller.getState(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: null,
        }),
      );
    });

    it("يجب أن يتعامل مع خطأ القراءة بـ 500", async () => {
      mockReadAppState.mockRejectedValue(new Error("IO error"));

      const req = createReq({ params: { appId: "analysis" } });
      const res = createRes();

      await controller.getState(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── setState ───

  describe("setState", () => {
    it("يجب أن يحفظ حالة بنجاح", async () => {
      mockSaveAppState.mockResolvedValue({
        data: { step: 5 },
        updatedAt: "2025-06-01T00:00:00Z",
      });

      const req = createReq({
        params: { appId: "analysis" },
        body: { data: { step: 5 } },
      });
      const res = createRes();

      await controller.setState(req, res);

      expect(mockSaveAppState).toHaveBeenCalledWith("analysis", { step: 5 });
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });

    it("يجب أن يرفض بدون data بـ 400", async () => {
      const req = createReq({
        params: { appId: "analysis" },
        body: {},
      });
      const res = createRes();

      await controller.setState(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: "INVALID_DATA" }),
      );
    });

    it("يجب أن يرفض data من نوع غير object بـ 400", async () => {
      const req = createReq({
        params: { appId: "analysis" },
        body: { data: "not an object" },
      });
      const res = createRes();

      await controller.setState(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── clearState ───

  describe("clearState", () => {
    it("يجب أن يمسح حالة تطبيق صالح", async () => {
      mockClearAppState.mockResolvedValue({
        data: {},
        updatedAt: "2026-05-01T00:00:00Z",
      });

      const req = createReq({ params: { appId: "breakdown" } });
      const res = createRes();

      await controller.clearState(req, res);

      expect(mockClearAppState).toHaveBeenCalledWith("breakdown");
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: {},
        }),
      );
    });

    it("يجب أن يرفض معرّف غير صالح", async () => {
      const req = createReq({ params: { appId: "INVALID" } });
      const res = createRes();

      await controller.clearState(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});

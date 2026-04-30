import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";

import { shotsController } from "./shots.controller";

import type { Request, Response } from "express";

const {
  mockVerifyShotOwnership,
  mockVerifySceneOwnership,
  mockGetShotSuggestion,
} = vi.hoisted(() => ({
  mockVerifyShotOwnership: vi.fn(),
  mockVerifySceneOwnership: vi.fn(),
  mockGetShotSuggestion: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  shots: {
    id: "shots.id",
    sceneId: "shots.sceneId",
    shotNumber: "shots.shotNumber",
  },
  scenes: {
    id: "scenes.id",
    shotCount: "scenes.shotCount",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
}));

vi.mock("@/middleware/auth.middleware", () => ({
  getParamAsString: vi.fn((value: unknown) =>
    typeof value === "string" && value.trim().length > 0 ? value : undefined,
  ),
}));

vi.mock("./shots.helpers", () => ({
  requireAuth: vi.fn((req: { user?: unknown }, res: HelperResponse) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "غير مصرح",
      });
      return false;
    }
    return true;
  }),
  requireParam: vi.fn(
    (res: HelperResponse, value: unknown, errorMsg: string) => {
      if (!value) {
        res.status(400).json({
          success: false,
          error: errorMsg,
        });
        return false;
      }
      return true;
    },
  ),
  verifyShotOwnership: mockVerifyShotOwnership,
  verifySceneOwnership: mockVerifySceneOwnership,
}));

vi.mock("@/services/gemini.service", () => ({
  GeminiService: class MockGeminiService {
    getShotSuggestion = mockGetShotSuggestion;
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

type MockFn = ReturnType<typeof vi.fn>;
interface HelperResponse {
  status(code: number): { json(body: unknown): unknown };
  json(body: unknown): unknown;
}
interface MockResponseLike {
  status: MockFn;
  json: MockFn;
}
interface MockDb {
  select: MockFn;
  insert: MockFn;
  update: MockFn;
  delete: MockFn;
}
type MockRequest = Partial<Request> & { user?: { email: string; id: string } };

let mockRequest: MockRequest;
let mockResponse: MockResponseLike;
let mockDb: MockDb;

function asRequest(): Request {
  return mockRequest as unknown as Request;
}

function asResponse(): Response {
  return mockResponse as unknown as Response;
}

function anyArrayMatcher(): unknown {
  return expect.any(Array);
}

beforeEach(() => {
  vi.clearAllMocks();

  mockDb = db as unknown as MockDb;
  mockRequest = {
    params: {},
    body: {},
    user: { email: "user@example.com", id: "user-123" },
  };
  mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  mockVerifySceneOwnership.mockResolvedValue({
    sceneId: "scene-1",
    shotCount: 2,
  });
  mockVerifyShotOwnership.mockResolvedValue({
    shotId: "shot-1",
    sceneId: "scene-1",
    shotCount: 2,
  });
  mockGetShotSuggestion.mockResolvedValue("اقتراح بصري مناسب للمشهد");
});

describe("getShots", () => {
  it("يعيد اللقطات المرتبطة بالمشهد للمستخدم المصرح له", async () => {
    const mockShots = [
      { id: "shot-1", sceneId: "scene-1", shotNumber: 1 },
      { id: "shot-2", sceneId: "scene-1", shotNumber: 2 },
    ];
    const orderBy = vi.fn().mockResolvedValue(mockShots);
    const where = vi.fn().mockReturnValue({ orderBy });
    const from = vi.fn().mockReturnValue({ where });
    mockDb.select.mockReturnValueOnce({ from });

    mockRequest.params = { sceneId: "scene-1" };

    await shotsController.getShots(asRequest(), asResponse());

    expect(mockVerifySceneOwnership).toHaveBeenCalledWith(
      "scene-1",
      "user-123",
    );
    expect(orderBy).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: mockShots,
    });
  });

  it("يعيد 401 عند غياب المستخدم", async () => {
    delete mockRequest.user;
    mockRequest.params = { sceneId: "scene-1" };

    await shotsController.getShots(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(401);
  });

  it("يعيد 404 عندما يفشل التحقق من ملكية المشهد", async () => {
    mockVerifySceneOwnership.mockResolvedValueOnce(null);
    mockRequest.params = { sceneId: "scene-404" };

    await shotsController.getShots(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "المشهد غير موجود أو غير مصرح للوصول له",
    });
  });
});

describe("getShot", () => {
  it("يعيد لقطة واحدة بعد التحقق من الملكية", async () => {
    const mockShot = { id: "shot-1", sceneId: "scene-1", shotNumber: 1 };
    const limit = vi.fn().mockResolvedValue([mockShot]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    mockDb.select.mockReturnValueOnce({ from });

    mockRequest.params = { id: "shot-1" };

    await shotsController.getShot(asRequest(), asResponse());

    expect(mockVerifyShotOwnership).toHaveBeenCalledWith("shot-1", "user-123");
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: mockShot,
    });
  });

  it("يعيد 404 عندما لا تكون اللقطة متاحة أو غير مملوكة", async () => {
    mockVerifyShotOwnership.mockResolvedValueOnce(null);
    mockRequest.params = { id: "shot-404" };

    await shotsController.getShot(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "اللقطة غير موجودة أو غير مصرح للوصول لها",
    });
  });
});

describe("createShot", () => {
  it("ينشئ لقطة جديدة بالبيانات الصحيحة ويحدّث عدد اللقطات", async () => {
    const shotData = {
      sceneId: "scene-1",
      shotNumber: 3,
      shotType: "wide",
      cameraAngle: "high",
      cameraMovement: "static",
      lighting: "daylight",
    };
    const createdShot = { id: "shot-3", ...shotData };
    const insertReturning = vi.fn().mockResolvedValue([createdShot]);
    const insertValues = vi
      .fn()
      .mockReturnValue({ returning: insertReturning });
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });

    mockDb.insert.mockReturnValueOnce({ values: insertValues });
    mockDb.update.mockReturnValueOnce({ set: updateSet });
    mockRequest.body = shotData;

    await shotsController.createShot(asRequest(), asResponse());

    expect(mockVerifySceneOwnership).toHaveBeenCalledWith(
      "scene-1",
      "user-123",
    );
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم إنشاء اللقطة بنجاح",
      data: createdShot,
    });
  });

  it("يعيد 400 عندما تفشل مصادقة البيانات", async () => {
    mockRequest.body = {
      sceneId: "scene-1",
      shotNumber: 0,
    };

    await shotsController.createShot(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "بيانات غير صالحة",
      details: anyArrayMatcher(),
    });
  });

  it("يعيد 500 إذا لم تُرجع قاعدة البيانات لقطة مُنشأة", async () => {
    const shotData = {
      sceneId: "scene-1",
      shotNumber: 3,
      shotType: "wide",
      cameraAngle: "high",
      cameraMovement: "static",
      lighting: "daylight",
    };
    const insertReturning = vi.fn().mockResolvedValue([]);
    const insertValues = vi
      .fn()
      .mockReturnValue({ returning: insertReturning });

    mockDb.insert.mockReturnValueOnce({ values: insertValues });
    mockRequest.body = shotData;

    await shotsController.createShot(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "فشل إنشاء اللقطة",
    });
  });
});

describe("updateShot", () => {
  it("يحدّث اللقطة عند تحقق الملكية وصحة البيانات", async () => {
    const updatedShot = {
      id: "shot-1",
      sceneId: "scene-1",
      shotNumber: 1,
      shotType: "close-up",
      cameraAngle: "eye-level",
      cameraMovement: "dolly",
      lighting: "night",
    };
    const updateReturning = vi.fn().mockResolvedValue([updatedShot]);
    const updateWhere = vi.fn().mockReturnValue({ returning: updateReturning });
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });

    mockDb.update.mockReturnValueOnce({ set: updateSet });
    mockRequest.params = { id: "shot-1" };
    mockRequest.body = {
      shotType: "close-up",
      cameraAngle: "eye-level",
    };

    await shotsController.updateShot(asRequest(), asResponse());

    expect(mockVerifyShotOwnership).toHaveBeenCalledWith("shot-1", "user-123");
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم تحديث اللقطة بنجاح",
      data: updatedShot,
    });
  });

  it("يعيد 400 عند بيانات تحديث غير صالحة", async () => {
    mockRequest.params = { id: "shot-1" };
    mockRequest.body = {
      shotType: "",
    };

    await shotsController.updateShot(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "بيانات غير صالحة",
      details: anyArrayMatcher(),
    });
  });

  it("يعيد 404 عندما لا تكون اللقطة متاحة للتعديل", async () => {
    mockVerifyShotOwnership.mockResolvedValueOnce(null);
    mockRequest.params = { id: "shot-404" };
    mockRequest.body = { shotType: "medium" };

    await shotsController.updateShot(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "اللقطة غير موجودة أو غير مصرح لتعديلها",
    });
  });
});

describe("deleteShot", () => {
  it("يحذف اللقطة ويحدّث عدّاد المشهد", async () => {
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const updateWhere = vi.fn().mockResolvedValue(undefined);
    const updateSet = vi.fn().mockReturnValue({ where: updateWhere });

    mockDb.delete.mockReturnValueOnce({ where: deleteWhere });
    mockDb.update.mockReturnValueOnce({ set: updateSet });
    mockRequest.params = { id: "shot-1" };

    await shotsController.deleteShot(asRequest(), asResponse());

    expect(mockVerifyShotOwnership).toHaveBeenCalledWith("shot-1", "user-123");
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم حذف اللقطة بنجاح",
    });
  });

  it("يعيد 404 عندما لا تكون اللقطة متاحة للحذف", async () => {
    mockVerifyShotOwnership.mockResolvedValueOnce(null);
    mockRequest.params = { id: "shot-404" };

    await shotsController.deleteShot(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "اللقطة غير موجودة أو غير مصرح لحذفها",
    });
  });
});

describe("generateShotSuggestion", () => {
  it("يولد اقتراح لقطة عبر خدمة Gemini", async () => {
    mockRequest.body = {
      sceneDescription: "مشهد مطاردة في سوق مزدحم",
      shotType: "tracking",
    };

    await shotsController.generateShotSuggestion(asRequest(), asResponse());

    expect(mockGetShotSuggestion).toHaveBeenCalledWith(
      "مشهد مطاردة في سوق مزدحم",
      "tracking",
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم توليد اقتراحات اللقطة بنجاح",
      data: {
        suggestion: "اقتراح بصري مناسب للمشهد",
        sceneDescription: "مشهد مطاردة في سوق مزدحم",
        shotType: "tracking",
      },
    });
  });

  it("يعيد 400 عندما تنقص مدخلات اقتراح اللقطة", async () => {
    mockRequest.body = {
      sceneDescription: "مشهد ناقص",
    };

    await shotsController.generateShotSuggestion(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "وصف المشهد ونوع اللقطة مطلوبان",
    });
  });
});

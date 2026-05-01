import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";

import { CharactersController } from "./characters.controller";

import type { Request, Response } from "express";

const { mockLogger } = vi.hoisted(() => ({
  mockLogger: {
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("@/db", () => ({
  db: {
    delete: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/db/schema", () => ({
  characters: {
    id: "characters.id",
    name: "characters.name",
    projectId: "characters.projectId",
  },
  projects: {
    id: "projects.id",
    userId: "projects.userId",
  },
}));

vi.mock("@/middleware/auth.middleware", () => ({
  getParamAsString: (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value,
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...conditions: unknown[]) => ({ conditions, operator: "and" })),
  eq: vi.fn((column: unknown, value: unknown) => ({ column, value })),
}));

vi.mock("@/lib/logger", () => ({
  logger: mockLogger,
}));

type MockFn = ReturnType<typeof vi.fn>;
type MockRequest = Partial<Request> & {
  body: unknown;
  params: Record<string, string>;
  user?: { email: string; id: string };
};
type MockResponse = Response & {
  json: MockFn;
  status: MockFn;
};
interface MockDb {
  delete: MockFn;
  insert: MockFn;
  select: MockFn;
  update: MockFn;
}
interface ProjectRow {
  createdAt: Date;
  id: string;
  scriptContent: string | null;
  title: string;
  updatedAt: Date;
  userId: string;
}
interface CharacterRow {
  appearances: number;
  consistencyStatus: string | null;
  createdAt: Date;
  id: string;
  lastSeen: string | null;
  name: string;
  notes: string | null;
  projectId: string;
  updatedAt: Date;
}

let controller: CharactersController;
let mockDb: MockDb;
let mockRequest: MockRequest;
let mockResponse: MockResponse;

function asRequest(): Request {
  return mockRequest as unknown as Request;
}

function asResponse(): Response {
  return mockResponse;
}

function createMockResponse(): MockResponse {
  const response = {
    json: vi.fn(),
    status: vi.fn(),
  } as unknown as MockResponse;

  response.status.mockImplementation(() => response);
  response.json.mockImplementation(() => response);
  return response;
}

function projectRow(id = "project-1", userId = "user-123"): ProjectRow {
  return {
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    id,
    scriptContent: "مشهد افتتاحي",
    title: "مشروع الاختبار",
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    userId,
  };
}

function characterRow(
  id = "character-1",
  projectId = "project-1",
): CharacterRow {
  return {
    appearances: 2,
    consistencyStatus: "good",
    createdAt: new Date("2026-01-03T00:00:00.000Z"),
    id,
    lastSeen: "المشهد الثاني",
    name: "ليلى",
    notes: "قوس الشخصية واضح",
    projectId,
    updatedAt: new Date("2026-01-04T00:00:00.000Z"),
  };
}

function queueSelectRows(...rowsByCall: unknown[][]): void {
  for (const rows of rowsByCall) {
    const where = vi.fn().mockResolvedValue(rows);
    const from = vi.fn().mockReturnValue({ where });
    mockDb.select.mockReturnValueOnce({ from });
  }
}

function mockInsertReturning(rows: unknown[]): { values: MockFn } {
  const returning = vi.fn().mockResolvedValue(rows);
  const values = vi.fn().mockReturnValue({ returning });
  mockDb.insert.mockReturnValueOnce({ values });
  return { values };
}

function mockUpdateReturning(rows: unknown[]): { set: MockFn } {
  const returning = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ returning });
  const set = vi.fn().mockReturnValue({ where });
  mockDb.update.mockReturnValueOnce({ set });
  return { set };
}

function mockDeleteWhere(): MockFn {
  const where = vi.fn().mockResolvedValue(undefined);
  mockDb.delete.mockReturnValueOnce({ where });
  return where;
}

function detailsArrayMatcher(): unknown {
  return expect.any(Array);
}

beforeEach(() => {
  vi.clearAllMocks();
  controller = new CharactersController();
  mockDb = db as unknown as MockDb;
  mockRequest = {
    body: {},
    params: {},
    user: { email: "owner@example.com", id: "user-123" },
  };
  mockResponse = createMockResponse();
});

describe("جلب قائمة الشخصيات", () => {
  it("يعيد شخصيات المشروع بعد التحقق من ملكية المستخدم", async () => {
    const characters = [
      characterRow("character-1"),
      { ...characterRow("character-2"), name: "مروان" },
    ];
    queueSelectRows([projectRow()], characters);
    mockRequest.params = { projectId: "project-1" };

    await controller.getCharacters(asRequest(), asResponse());

    expect(mockDb.select).toHaveBeenCalledTimes(2);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: characters,
    });
  });

  it("يرفض الطلب عند غياب المستخدم المصادق", async () => {
    delete mockRequest.user;
    mockRequest.params = { projectId: "project-1" };

    await controller.getCharacters(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "غير مصرح",
    });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("يعيد خطأ طلب عند غياب معرف المشروع", async () => {
    await controller.getCharacters(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "معرف المشروع مطلوب",
    });
    expect(mockDb.select).not.toHaveBeenCalled();
  });

  it("يعيد عدم العثور عندما لا يملك المستخدم المشروع", async () => {
    queueSelectRows([]);
    mockRequest.params = { projectId: "project-404" };

    await controller.getCharacters(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "المشروع غير موجود",
    });
  });
});

describe("جلب شخصية واحدة", () => {
  it("يعيد الشخصية بعد التحقق من ملكية مشروعها", async () => {
    const character = characterRow();
    queueSelectRows([character], [projectRow()]);
    mockRequest.params = { id: "character-1" };

    await controller.getCharacter(asRequest(), asResponse());

    expect(mockDb.select).toHaveBeenCalledTimes(2);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: character,
    });
  });

  it("يعيد عدم العثور عند غياب الشخصية", async () => {
    queueSelectRows([]);
    mockRequest.params = { id: "missing-character" };

    await controller.getCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "الشخصية غير موجودة",
    });
  });

  it("يرفض الوصول عندما تكون الشخصية في مشروع غير مملوك", async () => {
    queueSelectRows([characterRow()], []);
    mockRequest.params = { id: "character-1" };

    await controller.getCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "غير مصرح للوصول لهذه الشخصية",
    });
  });
});

describe("إنشاء الشخصيات", () => {
  it("ينشئ شخصية صحيحة ويطبق القيم الافتراضية الصارمة", async () => {
    const createdCharacter = {
      ...characterRow("character-new"),
      appearances: 0,
      consistencyStatus: "good",
    };
    queueSelectRows([projectRow()]);
    const insert = mockInsertReturning([createdCharacter]);
    mockRequest.body = { name: "ليلى", projectId: "project-1" };

    await controller.createCharacter(asRequest(), asResponse());

    expect(insert.values).toHaveBeenCalledWith({
      appearances: 0,
      consistencyStatus: "good",
      name: "ليلى",
      projectId: "project-1",
    });
    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم إنشاء الشخصية بنجاح",
      data: createdCharacter,
    });
  });

  it("يرفض بيانات الإنشاء الفاسدة قبل الوصول لقاعدة البيانات", async () => {
    mockRequest.body = { appearances: -1, projectId: "project-1" };

    await controller.createCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "بيانات غير صالحة",
      details: detailsArrayMatcher(),
    });
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("يعيد عدم العثور عندما لا يكون المشروع مملوكًا للمستخدم", async () => {
    queueSelectRows([]);
    mockRequest.body = { name: "ليلى", projectId: "project-404" };

    await controller.createCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "المشروع غير موجود",
    });
    expect(mockDb.insert).not.toHaveBeenCalled();
  });

  it("يعيد خطأ خادم عندما لا ترجع قاعدة البيانات السجل المنشأ", async () => {
    queueSelectRows([projectRow()]);
    mockInsertReturning([]);
    mockRequest.body = { name: "ليلى", projectId: "project-1" };

    await controller.createCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "فشل إنشاء الشخصية",
    });
  });
});

describe("تحديث الشخصيات", () => {
  it("يحدث الشخصية بعد التحقق من الوجود والملكية وصحة البيانات", async () => {
    const updatedCharacter = {
      ...characterRow(),
      appearances: 3,
      consistencyStatus: "needs_review",
      name: "ليلى الجديدة",
    };
    queueSelectRows([characterRow()], [projectRow()]);
    const update = mockUpdateReturning([updatedCharacter]);
    mockRequest.params = { id: "character-1" };
    mockRequest.body = {
      appearances: 3,
      consistencyStatus: "needs_review",
      name: "ليلى الجديدة",
    };

    await controller.updateCharacter(asRequest(), asResponse());

    expect(update.set).toHaveBeenCalledWith(mockRequest.body);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم تحديث الشخصية بنجاح",
      data: updatedCharacter,
    });
  });

  it("يرفض بيانات التحديث الحدية غير الصالحة قبل القراءة من قاعدة البيانات", async () => {
    mockRequest.params = { id: "character-1" };
    mockRequest.body = { appearances: -1 };

    await controller.updateCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "بيانات غير صالحة",
      details: detailsArrayMatcher(),
    });
    expect(mockDb.select).not.toHaveBeenCalled();
    expect(mockDb.update).not.toHaveBeenCalled();
  });

  it("يعيد عدم العثور عند محاولة تحديث شخصية غير موجودة", async () => {
    queueSelectRows([]);
    mockRequest.params = { id: "missing-character" };
    mockRequest.body = { name: "اسم جديد" };

    await controller.updateCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "الشخصية غير موجودة",
    });
  });

  it("يرفض تحديث شخصية لا يملك المستخدم مشروعها", async () => {
    queueSelectRows([characterRow()], []);
    mockRequest.params = { id: "character-1" };
    mockRequest.body = { name: "اسم جديد" };

    await controller.updateCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "غير مصرح لتعديل هذه الشخصية",
    });
    expect(mockDb.update).not.toHaveBeenCalled();
  });
});

describe("حذف الشخصيات وأخطاء الاعتماد", () => {
  it("يحذف الشخصية بعد التحقق من ملكية مشروعها", async () => {
    queueSelectRows([characterRow()], [projectRow()]);
    const deleteWhere = mockDeleteWhere();
    mockRequest.params = { id: "character-1" };

    await controller.deleteCharacter(asRequest(), asResponse());

    expect(mockDb.delete).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم حذف الشخصية بنجاح",
    });
  });

  it("يعيد طلبًا غير صالح عند غياب معرف الشخصية في الحذف", async () => {
    await controller.deleteCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "معرف الشخصية مطلوب",
    });
    expect(mockDb.delete).not.toHaveBeenCalled();
  });

  it("يحمي مسار الجلب من أخطاء قاعدة البيانات الخارجية", async () => {
    mockDb.select.mockImplementationOnce(() => {
      throw new Error("database offline");
    });
    mockRequest.params = { projectId: "project-1" };

    await controller.getCharacters(asRequest(), asResponse());

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Get characters error:",
      expect.any(Error),
    );
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "حدث خطأ أثناء جلب الشخصيات",
    });
  });
});

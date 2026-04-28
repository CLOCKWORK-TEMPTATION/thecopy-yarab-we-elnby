import { Request, Response } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { charactersController } from "./characters.controller";

// Mock dependencies
vi.mock("@/db", () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  },
}));

vi.mock("@/db/schema", () => ({
  characters: { id: "characters.id" },
  projects: { id: "projects.id", userId: "projects.userId" },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  and: vi.fn((...conds: unknown[]) => ({ conditions: conds })),
}));

const dbMethods = [
  "select",
  "from",
  "where",
  "insert",
  "update",
  "delete",
  "values",
  "returning",
  "innerJoin",
  "limit",
  "orderBy",
  "set",
] as const;

type DbMethod = (typeof dbMethods)[number];
type MockFn = ReturnType<typeof vi.fn>;
type MockDb = Record<DbMethod, MockFn>;
type MockRequest = Partial<Request>;
type MockResponse = Partial<Response> & {
  status: MockFn;
  json: MockFn;
};

let mockRequest: MockRequest;
let mockResponse: MockResponse;
let mockDb: MockDb;

function asRequest(): Request {
  return mockRequest as Request;
}

function asResponse(): Response {
  return mockResponse as unknown as Response;
}

function anyArrayMatcher(): unknown {
  return expect.any(Array);
}

beforeEach(async () => {
  mockRequest = {
    params: {},
    body: {},
    user: { id: "user-123" },
  };

  mockResponse = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };

  const dbModule = await import("@/db");
  mockDb = dbModule.db as unknown as MockDb;

  vi.clearAllMocks();

  dbMethods.forEach((method) => {
    mockDb[method].mockReset().mockReturnThis();
  });
});

describe("getCharacters", () => {
  it("should return characters for authorized user", async () => {
    const mockProject = [{ id: "project-1", userId: "user-123" }];
    const mockCharacters = [
      { id: "char-1", name: "Test Character", projectId: "project-1" },
    ];

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce(mockProject),
      }),
    });

    mockDb.select.mockReturnValueOnce(mockCharacters);

    mockRequest.params = { projectId: "project-1" };

    await charactersController.getCharacters(asRequest(), asResponse());

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: mockCharacters,
    });
  });

  it("should return 401 for unauthorized user", async () => {
    mockRequest.user = undefined;

    await charactersController.getCharacters(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "غير مصرح",
    });
  });

  it("should return 400 when projectId is missing", async () => {
    mockRequest.params = {};

    await charactersController.getCharacters(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "معرف المشروع مطلوب",
    });
  });

  it("should return 404 when project not found", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([]),
      }),
    });

    mockRequest.params = { projectId: "nonexistent-project" };

    await charactersController.getCharacters(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "المشروع غير موجود",
    });
  });

  it("should handle database errors gracefully", async () => {
    mockDb.select.mockRejectedValueOnce(new Error("Database error"));

    mockRequest.params = { projectId: "project-1" };

    await charactersController.getCharacters(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "حدث خطأ أثناء جلب الشخصيات",
    });
  });
});

describe("getCharacter", () => {
  it("should return character for authorized user", async () => {
    const mockCharacter = {
      id: "char-1",
      name: "Test Character",
      projectId: "project-1",
    };
    const mockProject = [{ id: "project-1", userId: "user-123" }];

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([mockCharacter]),
      }),
    });

    mockDb.select.mockReturnValueOnce(mockProject);

    mockRequest.params = { id: "char-1" };

    await charactersController.getCharacter(asRequest(), asResponse());

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      data: mockCharacter,
    });
  });

  it("should return 404 when character not found", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([]),
      }),
    });

    mockRequest.params = { id: "nonexistent-character" };

    await charactersController.getCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "الشخصية غير موجودة",
    });
  });

  it("should return 403 when user does not own character project", async () => {
    const mockCharacter = {
      id: "char-1",
      name: "Test Character",
      projectId: "project-1",
    };
    const mockProject = []; // User doesn't own this project

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([mockCharacter]),
      }),
    });

    mockDb.select.mockReturnValueOnce(mockProject);

    mockRequest.params = { id: "char-1" };

    await charactersController.getCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "غير مصرح للوصول لهذه الشخصية",
    });
  });
});

describe("createCharacter", () => {
  it("should create character with valid data", async () => {
    const newCharacterData = {
      projectId: "project-1",
      name: "New Character",
      appearances: 5,
      consistencyStatus: "good",
    };

    const mockProject = [{ id: "project-1", userId: "user-123" }];
    const createdCharacter = { id: "char-new", ...newCharacterData };

    mockDb.select.mockReturnValueOnce(mockProject);

    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValueOnce({
        returning: vi.fn().mockReturnValueOnce([createdCharacter]),
      }),
    });

    mockRequest.body = newCharacterData;

    await charactersController.createCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(201);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم إنشاء الشخصية بنجاح",
      data: createdCharacter,
    });
  });

  it("should validate character data using Zod schema", async () => {
    const invalidData = {
      projectId: "",
      name: "",
    };

    mockRequest.body = invalidData;

    await charactersController.createCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "بيانات غير صالحة",
      details: anyArrayMatcher(),
    });
  });

  it("should return 404 when project does not exist", async () => {
    mockDb.select.mockReturnValueOnce([]);

    mockRequest.body = {
      projectId: "nonexistent-project",
      name: "Test Character",
    };

    await charactersController.createCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "المشروع غير موجود",
    });
  });

  it("should handle database insertion failure", async () => {
    mockDb.select.mockReturnValueOnce([
      { id: "project-1", userId: "user-123" },
    ]);

    mockDb.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValueOnce({
        returning: vi.fn().mockReturnValueOnce([]),
      }),
    });

    mockRequest.body = {
      projectId: "project-1",
      name: "Test Character",
    };

    await charactersController.createCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "فشل إنشاء الشخصية",
    });
  });
});

describe("updateCharacter", () => {
  it("should update character with valid data", async () => {
    const updateData = {
      name: "Updated Character Name",
      appearances: 10,
    };

    const existingCharacter = { id: "char-1", projectId: "project-1" };
    const mockProject = [{ id: "project-1", userId: "user-123" }];
    const updatedCharacter = { id: "char-1", ...updateData };

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([existingCharacter]),
      }),
    });

    mockDb.select.mockReturnValueOnce(mockProject);

    mockDb.update.mockReturnValueOnce({
      set: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockReturnValueOnce([updatedCharacter]),
        }),
      }),
    });

    mockRequest.params = { id: "char-1" };
    mockRequest.body = updateData;

    await charactersController.updateCharacter(asRequest(), asResponse());

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم تحديث الشخصية بنجاح",
      data: updatedCharacter,
    });
  });

  it("should return 404 when character does not exist", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([]),
      }),
    });

    mockRequest.params = { id: "nonexistent-character" };
    mockRequest.body = { name: "Updated Name" };

    await charactersController.updateCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "الشخصية غير موجودة",
    });
  });

  it("should validate update data using Zod schema", async () => {
    const existingCharacter = { id: "char-1", projectId: "project-1" };

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([existingCharacter]),
      }),
    });

    mockRequest.params = { id: "char-1" };
    mockRequest.body = {
      appearances: -1, // Invalid: negative number
    };

    await charactersController.updateCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "بيانات غير صالحة",
      details: anyArrayMatcher(),
    });
  });
});

describe("deleteCharacter", () => {
  it("should delete character successfully", async () => {
    const existingCharacter = { id: "char-1", projectId: "project-1" };
    const mockProject = [{ id: "project-1", userId: "user-123" }];

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([existingCharacter]),
      }),
    });

    mockDb.select.mockReturnValueOnce(mockProject);

    mockDb.delete.mockReturnValueOnce({
      where: vi.fn().mockReturnValueOnce(undefined),
    });

    mockRequest.params = { id: "char-1" };

    await charactersController.deleteCharacter(asRequest(), asResponse());

    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      message: "تم حذف الشخصية بنجاح",
    });
  });

  it("should return 404 when character does not exist", async () => {
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([]),
      }),
    });

    mockRequest.params = { id: "nonexistent-character" };

    await charactersController.deleteCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "الشخصية غير موجودة",
    });
  });

  it("should return 403 when user does not own character project", async () => {
    const existingCharacter = { id: "char-1", projectId: "project-1" };
    const mockProject = []; // User doesn't own this project

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([existingCharacter]),
      }),
    });

    mockDb.select.mockReturnValueOnce(mockProject);

    mockRequest.params = { id: "char-1" };

    await charactersController.deleteCharacter(asRequest(), asResponse());

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      error: "غير مصرح لحذف هذه الشخصية",
    });
  });
});

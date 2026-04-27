import supertest from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";

const { state, collectClauses, toRowKey } = vi.hoisted(() => {
  const state = {
    users: [] as {
      id: string;
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
    }[],
    tokens: new Map<string, string>(),
    projects: [] as {
      id: string;
      title: string;
      scriptContent?: string | null;
      userId: string;
      createdAt: Date;
      updatedAt: Date;
    }[],
    userSeq: 1,
    projectSeq: 1,
  };

  const toRowKey = (columnName: string): string =>
    columnName.replace(/_([a-z])/g, (_match, char: string) => char.toUpperCase());

  const collectClauses = (
    node: unknown,
    acc: { column: string; value: unknown }[] = []
  ) => {
    if (!node || typeof node !== "object") {
      return acc;
    }

    const queryNode = node as { queryChunks?: unknown[] };
    const chunks = Array.isArray(queryNode.queryChunks) ? queryNode.queryChunks : [];

    for (let index = 0; index < chunks.length; index += 1) {
      const current = chunks[index] as
        | { name?: string; queryChunks?: unknown[] }
        | undefined;
      const maybeSeparator = chunks[index + 1] as { value?: string[] } | undefined;
      const maybeParam = chunks[index + 2] as { value?: unknown } | undefined;

      if (
        current &&
        typeof current.name === "string" &&
        maybeSeparator &&
        Array.isArray(maybeSeparator.value) &&
        maybeSeparator.value.includes(" = ") &&
        maybeParam &&
        "value" in maybeParam
      ) {
        acc.push({ column: current.name, value: maybeParam.value });
      }

      collectClauses(current, acc);
    }

    return acc;
  };

  return { state, collectClauses, toRowKey };
});

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("@/editor/runtime", () => ({
  registerEditorRuntimeRoutes: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/memory", async () => {
  const express = await import("express");

  return {
    memoryHealthHandler: (_req: unknown, res: { json: (body: unknown) => void }) =>
      res.json({ success: true, status: "disabled" }),
    memoryRoutes: express.Router(),
    weaviateStore: {
      bootstrap: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn(() => ({
        enabled: false,
        required: false,
        state: "disabled",
      })),
    },
  };
});

vi.mock("@/services/auth.service", () => ({
  authService: {
    signup: vi.fn((email: string, password: string, firstName?: string, lastName?: string) => {
      const existingUser = state.users.find((user) => user.email === email);
      if (existingUser) {
        throw new Error("المستخدم موجود بالفعل");
      }

      const user = {
        id: `user-${state.userSeq++}`,
        email,
        password,
        firstName,
        lastName,
      };

      state.users.push(user);

      const accessToken = `token-${user.id}`;
      const refreshToken = `refresh-${user.id}`;
      state.tokens.set(accessToken, user.id);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }),

    login: vi.fn((email: string, password: string) => {
      const user = state.users.find(
        (candidate) => candidate.email === email && candidate.password === password
      );

      if (!user) {
        throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      }

      const accessToken = `token-${user.id}-${state.tokens.size + 1}`;
      const refreshToken = `refresh-${user.id}-${state.tokens.size + 1}`;
      state.tokens.set(accessToken, user.id);

      return {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      };
    }),

    getUserById: vi.fn((userId: string) => {
      const user = state.users.find((candidate) => candidate.id === userId);

      return user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          }
        : null;
    }),

    verifyToken: vi.fn((token: string) => {
      if (!token) {
        throw new Error("jwt must be provided");
      }

      const userId = state.tokens.get(token);
      if (!userId) {
        throw new Error("رمز التحقق غير صالح");
      }

      return { userId, sub: userId };
    }),

    revokeRefreshToken: vi.fn(() => undefined),
    refreshAccessToken: vi.fn(() => ({
      accessToken: "token-refreshed",
      refreshToken: "refresh-refreshed",
    })),
  },
}));

vi.mock("@/db", async () => {
  const schema = await import("@/db/schema");

  const filterProjects = (condition: unknown) => {
    const clauses = collectClauses(condition);
    if (clauses.length === 0) {
      return [...state.projects];
    }

    return state.projects.filter((project) =>
      clauses.every(({ column, value }) => {
        const rowKey = toRowKey(column);
        return project[rowKey as keyof typeof project] === value;
      })
    );
  };

  return {
    databaseAvailable: true,
    initializeDatabase: vi.fn().mockResolvedValue(undefined),
    closeDatabase: vi.fn().mockResolvedValue(undefined),
    pool: null,
    db: {
      select: vi.fn(() => ({
        from: (table: unknown) => {
          if (table !== schema.projects) {
            return {
              where: () => [],
              orderBy: () => [],
              then: (resolve: (value: unknown[]) => unknown) => resolve([]),
            };
          }

          const asQuery = (rows: typeof state.projects) => ({
            where: (condition: unknown) => asQuery(filterProjects(condition)),
            orderBy: () =>
              [...rows].sort(
                (left, right) =>
                  right.updatedAt.getTime() - left.updatedAt.getTime()
              ),
            limit: (limit: number) => rows.slice(0, limit),
            then: (
              resolve: (value: typeof rows) => unknown,
              reject?: (reason: unknown) => unknown
            ) => Promise.resolve([...rows]).then(resolve, reject),
          });

          return asQuery([...state.projects]);
        },
      })),

      insert: vi.fn((table: unknown) => ({
        values: (values: Record<string, unknown>) => {
          if (table !== schema.projects) {
            return {
              returning: () => [],
            };
          }

          const now = new Date();
          const project = {
            id: `project-${state.projectSeq++}`,
            title: String(values.title),
            scriptContent:
              typeof values.scriptContent === "string"
                ? values.scriptContent
                : null,
            userId: String(values.userId),
            createdAt: now,
            updatedAt: now,
          };

          state.projects.push(project);

          return {
            returning: () => [project],
          };
        },
      })),

      update: vi.fn(() => ({
        set: () => ({
          where: () => ({
            returning: () => [],
          }),
        }),
      })),

      delete: vi.fn(() => ({
        where: () => ({ rowCount: 0 }),
      })),
    },
  };
});

import { app } from "@/server";

const request = supertest(app);

function extractCookieValue(
  cookies: string[] | undefined,
  cookieName: string
): string | undefined {
  return cookies
    ?.find((cookie) => cookie.startsWith(`${cookieName}=`))
    ?.split(";")[0]
    ?.split("=")[1];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function responseBody(response: { body: unknown }): Record<string, unknown> {
  return asRecord(response.body);
}

function nestedRecord(source: Record<string, unknown>, field: string): Record<string, unknown> {
  return asRecord(source[field]);
}

function stringField(source: Record<string, unknown>, field: string): string | undefined {
  const value = source[field];
  return typeof value === "string" ? value : undefined;
}

function arrayField(source: Record<string, unknown>, field: string): unknown[] {
  const value = source[field];
  return Array.isArray(value) ? value : [];
}

describe("Controllers Integration Tests", () => {
  let token: string;
  let csrfToken: string;
  let authCookies: string[] = [];

  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: "TestPass123!",
  };

  beforeAll(async () => {
    state.users.length = 0;
    state.tokens.clear();
    state.projects.length = 0;
    state.userSeq = 1;
    state.projectSeq = 1;

    const signupResponse = await request
      .post("/api/auth/signup")
      .send(testUser)
      .expect(201);

    const signupBody = responseBody(signupResponse);
    const signupData = nestedRecord(signupBody, "data");
    token = stringField(signupData, "token") ?? "";
    authCookies = signupResponse.headers["set-cookie"] ?? [];
    csrfToken =
      extractCookieValue(authCookies, "XSRF-TOKEN") ?? "";

    if (!token || !csrfToken) {
      throw new Error("Authentication setup failed");
    }
  });

  describe("Auth Controller", () => {
    it("should login existing user", async () => {
      const response = await request
        .post("/api/auth/login")
        .send(testUser)
        .expect(200);

      const body = responseBody(response);
      const data = nestedRecord(body, "data");
      expect(body["success"]).toBe(true);
      expect(data["token"]).toBeDefined();
    });

    it("should get current user", async () => {
      const response = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = responseBody(response);
      const data = nestedRecord(body, "data");
      const user = nestedRecord(data, "user");
      expect(body["success"]).toBe(true);
      expect(user).toBeDefined();
      expect(user["email"]).toBe(testUser.email);
    });
  });

  describe("Projects Controller", () => {
    it("should create a new project", async () => {
      const response = await request
        .post("/api/projects")
        .set("Authorization", `Bearer ${token}`)
        .set("Cookie", authCookies)
        .set("X-XSRF-TOKEN", csrfToken)
        .send({
          title: "Test Project",
          scriptContent: "This is a test script.",
        })
        .expect(201);

      const body = responseBody(response);
      const data = nestedRecord(body, "data");
      expect(body["success"]).toBe(true);
      expect(data["title"]).toBe("Test Project");
      expect(data["id"]).toBeDefined();
    });

    it("should get all projects", async () => {
      await request
        .post("/api/projects")
        .set("Authorization", `Bearer ${token}`)
        .set("Cookie", authCookies)
        .set("X-XSRF-TOKEN", csrfToken)
        .send({
          title: "Seed Project",
          scriptContent: "Seed script",
        })
        .expect(201);

      const response = await request
        .get("/api/projects")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = responseBody(response);
      const data = arrayField(body, "data");
      expect(body["success"]).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Analysis Controller", () => {
    it("should get analysis stations info", async () => {
      const response = await request
        .get("/api/analysis/stations-info")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const body = responseBody(response);
      expect(body["stations"]).toBeDefined();
      expect(body["totalStations"]).toBe(7);
    });
  });
});

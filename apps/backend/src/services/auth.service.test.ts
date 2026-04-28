import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { describe, it, expect, beforeEach, vi } from "vitest";

const { dbMock } = vi.hoisted(() => ({
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("../db", () => ({ db: dbMock }));
vi.mock("bcrypt");
vi.mock("jsonwebtoken");

import { AuthService } from "./auth.service";

const TEST_PASSWORD = "StrongPass123!";

let authService: AuthService;

beforeEach(() => {
  authService = new AuthService();
  vi.clearAllMocks();
});

describe("AuthService > signup", () => {
  it("should successfully create a new user", async () => {
    const email = "user@example.com";
    const password = TEST_PASSWORD;
    const firstName = "Test";
    const lastName = "User";
    const userId = "test-user-123";
    const hashedPassword = "mock-hashed-password";
    const token = "mock-jwt-token";

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);

    dbMock.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: userId,
            email,
            passwordHash: hashedPassword,
            firstName,
            lastName,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    });

    vi.mocked(jwt.sign).mockReturnValue(token as never);

    const result = await authService.signup(
      email,
      password,
      firstName,
      lastName,
    );

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: token,
        refreshToken: expect.any(String) as unknown,
        user: expect.objectContaining({
          id: userId,
          email,
          firstName,
          lastName,
        }) as unknown,
      }),
    );
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
  });

  it("should throw error if user already exists", async () => {
    const email = "existing@example.com";
    const password = TEST_PASSWORD;

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: "existing-user", email }]),
        }),
      }),
    });

    await expect(authService.signup(email, password)).rejects.toThrow(
      "المستخدم موجود بالفعل",
    );
  });

  it("should handle optional firstName and lastName", async () => {
    const email = "test@example.com";
    const password = TEST_PASSWORD;
    const userId = "user-123";
    const hashedPassword = "hashed-password";
    const token = "jwt-token";

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);

    dbMock.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: userId,
            email,
            passwordHash: hashedPassword,
            firstName: null,
            lastName: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]),
      }),
    });

    vi.mocked(jwt.sign).mockReturnValue(token as never);

    const result = await authService.signup(email, password);

    expect(result.user.firstName).toBeNull();
    expect(result.user.lastName).toBeNull();
  });
});

describe("AuthService > login", () => {
  it("should successfully login with valid credentials", async () => {
    const email = "test@example.com";
    const password = TEST_PASSWORD;
    const userId = "user-123";
    const hashedPassword = "hashed-password";
    const token = "jwt-token";

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: userId,
              email,
              passwordHash: hashedPassword,
              firstName: "Test",
              lastName: "User",
            },
          ]),
        }),
      }),
    });

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(jwt.sign).mockReturnValue(token as never);

    const result = await authService.login(email, password);

    expect(result).toEqual(
      expect.objectContaining({
        accessToken: token,
        refreshToken: expect.any(String) as unknown,
        user: expect.objectContaining({ id: userId, email }) as unknown,
      }),
    );
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
  });

  it("should throw error if user not found", async () => {
    const email = "nonexistent@example.com";
    const password = TEST_PASSWORD;

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(authService.login(email, password)).rejects.toThrow(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    );
  });

  it("should throw error if password is invalid", async () => {
    const email = "test@example.com";
    const password = "wrong_" + TEST_PASSWORD;
    const hashedPassword = "hashed-password";

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              { id: "user-123", email, passwordHash: hashedPassword },
            ]),
        }),
      }),
    });

    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(authService.login(email, password)).rejects.toThrow(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    );
  });
});

describe("AuthService > getUserById", () => {
  it("should return user by id without password hash", async () => {
    const userId = "user-123";
    const mockUser = {
      id: userId,
      email: "test@example.com",
      passwordHash: "hashed-password",
      firstName: "Test",
      lastName: "User",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    });

    const result = await authService.getUserById(userId);

    expect(result).toEqual(
      expect.objectContaining({ id: userId, email: "test@example.com" }),
    );
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("should return null if user not found", async () => {
    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    expect(await authService.getUserById("nonexistent-user")).toBeNull();
  });
});

describe("AuthService > verifyToken", () => {
  it("should successfully verify valid token", () => {
    const token = "valid-jwt-token";
    const userId = "user-123";

    vi.mocked(jwt.verify).mockReturnValue({ userId } as never);

    const result = authService.verifyToken(token);

    expect(result).toEqual({ userId, sub: userId });
    expect(jwt.verify).toHaveBeenCalledWith(
      token,
      expect.any(String),
      undefined,
    );
  });

  it("should throw error for invalid token", () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("Invalid token");
    });

    expect(() => authService.verifyToken("invalid-token")).toThrow(
      "رمز التحقق غير صالح",
    );
  });

  it("should throw error for expired token", () => {
    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error("jwt expired");
    });

    expect(() => authService.verifyToken("expired-token")).toThrow(
      "رمز التحقق غير صالح",
    );
  });
});

describe("AuthService > refreshAccessToken", () => {
  it("should rotate refresh tokens and issue a new access token", async () => {
    const refreshToken = "stored-refresh-token";
    const userId = "user-123";
    const accessToken = "rotated-access-token";

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: "refresh-token-row",
              userId,
              token: refreshToken,
              expiresAt: new Date(Date.now() + 60_000),
            },
          ]),
        }),
      }),
    });

    dbMock.delete.mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    dbMock.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    vi.mocked(jwt.sign).mockReturnValue(accessToken as never);

    const result = await authService.refreshAccessToken(refreshToken);

    expect(result).toEqual(
      expect.objectContaining({
        accessToken,
        refreshToken: expect.any(String) as unknown,
      }),
    );
    expect(dbMock.delete).toHaveBeenCalled();
  });
});

describe("AuthService > signup - edge cases", () => {
  it("should throw error when user creation returns empty array", async () => {
    const email = "test@example.com";
    const password = TEST_PASSWORD;
    const hashedPassword = "hashed-password";

    dbMock.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);

    dbMock.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      }),
    });

    await expect(authService.signup(email, password)).rejects.toThrow(
      "فشل إنشاء المستخدم",
    );
  });
});

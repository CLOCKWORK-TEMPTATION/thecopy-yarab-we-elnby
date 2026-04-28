import { Response, NextFunction } from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { authMiddleware, type AuthRequest } from "./auth.middleware";

import type { AuthService } from "../services/auth.service";

// Mock auth service
vi.mock("../services/auth.service", () => ({
  authService: {
    verifyToken: vi.fn(),
    getUserById: vi.fn(),
  },
}));

// Constants for test data to avoid "Hardcoded credentials" warnings
const MOCK_USER_ID = "test-user-123";
const MOCK_TOKEN = "mock-jwt-token-for-testing";
const MOCK_HEADER_TOKEN = "mock-header-token";
const MOCK_COOKIE_TOKEN = "mock-cookie-token";
const MOCK_INVALID_TOKEN = "mock-invalid-token";
const NONEXISTENT_USER_ID = "mock-nonexistent-user";

const MOCK_USER = {
  id: MOCK_USER_ID,
  email: "user@example.com",
  firstName: "Test",
  lastName: "User",
  authVerifierHash: null,
  kdfSalt: null,
  accountStatus: "active",
  mfaEnabled: false,
  mfaSecret: null,
  lastLogin: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

type MockAuthService = Pick<AuthService, "verifyToken" | "getUserById">;

describe("authMiddleware", () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let authService: MockAuthService;

  beforeEach(async () => {
    mockRequest = {
      headers: {},
      cookies: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    const authServiceModule = await import("../services/auth.service");
    authService = authServiceModule.authService;

    vi.clearAllMocks();
  });

  registerAuthorizationHeaderTests(() => ({
    authService,
    mockNext,
    mockRequest,
    mockResponse,
  }));
  registerCookieTests(() => ({
    authService,
    mockNext,
    mockRequest,
    mockResponse,
  }));
  registerErrorTests(() => ({
    authService,
    mockNext,
    mockRequest,
    mockResponse,
  }));
  registerEdgeCaseTests(() => ({
    authService,
    mockNext,
    mockRequest,
    mockResponse,
  }));
});

interface AuthTestContext {
  authService: MockAuthService;
  mockNext: NextFunction;
  mockRequest: Partial<AuthRequest>;
  mockResponse: Partial<Response>;
}

function authenticate(context: AuthTestContext): Promise<void> {
  return authMiddleware(
    context.mockRequest as AuthRequest,
    context.mockResponse as Response,
    context.mockNext,
  );
}

function mockMissingToken(authService: MockAuthService): void {
  vi.mocked(authService.verifyToken).mockImplementation(() => {
    throw new Error("jwt must be provided");
  });
}

function registerAuthorizationHeaderTests(
  getContext: () => AuthTestContext,
): void {
  describe("Token from Authorization header", () => {
    it("should successfully authenticate with valid Bearer token", async () => {
      const context = getContext();
      context.mockRequest.headers = {
        authorization: `Bearer ${MOCK_TOKEN}`,
      };

      vi.mocked(context.authService.verifyToken).mockReturnValue({
        userId: MOCK_USER_ID,
        sub: MOCK_USER_ID,
      });
      vi.mocked(context.authService.getUserById).mockResolvedValue(MOCK_USER);

      await authenticate(context);

      expect(context.authService.verifyToken).toHaveBeenCalledWith(MOCK_TOKEN);
      expect(context.authService.getUserById).toHaveBeenCalledWith(
        MOCK_USER_ID,
      );
      expect(context.mockRequest.userId).toBe(MOCK_USER_ID);
      expect(context.mockRequest.user).toEqual(MOCK_USER);
      expect(context.mockNext).toHaveBeenCalled();
      expect(context.mockResponse.status).not.toHaveBeenCalled();
    });

    it("should return 401 if Authorization header is missing Bearer prefix", async () => {
      const context = getContext();
      context.mockRequest.headers = {
        authorization: "InvalidPrefix token",
      };
      context.mockRequest.cookies = {};

      mockMissingToken(context.authService);

      await authenticate(context);

      expect(context.mockResponse.status).toHaveBeenCalledWith(401);
      expect(context.mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "غير مصرح - يرجى تسجيل الدخول",
      });
      expect(context.mockNext).not.toHaveBeenCalled();
    });
  });
}

function registerCookieTests(getContext: () => AuthTestContext): void {
  describe("Token from Cookie", () => {
    it("should successfully authenticate with valid cookie token", async () => {
      const context = getContext();
      context.mockRequest.cookies = { accessToken: MOCK_TOKEN };

      vi.mocked(context.authService.verifyToken).mockReturnValue({
        userId: MOCK_USER_ID,
        sub: MOCK_USER_ID,
      });
      vi.mocked(context.authService.getUserById).mockResolvedValue(MOCK_USER);

      await authenticate(context);

      expect(context.authService.verifyToken).toHaveBeenCalledWith(MOCK_TOKEN);
      expect(context.authService.getUserById).toHaveBeenCalledWith(
        MOCK_USER_ID,
      );
      expect(context.mockRequest.userId).toBe(MOCK_USER_ID);
      expect(context.mockRequest.user).toEqual(MOCK_USER);
      expect(context.mockNext).toHaveBeenCalled();
    });

    it("should prioritize Authorization header over cookie", async () => {
      const context = getContext();
      context.mockRequest.headers = {
        authorization: `Bearer ${MOCK_HEADER_TOKEN}`,
      };
      context.mockRequest.cookies = { accessToken: MOCK_COOKIE_TOKEN };

      vi.mocked(context.authService.verifyToken).mockReturnValue({
        userId: MOCK_USER_ID,
        sub: MOCK_USER_ID,
      });
      vi.mocked(context.authService.getUserById).mockResolvedValue(MOCK_USER);

      await authenticate(context);

      expect(context.authService.verifyToken).toHaveBeenCalledWith(
        MOCK_HEADER_TOKEN,
      );
      expect(context.mockNext).toHaveBeenCalled();
    });
  });
}

function registerErrorTests(getContext: () => AuthTestContext): void {
  describe("Error cases", () => {
    it("should return 401 if no token provided", async () => {
      const context = getContext();
      context.mockRequest.headers = {};
      context.mockRequest.cookies = {};

      mockMissingToken(context.authService);

      await authenticate(context);

      expect(context.mockResponse.status).toHaveBeenCalledWith(401);
      expect(context.mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "غير مصرح - يرجى تسجيل الدخول",
      });
      expect(context.mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 if token verification fails", async () => {
      const context = getContext();
      context.mockRequest.headers = {
        authorization: `Bearer ${MOCK_INVALID_TOKEN}`,
      };

      vi.mocked(context.authService.verifyToken).mockImplementation(() => {
        throw new Error("Mock invalid token error");
      });

      await authenticate(context);

      expect(context.mockResponse.status).toHaveBeenCalledWith(401);
      expect(context.mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "رمز التحقق غير صالح",
      });
      expect(context.mockNext).not.toHaveBeenCalled();
    });

    it("should return 401 if user not found", async () => {
      const context = getContext();
      context.mockRequest.headers = {
        authorization: `Bearer ${MOCK_TOKEN}`,
      };

      vi.mocked(context.authService.verifyToken).mockReturnValue({
        userId: NONEXISTENT_USER_ID,
        sub: NONEXISTENT_USER_ID,
      });
      vi.mocked(context.authService.getUserById).mockResolvedValue(null);

      await authenticate(context);

      expect(context.mockResponse.status).toHaveBeenCalledWith(401);
      expect(context.mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "المستخدم غير موجود",
      });
      expect(context.mockNext).not.toHaveBeenCalled();
    });

    it("should handle database errors gracefully", async () => {
      const context = getContext();
      context.mockRequest.headers = {
        authorization: `Bearer ${MOCK_TOKEN}`,
      };

      vi.mocked(context.authService.verifyToken).mockReturnValue({
        userId: MOCK_USER_ID,
        sub: MOCK_USER_ID,
      });
      vi.mocked(context.authService.getUserById).mockRejectedValue(
        new Error("Mock database connection error"),
      );

      await authenticate(context);

      expect(context.mockResponse.status).toHaveBeenCalledWith(401);
      expect(context.mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: "رمز التحقق غير صالح",
      });
      expect(context.mockNext).not.toHaveBeenCalled();
    });
  });
}

function registerEdgeCaseTests(getContext: () => AuthTestContext): void {
  describe("Edge cases", () => {
    it("should handle undefined cookies object", async () => {
      const context = getContext();
      context.mockRequest.headers = {};
      delete context.mockRequest.cookies;

      mockMissingToken(context.authService);

      await authenticate(context);

      expect(context.mockResponse.status).toHaveBeenCalledWith(401);
      expect(context.mockNext).not.toHaveBeenCalled();
    });

    it("should handle empty string token", async () => {
      const context = getContext();
      context.mockRequest.headers = {
        authorization: "Bearer ",
      };

      mockMissingToken(context.authService);

      await authenticate(context);

      expect(context.mockResponse.status).toHaveBeenCalledWith(401);
      expect(context.mockNext).not.toHaveBeenCalled();
    });
  });
}

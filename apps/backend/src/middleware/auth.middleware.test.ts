import { Response, NextFunction } from 'express';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { authMiddleware, type AuthRequest } from './auth.middleware';

// Mock auth service
vi.mock('../services/auth.service', () => ({
  authService: {
    verifyToken: vi.fn(),
    getUserById: vi.fn(),
  },
}));

// Constants for test data to avoid "Hardcoded credentials" warnings
const MOCK_USER_ID = 'test-user-123';
const MOCK_TOKEN = 'mock-jwt-token-for-testing';
const MOCK_HEADER_TOKEN = 'mock-header-token';
const MOCK_COOKIE_TOKEN = 'mock-cookie-token';
const MOCK_INVALID_TOKEN = 'mock-invalid-token';
const NONEXISTENT_USER_ID = 'mock-nonexistent-user';

const MOCK_USER = {
  id: MOCK_USER_ID,
  email: 'user@example.com',
  firstName: 'Test',
  lastName: 'User',
};

describe('authMiddleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let authService: any;

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

    const authServiceModule = await import('../services/auth.service');
    authService = authServiceModule.authService;

    vi.clearAllMocks();
  });

  describe('Token from Authorization header', () => {
    it('should successfully authenticate with valid Bearer token', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${MOCK_TOKEN}`,
      };

      vi.mocked(authService.verifyToken).mockReturnValue({ userId: MOCK_USER_ID });
      vi.mocked(authService.getUserById).mockResolvedValue(MOCK_USER);

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(authService.verifyToken).toHaveBeenCalledWith(MOCK_TOKEN);
      expect(authService.getUserById).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(mockRequest.userId).toBe(MOCK_USER_ID);
      expect(mockRequest.user).toEqual(MOCK_USER);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should return 401 if Authorization header is missing Bearer prefix', async () => {
      mockRequest.headers = {
        authorization: 'InvalidPrefix token',
      };
      mockRequest.cookies = {};

      vi.mocked(authService.verifyToken).mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح - يرجى تسجيل الدخول',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Token from Cookie', () => {
    it('should successfully authenticate with valid cookie token', async () => {
      mockRequest.cookies = { accessToken: MOCK_TOKEN };

      vi.mocked(authService.verifyToken).mockReturnValue({ userId: MOCK_USER_ID });
      vi.mocked(authService.getUserById).mockResolvedValue(MOCK_USER);

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(authService.verifyToken).toHaveBeenCalledWith(MOCK_TOKEN);
      expect(authService.getUserById).toHaveBeenCalledWith(MOCK_USER_ID);
      expect(mockRequest.userId).toBe(MOCK_USER_ID);
      expect(mockRequest.user).toEqual(MOCK_USER);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should prioritize Authorization header over cookie', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${MOCK_HEADER_TOKEN}`,
      };
      mockRequest.cookies = { accessToken: MOCK_COOKIE_TOKEN };

      vi.mocked(authService.verifyToken).mockReturnValue({ userId: MOCK_USER_ID });
      vi.mocked(authService.getUserById).mockResolvedValue(MOCK_USER);

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(authService.verifyToken).toHaveBeenCalledWith(MOCK_HEADER_TOKEN);
      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error cases', () => {
    it('should return 401 if no token provided', async () => {
      mockRequest.headers = {};
      mockRequest.cookies = {};

      vi.mocked(authService.verifyToken).mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح - يرجى تسجيل الدخول',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token verification fails', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${MOCK_INVALID_TOKEN}`,
      };

      vi.mocked(authService.verifyToken).mockImplementation(() => {
        throw new Error('Mock invalid token error');
      });

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'رمز التحقق غير صالح',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if user not found', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${MOCK_TOKEN}`,
      };

      vi.mocked(authService.verifyToken).mockReturnValue({ userId: NONEXISTENT_USER_ID });
      vi.mocked(authService.getUserById).mockResolvedValue(null);

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'المستخدم غير موجود',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${MOCK_TOKEN}`,
      };

      vi.mocked(authService.verifyToken).mockReturnValue({ userId: MOCK_USER_ID });
      vi.mocked(authService.getUserById).mockRejectedValue(
        new Error('Mock database connection error')
      );

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'رمز التحقق غير صالح',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined cookies object', async () => {
      mockRequest.headers = {};
      delete mockRequest.cookies;

      vi.mocked(authService.verifyToken).mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle empty string token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer ',
      };

      vi.mocked(authService.verifyToken).mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      await authMiddleware(
        mockRequest as AuthRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});

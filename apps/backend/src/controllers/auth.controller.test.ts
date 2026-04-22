import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthController } from './auth.controller';
import { Request, Response } from 'express';
import { z } from 'zod';

// تعريف نوع المستخدم للاختبار - User type definition for testing
interface UserPayload {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// Test Constants
const TEST_PASSWORD = 'StrongPass123!';
const INVALID_PASSWORD_TOO_SHORT = 'abc';
const INVALID_PASSWORD_EMPTY = '';

// Mock dependencies
vi.mock('../services/auth.service', () => ({
  authService: {
    signup: vi.fn(),
    login: vi.fn(),
    getUserById: vi.fn(),
    revokeRefreshToken: vi.fn(),
  },
}));

vi.mock('../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AuthController', () => {
  let authController: AuthController;
  // تعريف mockRequest مع دعم خاصية user
  // Define mockRequest with support for user property
  let mockRequest: Partial<Request> & { user?: UserPayload };
  let mockResponse: Partial<Response>;
  let authService: any;

  beforeEach(async () => {
    authController = new AuthController();

    mockRequest = {
      body: {},
      cookies: {},
    };

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      clearCookie: vi.fn().mockReturnThis(),
    };

    const authServiceModule = await import('../services/auth.service');
    authService = authServiceModule.authService;

    vi.clearAllMocks();
  });

  describe('signup', () => {
    it('should successfully create a new user', async () => {
      const signupData = {
        email: 'test@example.com',
        password: TEST_PASSWORD,
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: 'user-123',
        email: signupData.email,
        firstName: signupData.firstName,
        lastName: signupData.lastName,
      };

      const mockToken = 'jwt-token';
      const mockRefreshToken = 'refresh-token';

      mockRequest.body = signupData;

      vi.mocked(authService.signup).mockResolvedValue({
        accessToken: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      });

      await authController.signup(mockRequest as Request, mockResponse as Response);

      expect(authService.signup).toHaveBeenCalledWith(
        signupData.email,
        signupData.password,
        signupData.firstName,
        signupData.lastName
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', expect.any(String), expect.any(Object));
      expect(mockResponse.cookie).toHaveBeenCalledWith('accessToken', mockToken, {
        httpOnly: true,
        secure: false, // In test environment
        maxAge: 15 * 60 * 1000,
        sameSite: 'strict',
      });

      expect(mockResponse["status"]).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'تم إنشاء الحساب بنجاح',
        data: {
          user: mockUser,
          token: mockToken,
        },
      });
    });

    it('should handle validation errors', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: INVALID_PASSWORD_TOO_SHORT,
      };

      await authController.signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse["status"]).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'بيانات غير صالحة',
        details: expect.any(Array),
      });
    });

    it('should handle duplicate email error', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: TEST_PASSWORD,
      };

      vi.mocked(authService.signup).mockRejectedValue(
        new Error('المستخدم موجود بالفعل')
      );

      await authController.signup(mockRequest as Request, mockResponse as Response);

      expect(mockResponse["status"]).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'المستخدم موجود بالفعل',
      });
    });

    it('should work with optional firstName and lastName', async () => {
      const signupData = {
        email: 'test@example.com',
        password: TEST_PASSWORD,
      };

      const mockUser = {
        id: 'user-123',
        email: signupData.email,
      };

      const mockToken = 'jwt-token';
      const mockRefreshToken = 'refresh-token';

      mockRequest.body = signupData;

      vi.mocked(authService.signup).mockResolvedValue({
        accessToken: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      });

      await authController.signup(mockRequest as Request, mockResponse as Response);

      expect(authService.signup).toHaveBeenCalledWith(
        signupData.email,
        signupData.password,
        undefined,
        undefined
      );
    });
  });

  describe('login', () => {
    it('should successfully login user', async () => {
      const loginData = {
        email: 'test@example.com',
        password: TEST_PASSWORD,
      };

      const mockUser = {
        id: 'user-123',
        email: loginData.email,
      };

      const mockToken = 'jwt-token';
      const mockRefreshToken = 'refresh-token';

      mockRequest.body = loginData;

      vi.mocked(authService.login).mockResolvedValue({
        accessToken: mockToken,
        refreshToken: mockRefreshToken,
        user: mockUser,
      });

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(authService.login).toHaveBeenCalledWith(
        loginData.email,
        loginData.password
      );

      expect(mockResponse.cookie).toHaveBeenCalledWith('refreshToken', expect.any(String), expect.any(Object));
      expect(mockResponse.cookie).toHaveBeenCalledWith('accessToken', mockToken, {
        httpOnly: true,
        secure: false,
        maxAge: 15 * 60 * 1000,
        sameSite: 'strict',
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'تم تسجيل الدخول بنجاح',
        data: {
          user: mockUser,
          token: mockToken,
        },
      });
    });

    it('should handle validation errors', async () => {
      mockRequest.body = {
        email: 'invalid-email',
        password: INVALID_PASSWORD_EMPTY,
      };

      await authController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse["status"]).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'بيانات غير صالحة',
        details: expect.any(Array),
      });
    });

    it('should handle invalid credentials', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'wrong_' + TEST_PASSWORD,
      };

      vi.mocked(authService.login).mockRejectedValue(
        new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      );

      await authController.login(mockRequest as Request, mockResponse as Response);

      // Login errors return 401 instead of 400
      expect(mockResponse["status"]).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockRequest.cookies = { refreshToken: 'refresh-token' };

      await authController.logout(mockRequest as Request, mockResponse as Response);

      expect(authService.revokeRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: 'تم تسجيل الخروج بنجاح',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
      };

      mockRequest.user = mockUser;

      await authController.getCurrentUser(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: { user: mockUser },
      });
    });

    it('should return 401 if user not authenticated', async () => {
      mockRequest.user = undefined;

      await authController.getCurrentUser(
        mockRequest as any,
        mockResponse as Response
      );

      expect(mockResponse["status"]).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: 'غير مصرح',
      });
    });
  });
});

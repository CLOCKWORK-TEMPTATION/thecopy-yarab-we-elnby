/**
 * اختبارات وحدة — Auth Middleware [UTP-004]
 *
 * يتحقق من:
 * - verifyToken: token صحيح / منتهي / مزوّر / بدون token
 * - requireAuth: استخراج token من header / cookie
 * - رسائل الخطأ المناسبة لكل حالة
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Request, Response, NextFunction } from 'express';

// ─── Mock لـ authService (vi.hoisted لتجنب مشكلة الترتيب) ───
const { mockVerifyToken, mockGetUserById } = vi.hoisted(() => ({
  mockVerifyToken: vi.fn(),
  mockGetUserById: vi.fn(),
}));

vi.mock('@/services/auth.service', () => ({
  authService: {
    verifyToken: mockVerifyToken,
    getUserById: mockGetUserById,
  },
}));

import { authMiddleware } from '@/middleware/auth.middleware';

// ─── مساعدات بناء كائنات الطلب والاستجابة الوهمية ───

function createMockReq(overrides: Partial<Request> & {
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
} = {}): Request {
  return {
    headers: {},
    cookies: {},
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

// ═══ اختبارات Auth Middleware ═══

describe('authMiddleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  // ─── المصادقة الناجحة ───

  describe('مصادقة ناجحة', () => {
    it('يجب أن يمرر الطلب عند وجود Bearer token صحيح في header', async () => {
      const mockUser = { id: 'user-1', email: 'test@test.com', role: 'user' };

      mockVerifyToken.mockReturnValue({ userId: 'user-1' });
      mockGetUserById.mockResolvedValue(mockUser);

      const req = createMockReq({
        headers: { authorization: 'Bearer valid-token-123' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token-123');
      expect(mockGetUserById).toHaveBeenCalledWith('user-1');
      expect(req.userId).toBe('user-1');
      expect(req.user).toEqual(mockUser);
      expect(next).toHaveBeenCalled();
    });

    it('يجب أن يمرر الطلب عند وجود token صحيح في cookie', async () => {
      const mockUser = { id: 'user-2', email: 'test2@test.com', role: 'admin' };

      mockVerifyToken.mockReturnValue({ userId: 'user-2' });
      mockGetUserById.mockResolvedValue(mockUser);

      const req = createMockReq({
        cookies: { accessToken: 'cookie-token-456' },
        headers: {},
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token-456');
      expect(next).toHaveBeenCalled();
    });

    it('يجب أن يُفضّل Bearer header على cookie', async () => {
      const mockUser = { id: 'user-3', email: 'test3@test.com', role: 'user' };

      mockVerifyToken.mockReturnValue({ userId: 'user-3' });
      mockGetUserById.mockResolvedValue(mockUser);

      const req = createMockReq({
        headers: { authorization: 'Bearer header-token' },
        cookies: { accessToken: 'cookie-token' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('header-token');
    });
  });

  // ─── رفض المصادقة ───

  describe('رفض المصادقة', () => {
    it('يجب أن يرفض بـ 401 عند غياب أي token', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      const req = createMockReq({ headers: {}, cookies: {} });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('يجب أن يرفض بـ 401 عند token غير صالح', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const req = createMockReq({
        headers: { authorization: 'Bearer invalid-token' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining('غير صالح'),
        })
      );
    });

    it('يجب أن يرفض بـ 401 عند عدم وجود المستخدم في قاعدة البيانات', async () => {
      mockVerifyToken.mockReturnValue({ userId: 'deleted-user' });
      mockGetUserById.mockResolvedValue(null);

      const req = createMockReq({
        headers: { authorization: 'Bearer valid-but-deleted' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('غير موجود'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('يجب أن يعطي رسالة مناسبة عند jwt must be provided', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      const req = createMockReq({ headers: {}, cookies: {} });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('تسجيل الدخول'),
        })
      );
    });

    it('يجب أن يرفض authorization header بنوع غير Bearer', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      const req = createMockReq({
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
        cookies: {},
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── رقابة على عدم ازدواج الاستجابة ───
  // هذه الحالة تحمي من الانحدار الذي كان ينتج عن غياب return بعد res.status(...).json(...)
  describe('ضمان عدم إرسال استجابة مزدوجة', () => {
    it('يجب أن يُرسل استجابة واحدة فقط عند المستخدم المحذوف ولا يستدعي next', async () => {
      mockVerifyToken.mockReturnValue({ userId: 'ghost-user' });
      mockGetUserById.mockResolvedValue(null);

      const req = createMockReq({
        headers: { authorization: 'Bearer ghost-token' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      // يجب استدعاء status مرة واحدة فقط (لا استجابة مزدوجة)
      expect((res.status as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
      expect((res.json as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
      expect(next).not.toHaveBeenCalled();
    });

    it('يجب أن يُرسل استجابة واحدة فقط عند jwt must be provided', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt must be provided');
      });

      const req = createMockReq({ headers: {}, cookies: {} });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect((res.status as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
      expect((res.json as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
      expect(next).not.toHaveBeenCalled();
    });

    it('يجب أن يُرسل استجابة واحدة فقط عند token منتهي الصلاحية', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const req = createMockReq({
        headers: { authorization: 'Bearer expired-token' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect((res.status as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
      expect((res.json as unknown as { mock: { calls: unknown[] } }).mock.calls).toHaveLength(1);
      expect(next).not.toHaveBeenCalled();
    });

    it('يجب ألا يستدعي getUserById عند فشل verifyToken', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('invalid signature');
      });

      const req = createMockReq({
        headers: { authorization: 'Bearer bad' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(mockGetUserById).not.toHaveBeenCalled();
    });
  });

  // ─── حالات شاذة في مصدر الـ token ───
  describe('حالات شاذة في استخراج token', () => {
    it('يجب أن يتعامل مع authorization header من نوع مصفوفة بدون انهيار', async () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const req = createMockReq({
        headers: { authorization: ['Bearer tok1', 'Bearer tok2'] as unknown as string },
        cookies: {},
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('يجب أن يسقط إلى cookie token عندما Bearer فارغ', async () => {
      const mockUser = { id: 'user-cookie', email: 'c@c.com', role: 'user' };
      mockVerifyToken.mockReturnValue({ userId: 'user-cookie' });
      mockGetUserById.mockResolvedValue(mockUser);

      const req = createMockReq({
        headers: { authorization: 'Bearer' },
        cookies: { accessToken: 'fallback-cookie-token' },
      });
      const res = createMockRes();

      await authMiddleware(req, res, next);

      expect(mockVerifyToken).toHaveBeenCalledWith('fallback-cookie-token');
      expect(next).toHaveBeenCalled();
    });
  });
});

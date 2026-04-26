/**
 * اختبارات وحدة — CSRF Middleware [UTP-001]
 *
 * يتحقق من:
 * - رفض طلب POST/PUT/DELETE بدون CSRF token
 * - رفض طلب بـ token خاطئ
 * - قبول طلب بـ token صحيح
 * - تجاوز المسارات المستثناة
 * - تجاوز طرق GET/HEAD/OPTIONS
 * - إصدار cookie للطلبات غير المحمية
 * - عمل constantTimeCompare بشكل صحيح
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { csrfProtection, setCsrfToken, issueCsrfCookie, getCsrfToken } from '@/middleware/csrf.middleware';

import type { Request, Response, NextFunction } from 'express';

// ─── مساعدات بناء كائنات الطلب والاستجابة الوهمية ───

function createMockReq(overrides: Partial<Request> & {
  method?: string;
  path?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
} = {}): Request {
  return {
    method: 'GET',
    path: '/',
    cookies: {},
    headers: {},
    ip: '127.0.0.1',
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response {
  const res = {
    locals: {} as Record<string, unknown>,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

// ═══ اختبارات CSRF Protection ═══

describe('csrfProtection', () => {
  let next: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    next = vi.fn();
  });

  // ─── طلبات آمنة (GET/HEAD/OPTIONS) ───

  describe('الطرق غير المحمية (GET/HEAD/OPTIONS)', () => {
    it('يجب أن يمرر GET بدون تحقق', () => {
      const req = createMockReq({ method: 'GET', path: '/api/data' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('يجب أن يمرر HEAD بدون تحقق', () => {
      const req = createMockReq({ method: 'HEAD', path: '/api/data' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('يجب أن يمرر OPTIONS بدون تحقق', () => {
      const req = createMockReq({ method: 'OPTIONS', path: '/api/data' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── المسارات المستثناة ───

  describe('المسارات المستثناة', () => {
    it('يجب أن يتجاوز /api/auth/login', () => {
      const req = createMockReq({ method: 'POST', path: '/api/auth/login' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('يجب أن يتجاوز /api/auth/signup', () => {
      const req = createMockReq({ method: 'POST', path: '/api/auth/signup' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('يجب أن يتجاوز /health', () => {
      const req = createMockReq({ method: 'POST', path: '/health' });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  // ─── رفض الطلبات بدون token ───

  describe('رفض الطلبات المحمية بدون token', () => {
    it('يجب أن يرفض POST بدون cookie token — 403', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/projects',
        cookies: {},
        headers: { 'x-xsrf-token': 'some-token' },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('يجب أن يرفض POST بدون header token — 403', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/projects',
        cookies: { 'XSRF-TOKEN': 'valid-token' },
        headers: {},
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
      );
    });

    it('يجب أن يرفض DELETE بدون أي tokens — 403', () => {
      const req = createMockReq({
        method: 'DELETE',
        path: '/api/projects/123',
        cookies: {},
        headers: {},
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('يجب أن يرفض PUT بدون tokens — 403', () => {
      const req = createMockReq({
        method: 'PUT',
        path: '/api/projects/123',
        cookies: {},
        headers: {},
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('يجب أن يرفض PATCH بدون tokens — 403', () => {
      const req = createMockReq({
        method: 'PATCH',
        path: '/api/projects/123',
        cookies: {},
        headers: {},
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── رفض الطلبات بـ token خاطئ ───

  describe('رفض الطلبات بـ token غير متطابق', () => {
    it('يجب أن يرفض POST عندما cookie ≠ header — 403', () => {
      const req = createMockReq({
        method: 'POST',
        path: '/api/projects',
        cookies: { 'XSRF-TOKEN': 'token-a' },
        headers: { 'x-xsrf-token': 'token-b' },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'CSRF_TOKEN_INVALID' })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ─── قبول الطلبات بـ token صحيح ───

  describe('قبول الطلبات بـ token متطابق', () => {
    it('يجب أن يقبل POST عندما cookie === header', () => {
      const token = 'a'.repeat(64);
      const req = createMockReq({
        method: 'POST',
        path: '/api/projects',
        cookies: { 'XSRF-TOKEN': token },
        headers: { 'x-xsrf-token': token },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('يجب أن يقبل DELETE عندما cookie === header', () => {
      const token = 'b'.repeat(64);
      const req = createMockReq({
        method: 'DELETE',
        path: '/api/projects/123',
        cookies: { 'XSRF-TOKEN': token },
        headers: { 'x-xsrf-token': token },
      });
      const res = createMockRes();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});

// ═══ اختبارات setCsrfToken ═══

describe('setCsrfToken', () => {
  it('يجب أن يضع cookie ويستدعي next', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    setCsrfToken(req, res, next);

    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      expect.any(String),
      expect.objectContaining({
        httpOnly: false,
        sameSite: 'strict',
      })
    );
    expect(next).toHaveBeenCalled();
  });
});

// ═══ اختبارات issueCsrfCookie ═══

describe('issueCsrfCookie', () => {
  it('يجب أن يُرجع token ويضعه في cookie', () => {
    const res = createMockRes();

    const token = issueCsrfCookie(res);

    expect(typeof token).toBe('string');
    expect(token.length).toBe(64); // 32 bytes hex = 64 chars
    expect(res.cookie).toHaveBeenCalledWith(
      'XSRF-TOKEN',
      token,
      expect.objectContaining({ httpOnly: false })
    );
  });

  it('يجب أن يولّد token مختلف كل مرة', () => {
    const res1 = createMockRes();
    const res2 = createMockRes();

    const token1 = issueCsrfCookie(res1);
    const token2 = issueCsrfCookie(res2);

    expect(token1).not.toBe(token2);
  });
});

// ═══ اختبارات getCsrfToken ═══

describe('getCsrfToken', () => {
  it('يجب أن يُرجع token من cookie', () => {
    const req = createMockReq({ cookies: { 'XSRF-TOKEN': 'my-token' } });

    const token = getCsrfToken(req);

    expect(token).toBe('my-token');
  });

  it('يجب أن يُرجع undefined عند غياب cookie', () => {
    const req = createMockReq({ cookies: {} });

    const token = getCsrfToken(req);

    expect(token).toBeUndefined();
  });
});

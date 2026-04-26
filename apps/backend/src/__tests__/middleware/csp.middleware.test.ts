/**
 * اختبارات وحدة — CSP Middleware [UTP-002]
 *
 * يتحقق من:
 * - تطبيق Content-Security-Policy header على كل استجابة
 * - توليد nonce فريد لكل طلب
 * - صحة directives الافتراضية
 * - تخزين nonce في res.locals
 * - عمل securityHeadersMiddleware بشكل مستقل
 * - عمل cspViolationReporter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  cspMiddleware,
  securityHeadersMiddleware,
  cspViolationReporter,
} from '@/middleware/csp.middleware';

import type { Request, Response, NextFunction } from 'express';

// ─── مساعدات بناء كائنات الطلب والاستجابة الوهمية ───

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    body: {},
    ...overrides,
  } as unknown as Request;
}

function createMockRes(): Response & { _headers: Record<string, string> } {
  const headers: Record<string, string> = {};
  const res = {
    _headers: headers,
    locals: {} as Record<string, unknown>,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name.toLowerCase()] = value;
      return res;
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    end: vi.fn().mockReturnThis(),
  } as unknown as Response & { _headers: Record<string, string> };
  return res;
}

const nextFn: NextFunction = vi.fn();

function restoreNodeEnv(value: typeof process.env.NODE_ENV): void {
  if (value === undefined) {
    delete process.env.NODE_ENV;
    return;
  }
  process.env.NODE_ENV = value;
}

// ═══ اختبارات CSP Middleware ═══

describe('cspMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يجب أن يضيف Content-Security-Policy header', () => {
    const req = createMockReq();
    const res = createMockRes();

    cspMiddleware(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Security-Policy',
      expect.any(String)
    );
    expect(nextFn).toHaveBeenCalled();
  });

  it('يجب أن يولّد nonce فريد لكل طلب', () => {
    const req1 = createMockReq();
    const res1 = createMockRes();
    const req2 = createMockReq();
    const res2 = createMockRes();

    cspMiddleware(req1, res1, vi.fn());
    cspMiddleware(req2, res2, vi.fn());

    const nonce1 = res1.locals['cspNonce'] as string;
    const nonce2 = res2.locals['cspNonce'] as string;

    expect(nonce1).toBeDefined();
    expect(nonce2).toBeDefined();
    expect(nonce1).not.toBe(nonce2);
  });

  it('يجب أن يخزّن nonce في res.locals.cspNonce', () => {
    const req = createMockReq();
    const res = createMockRes();

    cspMiddleware(req, res, nextFn);

    expect(res.locals['cspNonce']).toBeDefined();
    expect(typeof res.locals['cspNonce']).toBe('string');
    expect((res.locals['cspNonce'] as string).length).toBeGreaterThan(0);
  });

  it('يجب أن يتضمن CSP header الـ nonce المُولّد', () => {
    const req = createMockReq();
    const res = createMockRes();

    cspMiddleware(req, res, nextFn);

    const nonce = res.locals['cspNonce'] as string;
    const cspHeader = res._headers['content-security-policy'];

    expect(cspHeader).toContain(`'nonce-${nonce}'`);
  });

  it('يجب أن يتضمن CSP header الـ directives الأساسية', () => {
    const req = createMockReq();
    const res = createMockRes();

    cspMiddleware(req, res, nextFn);

    const cspHeader = res._headers['content-security-policy'];

    expect(cspHeader).toContain("default-src 'self'");
    expect(cspHeader).toContain("script-src");
    expect(cspHeader).toContain("style-src");
    expect(cspHeader).toContain("img-src");
    expect(cspHeader).toContain("frame-ancestors 'none'");
    expect(cspHeader).toContain("object-src 'none'");
  });

  it('يجب أن يمنع clickjacking عبر frame-ancestors none', () => {
    const req = createMockReq();
    const res = createMockRes();

    cspMiddleware(req, res, nextFn);

    const cspHeader = res._headers['content-security-policy'];
    expect(cspHeader).toContain("frame-ancestors 'none'");
  });

  it('يجب أن يستدعي next() دائماً', () => {
    const req = createMockReq();
    const res = createMockRes();
    const next = vi.fn();

    cspMiddleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ═══ اختبارات Security Headers Middleware ═══

describe('securityHeadersMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('يجب أن يضيف X-Content-Type-Options: nosniff', () => {
    const req = createMockReq();
    const res = createMockRes();

    securityHeadersMiddleware(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });

  it('يجب أن يضيف X-Frame-Options: DENY', () => {
    const req = createMockReq();
    const res = createMockRes();

    securityHeadersMiddleware(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
  });

  it('يجب أن يضيف X-XSS-Protection', () => {
    const req = createMockReq();
    const res = createMockRes();

    securityHeadersMiddleware(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
  });

  it('يجب أن يضيف Referrer-Policy', () => {
    const req = createMockReq();
    const res = createMockRes();

    securityHeadersMiddleware(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'strict-origin-when-cross-origin'
    );
  });

  it('يجب أن يضيف Permissions-Policy', () => {
    const req = createMockReq();
    const res = createMockRes();

    securityHeadersMiddleware(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Permissions-Policy',
      expect.stringContaining('geolocation=()')
    );
  });

  it('يجب أن يضيف HSTS في بيئة الإنتاج', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = createMockReq();
    const res = createMockRes();

    securityHeadersMiddleware(req, res, nextFn);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      expect.stringContaining('max-age=')
    );

    restoreNodeEnv(original);
  });

  it('يجب ألّا يضيف HSTS في بيئة التطوير', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const req = createMockReq();
    const res = createMockRes();

    securityHeadersMiddleware(req, res, nextFn);

    const hstsCall = (res.setHeader as ReturnType<typeof vi.fn>).mock.calls.find(
      (c: unknown[]) => c[0] === 'Strict-Transport-Security'
    );
    expect(hstsCall).toBeUndefined();

    restoreNodeEnv(original);
  });
});

// ═══ اختبارات CSP Violation Reporter ═══

describe('cspViolationReporter', () => {
  it('يجب أن يستجيب بـ 204 No Content', () => {
    const req = createMockReq({
      body: {
        'csp-report': {
          'document-uri': 'https://example.com',
          'violated-directive': 'script-src',
          'blocked-uri': 'https://evil.com',
          disposition: 'enforce',
        },
      },
    });
    const res = createMockRes();

    cspViolationReporter(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.end).toHaveBeenCalled();
  });

  it('يجب أن يتعامل مع body فارغ', () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();

    cspViolationReporter(req, res);

    expect(res.status).toHaveBeenCalledWith(204);
  });
});

/**
 * اختبارات Per-User Rate Limiter [UTP-021]
 *
 * يتحقق من:
 * - استخدام userId كمفتاح عند توفره
 * - السقوط إلى IP عند غياب userId
 * - عزل المستخدمين عن بعضهم في العدّادات
 * - إرجاع 429 مع رسالة عربية عند تجاوز الحد
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock env وحد الطلبات المنخفض لسهولة الاختبار
vi.mock('@/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    CORS_ORIGIN: 'http://localhost:5000',
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 100,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { createPerUserLimiter } from '@/middleware';

describe('createPerUserLimiter', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.set('trust proxy', true);
  });

  // ─── keyGenerator يستخدم userId عند توفره ───
  it('يجب أن يعزل المستخدمين في العدّاد', async () => {
    const limiter = createPerUserLimiter({
      windowMs: 60_000,
      max: 2,
      errorMessage: 'تجاوزت الحد',
    });

    app.use((req, _res, next) => {
      (req as express.Request & { userId?: string }).userId = String(req.query['uid'] || '');
      next();
    });
    app.use(limiter);
    app.get('/', (_req, res) => { res.json({ ok: true }); });

    // المستخدم A يرسل طلبين — كلاهما مسموح
    await request(app).get('/?uid=alice').expect(200);
    await request(app).get('/?uid=alice').expect(200);
    // الطلب الثالث من alice محجوب
    await request(app).get('/?uid=alice').expect(429);

    // المستخدم B لا يزال ضمن حدّه الخاص
    const responseBob = await request(app).get('/?uid=bob');
    expect(responseBob.status).toBe(200);
  });

  // ─── السقوط إلى IP عند غياب userId ───
  it('يجب أن يسقط إلى IP عند غياب userId', async () => {
    const limiter = createPerUserLimiter({
      windowMs: 60_000,
      max: 1,
      errorMessage: 'تجاوزت الحد',
    });

    app.use(limiter);
    app.get('/', (_req, res) => { res.json({ ok: true }); });

    // طلب أول مسموح
    const first = await request(app).get('/');
    expect(first.status).toBe(200);

    // طلب ثاني من نفس IP محجوب
    const second = await request(app).get('/');
    expect(second.status).toBe(429);
    expect(second.body).toMatchObject({ success: false });
  });

  // ─── رسالة الخطأ العربية ───
  it('يجب أن يُرجع الرسالة المخصصة بالعربية عند الحجب', async () => {
    const limiter = createPerUserLimiter({
      windowMs: 60_000,
      max: 1,
      errorMessage: 'تم تجاوز حدّك الخاص',
    });

    app.use((req, _res, next) => {
      (req as express.Request & { userId?: string }).userId = 'user-1';
      next();
    });
    app.use(limiter);
    app.get('/', (_req, res) => { res.json({ ok: true }); });

    await request(app).get('/').expect(200);
    const blocked = await request(app).get('/');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe('تم تجاوز حدّك الخاص');
  });
});

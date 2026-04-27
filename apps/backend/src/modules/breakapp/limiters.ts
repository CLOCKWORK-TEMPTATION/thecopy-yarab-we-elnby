import { createHash } from 'node:crypto';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';

import { getBearerToken } from './utils';

export const publicAuthLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`,
  message: { success: false, error: 'تم تجاوز حد محاولات المصادقة' },
});

export const protectedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex');
      return `token:${tokenHash}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  message: { success: false, error: 'تم تجاوز حد طلبات الخدمة' },
});

export const runnerLocationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 240, // runners قد يبثّون الموقع مرتين في الثانية
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) {
      return `token:${createHash('sha256').update(token).digest('hex')}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  message: { success: false, error: 'تم تجاوز حد تحديثات الموقع' },
});

export const adminWriteLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const token = getBearerToken(req);
    if (token) {
      return `token:${createHash('sha256').update(token).digest('hex')}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? 'unknown')}`;
  },
  message: { success: false, error: 'تم تجاوز حد الكتابة الإدارية' },
});
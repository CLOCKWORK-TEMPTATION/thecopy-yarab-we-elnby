/**
 * اختبارات وحدة — WAF Rate Limiting [UTP-005]
 *
 * يتحقق من:
 * - السماح بالطلبات ضمن الحد المسموح
 * - حجب الطلبات عند تجاوز الحد
 * - إعادة تعيين العداد بعد انتهاء النافذة الزمنية
 * - حجب IP لمدة محددة بعد تجاوز الحد
 * - عدم السماح للـ IP المحجوب حتى انتهاء مدة الحجب
 * - حساب الطلبات المتبقية بشكل صحيح
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock للوحدات المعتمدة ───
vi.mock('@/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3001,
    CORS_ORIGIN: 'http://localhost:5000',
    REDIS_ENABLED: false,
  },
}));

import { checkRateLimit } from '@/middleware/waf/checks';
import {
  resetWAFConfig,
  updateWAFConfig,
  getWAFConfig,
} from '@/middleware/waf/management';
import { rateLimitStore } from '@/middleware/waf/state';

// ═══ اختبارات WAF Rate Limiting ═══

describe('checkRateLimit', () => {
  beforeEach(() => {
    // تنظيف مخزن الـ rate limit بين الاختبارات
    rateLimitStore.clear();
    resetWAFConfig();
  });

  // ─── السماح بالطلبات ضمن الحد ───

  it('يجب أن يسمح بالطلب الأول من IP جديد', () => {
    const result = checkRateLimit('10.0.0.1');

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
  });

  it('يجب أن يسمح بطلبات متعددة ضمن الحد المسموح', () => {
    const config = getWAFConfig();
    const maxRequests = config.rateLimit.maxRequests;

    for (let i = 0; i < maxRequests; i++) {
      const result = checkRateLimit('10.0.0.2');
      expect(result.allowed).toBe(true);
    }
  });

  it('يجب أن يُنقص عدد الطلبات المتبقية مع كل طلب', () => {
    const first = checkRateLimit('10.0.0.3');
    const second = checkRateLimit('10.0.0.3');

    expect(second.remaining).toBeLessThan(first.remaining);
  });

  // ─── حجب الطلبات عند تجاوز الحد ───

  it('يجب أن يحجب بعد تجاوز maxRequests', () => {
    const config = getWAFConfig();
    const maxRequests = config.rateLimit.maxRequests;

    // إرسال طلبات تصل للحد الأقصى
    for (let i = 0; i < maxRequests; i++) {
      checkRateLimit('10.0.0.4');
    }

    // الطلب التالي يجب أن يُحجب
    const blocked = checkRateLimit('10.0.0.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('يجب أن يبقى IP محجوباً حتى انتهاء مدة الحجب', () => {
    const config = getWAFConfig();
    const maxRequests = config.rateLimit.maxRequests;

    // تجاوز الحد
    for (let i = 0; i <= maxRequests; i++) {
      checkRateLimit('10.0.0.5');
    }

    // محاولات لاحقة يجب أن تبقى محجوبة
    const retry1 = checkRateLimit('10.0.0.5');
    const retry2 = checkRateLimit('10.0.0.5');

    expect(retry1.allowed).toBe(false);
    expect(retry2.allowed).toBe(false);
  });

  // ─── عزل عناوين IP ───

  it('يجب أن يعزل عدادات كل IP عن الآخر', () => {
    const config = getWAFConfig();
    const maxRequests = config.rateLimit.maxRequests;

    // IP الأول يتجاوز الحد
    for (let i = 0; i <= maxRequests; i++) {
      checkRateLimit('10.0.0.6');
    }

    // IP الثاني يجب أن يكون مسموحاً
    const result = checkRateLimit('10.0.0.7');
    expect(result.allowed).toBe(true);
  });

  // ─── إعادة التعيين بعد انتهاء النافذة ───

  it('يجب أن يسمح مجدداً بعد انتهاء النافذة الزمنية', () => {
    // ضبط نافذة قصيرة جداً للاختبار
    const config = getWAFConfig();
    updateWAFConfig({
      ...config,
      rateLimit: {
        ...config.rateLimit,
        windowMs: 50, // 50 مللي ثانية
        blockDurationMs: 50,
      },
    });

    const maxRequests = config.rateLimit.maxRequests;

    // تجاوز الحد
    for (let i = 0; i <= maxRequests; i++) {
      checkRateLimit('10.0.0.8');
    }

    // التزوير اليدوي لـ resetTime و blockUntil
    const record = rateLimitStore.get('10.0.0.8');
    if (record) {
      record.resetTime = Date.now() - 1;
      record.blocked = false;
      record.blockUntil = Date.now() - 1;
      rateLimitStore.set('10.0.0.8', record);
    }

    const afterReset = checkRateLimit('10.0.0.8');
    expect(afterReset.allowed).toBe(true);
  });

  // ─── تخصيص الإعدادات ───

  it('يجب أن يحترم maxRequests المخصص', () => {
    const config = getWAFConfig();
    updateWAFConfig({
      ...config,
      rateLimit: {
        ...config.rateLimit,
        maxRequests: 3,
      },
    });

    // 3 طلبات مسموحة
    expect(checkRateLimit('10.0.0.9').allowed).toBe(true);
    expect(checkRateLimit('10.0.0.9').allowed).toBe(true);
    expect(checkRateLimit('10.0.0.9').allowed).toBe(true);

    // الرابع محجوب
    expect(checkRateLimit('10.0.0.9').allowed).toBe(false);

    // إعادة التعيين
    resetWAFConfig();
  });
});

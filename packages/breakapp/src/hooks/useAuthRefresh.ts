'use client';

/**
 * خطاف تجديد المصادقة التلقائي — useAuthRefresh
 *
 * @description
 * يُجدول استدعاء `refreshAccessToken` قبل انتهاء صلاحية access_token بفترة
 * أمان (skew) قابلة للضبط، ويُعيد الجدولة بعد كل تجديد ناجح. كما يستمع لحدث
 * `breakapp:auth-expired` الذي يبثّه الـ response interceptor عند فشل refresh
 * ليُسمح للتطبيق بالتحويل إلى شاشة تسجيل الدخول.
 *
 * السبب: تجنُّب فشل الطلبات بـ 401 بالأساس أفضل من التعويض بعد الفشل.
 * يستخدم داخل AppShell مرة واحدة على مستوى التطبيق.
 */

import { useEffect } from 'react';
import { refreshAccessToken, getTokenExpiryMs, getToken } from '../lib/auth';

/**
 * خيارات `useAuthRefresh`
 */
export interface UseAuthRefreshOptions {
  /**
   * هامش الأمان قبل الانتهاء بالملّي ثانية (افتراضياً 60 ثانية)
   *
   * @description
   * يُستدعى refresh قبل exp بهذه المدة لتجنب سباق الزمن مع الخادم.
   */
  skewMs?: number;
  /**
   * أدنى فاصل بين محاولتين بالملّي ثانية (افتراضياً 5 ثوانٍ)
   *
   * @description
   * يمنع حلقة refresh فورية إذا كانت الصلاحية منتهية أو قريبة جداً.
   */
  minIntervalMs?: number;
  /**
   * مُستدعى يُطلق عند فشل refresh (انتهاء الجلسة)
   *
   * @description
   * طبقة React العليا (AppShell) تُمرر هنا منطق التحويل إلى /BREAKAPP/login/qr.
   */
  onExpired?: () => void;
}

/**
 * خطاف التجديد التلقائي
 *
 * @description
 * يُفعّل جدولة refresh استباقية طالما يوجد توكن صالح. يُنظف المؤقتات عند
 * إلغاء التحميل أو تغيُّر التوكن. يجب استدعاؤه مرة واحدة فقط على مستوى
 * التطبيق (داخل AppShell).
 *
 * @param options - خيارات الجدولة
 */
export function useAuthRefresh(options: UseAuthRefreshOptions = {}): void {
  const { skewMs = 60_000, minIntervalMs = 5_000, onExpired } = options;

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    /**
     * جدولة التجديد القادم بناءً على exp الحالي
     */
    const schedule = (): void => {
      if (cancelled) {
        return;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      const token = getToken();
      if (!token) {
        return;
      }

      const expMs = getTokenExpiryMs();
      if (expMs === null) {
        return;
      }

      const now = Date.now();
      const delay = Math.max(minIntervalMs, expMs - now - skewMs);

      timeoutId = setTimeout(async () => {
        const next = await refreshAccessToken();
        if (cancelled) {
          return;
        }
        if (next) {
          schedule();
        }
        // إن فشل: الـ interceptor العام أو حدث auth-expired سيُبلّغ onExpired
      }, delay);
    };

    /**
     * مستمع لحدث انتهاء الجلسة المُبثوث من interceptor
     */
    const handleExpired = (): void => {
      if (cancelled) {
        return;
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      onExpired?.();
    };

    /**
     * مستمع لـ focus لإعادة التحقق من الصلاحية عند رجوع التبويب
     */
    const handleFocus = (): void => {
      if (cancelled) {
        return;
      }
      const expMs = getTokenExpiryMs();
      if (expMs === null) {
        return;
      }
      if (expMs - Date.now() <= skewMs) {
        void refreshAccessToken().then((next) => {
          if (!cancelled && next) {
            schedule();
          }
        });
      } else {
        schedule();
      }
    };

    window.addEventListener('breakapp:auth-expired', handleExpired);
    window.addEventListener('focus', handleFocus);
    schedule();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('breakapp:auth-expired', handleExpired);
      window.removeEventListener('focus', handleFocus);
    };
  }, [skewMs, minIntervalMs, onExpired]);
}

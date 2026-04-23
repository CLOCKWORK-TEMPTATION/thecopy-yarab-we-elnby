'use client';

/**
 * خطاف المستخدم الحالي — useCurrentUser
 *
 * @description
 * يُعيد `CurrentUser` بشكل تفاعلي مقروءاً من الـ JWT في الذاكرة. يُعيد
 * القراءة:
 *   - كل 30 ثانية (polling خفيف لالتقاط انتهاء الصلاحية في جلسة ثابتة)
 *   - عند focus النافذة (حين يعود المستخدم للتبويب)
 *   - عند storage event (مزامنة بين تبويبات عبر أدوات مساعدة مثل BroadcastChannel)
 *   - عند حدثَي `breakapp:auth-expired` و `breakapp:auth-logged-out`
 *
 * السبب: الحزمة لا تستخدم React context حتى تبقى قابلة للاستهلاك من مسارات
 * تطبيق متعددة؛ التزامن عبر events/polling يحقق تفاعلية كافية بدون هيكل
 * provider إلزامي.
 */

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/auth';
import type { CurrentUser } from '../lib/types';

/**
 * الفاصل الافتراضي لإعادة القراءة بالملّي ثانية
 */
const DEFAULT_POLL_MS = 30_000;

/**
 * قيمة الإرجاع من `useCurrentUser`
 */
export interface UseCurrentUserResult {
  /** بيانات المستخدم أو null إن لم يكن مُصادقاً */
  user: CurrentUser | null;
  /** حالة التحميل الأولي (true حتى تُحسب القراءة الأولى على العميل) */
  loading: boolean;
  /** إعادة قراءة فورية للـ JWT وتحديث الحالة */
  refresh: () => Promise<void>;
}

/**
 * خيارات `useCurrentUser`
 */
export interface UseCurrentUserOptions {
  /** فاصل polling بالملّي ثانية — افتراضياً 30 ثانية. مرّر 0 لإيقاف polling */
  pollIntervalMs?: number;
}

/**
 * خطاف قراءة المستخدم الحالي من الذاكرة
 *
 * @param options - خيارات الـ polling
 * @returns حالة المستخدم وواجهة تحديث يدوي
 */
export function useCurrentUser(
  options: UseCurrentUserOptions = {}
): UseCurrentUserResult {
  const { pollIntervalMs = DEFAULT_POLL_MS } = options;
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * قراءة متزامنة للـ JWT وتحديث الحالة
   */
  const read = useCallback((): void => {
    const next = getCurrentUser();
    setUser((prev) => {
      if (
        prev?.userId === next?.userId &&
        prev?.projectId === next?.projectId &&
        prev?.role === next?.role
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  /**
   * نسخة async لواجهة الاستهلاك العامة (مطابقة للعقد)
   */
  const refresh = useCallback(async (): Promise<void> => {
    read();
  }, [read]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    read();
    setLoading(false);

    const handleFocus = (): void => read();
    const handleStorage = (): void => read();
    const handleExpired = (): void => setUser(null);
    const handleLoggedOut = (): void => setUser(null);

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('breakapp:auth-expired', handleExpired);
    window.addEventListener('breakapp:auth-logged-out', handleLoggedOut);

    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (pollIntervalMs > 0) {
      intervalId = setInterval(read, pollIntervalMs);
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('breakapp:auth-expired', handleExpired);
      window.removeEventListener('breakapp:auth-logged-out', handleLoggedOut);
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
    };
  }, [read, pollIntervalMs]);

  return { user, loading, refresh };
}

/**
 * @fileoverview خطاف إشعارات Toast
 *
 * هذا الخطاف يوفر نظام إشعارات موحد بدلاً من استخدام alert().
 *
 * السبب: alert() يوقف تنفيذ JavaScript ويعطي تجربة مستخدم سيئة.
 * نظام Toast يعرض الرسائل بشكل غير متطفل ويمكن تخصيصه.
 */

import { useState, useCallback } from "react";

import { DEFAULT_TOAST_DURATION } from "../../domain/constants";

/**
 * نوع الإشعار
 */
type ToastType = "success" | "error" | "warning" | "info";

/**
 * إشعار واحد
 */
interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

/**
 * خيارات عرض الإشعار
 */
interface ToastOptions {
  /** مدة العرض بالمللي ثانية (الافتراضي: 5000) */
  duration?: number;
  /** معرف مخصص للإشعار */
  id?: string;
}

/**
 * نتيجة الخطاف
 */
interface UseToastQueueReturn {
  /** قائمة الإشعارات النشطة */
  toasts: Toast[];
  /** يعرض إشعار نجاح */
  success: (message: string, options?: ToastOptions) => string;
  /** يعرض إشعار خطأ */
  error: (message: string, options?: ToastOptions) => string;
  /** يعرض إشعار تحذير */
  warning: (message: string, options?: ToastOptions) => string;
  /** يعرض إشعار معلومات */
  info: (message: string, options?: ToastOptions) => string;
  /** يزيل إشعار معين */
  dismiss: (id: string) => void;
  /** يزيل جميع الإشعارات */
  dismissAll: () => void;
}

/** المدة الافتراضية بالمللي ثانية */
/**
 * خطاف إشعارات Toast
 *
 * يوفر نظام إشعارات بسيط وقابل للتخصيص.
 *
 * @returns دوال وحالة إدارة الإشعارات
 *
 * @example
 * ```tsx
 * const { toasts, success, error } = useToast();
 *
 * const handleSave = async () => {
 *   try {
 *     await saveData();
 *     success('تم الحفظ بنجاح');
 *   } catch (err) {
 *     error('فشل الحفظ');
 *   }
 * };
 *
 * return (
 *   <div>
 *     <ToastContainer toasts={toasts} />
 *   </div>
 * );
 * ```
 */
export function useToastQueue(): UseToastQueueReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * يضيف إشعار جديد
   */
  const addToast = useCallback(
    (type: ToastType, message: string, options: ToastOptions = {}): string => {
      const id =
        options.id ??
        `toast-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      const duration = options.duration ?? DEFAULT_TOAST_DURATION;

      const toast: Toast = { id, type, message, duration };

      setToasts((prev) => [...prev, toast]);

      // إزالة تلقائية بعد المدة المحددة
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }

      return id;
    },
    []
  );

  /**
   * يزيل إشعار معين
   */
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /**
   * يزيل جميع الإشعارات
   */
  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    success: useCallback(
      (message: string, options?: ToastOptions) =>
        addToast("success", message, options),
      [addToast]
    ),
    error: useCallback(
      (message: string, options?: ToastOptions) =>
        addToast("error", message, options),
      [addToast]
    ),
    warning: useCallback(
      (message: string, options?: ToastOptions) =>
        addToast("warning", message, options),
      [addToast]
    ),
    info: useCallback(
      (message: string, options?: ToastOptions) =>
        addToast("info", message, options),
      [addToast]
    ),
    dismiss,
    dismissAll,
  };
}

export type { Toast, ToastType, ToastOptions, UseToastQueueReturn };

/**
 * @fileoverview خطاف الإشعارات للتطبيق
 * يوفر واجهة موحدة لعرض الإشعارات للمستخدم مع دعم أنواع مختلفة
 * @reason فصل منطق الإشعارات لإعادة استخدامه عبر المكونات
 */

"use client";

import { useState, useCallback } from "react";

import { VALIDATION_CONSTANTS } from "../types/constants";

import type { NotificationType, Notification } from "../types";

/**
 * واجهة قيمة العودة من خطاف الإشعارات
 */
export interface UseNotificationReturn {
  /** الإشعار الحالي (أو null إذا لم يكن هناك إشعار) */
  notification: Notification | null;
  /** عرض إشعار جديد */
  showNotification: (type: NotificationType, message: string) => void;
  /** إخفاء الإشعار الحالي */
  hideNotification: () => void;
  /** عرض إشعار نجاح */
  showSuccess: (message: string) => void;
  /** عرض إشعار خطأ */
  showError: (message: string) => void;
  /** عرض إشعار معلومات */
  showInfo: (message: string) => void;
}

/**
 * خطاف إدارة الإشعارات
 * @description يوفر وظائف لعرض وإخفاء الإشعارات مع إخفاء تلقائي
 * @param duration - مدة عرض الإشعار بالمللي ثانية (اختياري)
 * @returns كائن يحتوي على حالة الإشعار والوظائف للتحكم بها
 *
 * @example
 * ```tsx
 * const { notification, showSuccess, showError } = useNotification();
 *
 * const handleSave = () => {
 *   try {
 *     // عملية الحفظ
 *     showSuccess("تم الحفظ بنجاح!");
 *   } catch (error) {
 *     showError("فشل الحفظ");
 *   }
 * };
 * ```
 */
export function useNotification(
  duration: number = VALIDATION_CONSTANTS.NOTIFICATION_DURATION
): UseNotificationReturn {
  const [notification, setNotification] = useState<Notification | null>(null);

  /**
   * عرض إشعار جديد
   * @param type - نوع الإشعار
   * @param message - رسالة الإشعار
   */
  const showNotification = useCallback(
    (type: NotificationType, message: string) => {
      setNotification({ type, message });

      // إخفاء الإشعار تلقائياً بعد المدة المحددة
      setTimeout(() => {
        setNotification(null);
      }, duration);
    },
    [duration]
  );

  /**
   * إخفاء الإشعار الحالي يدوياً
   */
  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  /**
   * عرض إشعار نجاح
   */
  const showSuccess = useCallback(
    (message: string) => {
      showNotification("success", message);
    },
    [showNotification]
  );

  /**
   * عرض إشعار خطأ
   */
  const showError = useCallback(
    (message: string) => {
      showNotification("error", message);
    },
    [showNotification]
  );

  /**
   * عرض إشعار معلومات
   */
  const showInfo = useCallback(
    (message: string) => {
      showNotification("info", message);
    },
    [showNotification]
  );

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showInfo,
  };
}

export default useNotification;

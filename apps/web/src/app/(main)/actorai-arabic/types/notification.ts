/**
 * @fileoverview أنواع الإشعارات
 */

/**
 * نوع الإشعار
 */
export type NotificationType = "success" | "error" | "info";

/**
 * واجهة الإشعار
 * @description تمثل إشعاراً يُعرض للمستخدم
 */
export interface Notification {
  /** نوع الإشعار */
  type: NotificationType;
  /** رسالة الإشعار */
  message: string;
}

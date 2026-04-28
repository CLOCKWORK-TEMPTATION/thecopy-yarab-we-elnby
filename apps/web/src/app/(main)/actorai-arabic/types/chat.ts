/**
 * @fileoverview أنواع الدردشة وشريك المشهد
 */

/**
 * دور المتحدث في المحادثة
 */
export type ChatRole = "user" | "ai";

/**
 * واجهة رسالة الدردشة
 * @description تمثل رسالة واحدة في محادثة شريك المشهد
 * @reason تُستخدم لإدارة تدفق المحادثة مع الذكاء الاصطناعي
 */
export interface ChatMessage {
  /** دور المرسل (مستخدم أو ذكاء اصطناعي) */
  role: ChatRole;
  /** محتوى الرسالة */
  text: string;
  /** هل الرسالة قيد الكتابة (للتأثير البصري) */
  typing?: boolean;
}

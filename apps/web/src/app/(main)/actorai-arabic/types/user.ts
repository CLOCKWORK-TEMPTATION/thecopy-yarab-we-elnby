/**
 * @fileoverview أنواع المستخدم والمصادقة
 */

import { z } from "zod";

/**
 * واجهة بيانات المستخدم
 * @description تُستخدم لتخزين معلومات المستخدم المسجل في النظام
 * @reason ضرورية لإدارة جلسات المستخدمين وعرض معلوماتهم الشخصية
 */
export interface User {
  /** المعرف الفريد للمستخدم */
  id: string;
  /** الاسم الكامل للمستخدم */
  name: string;
  /** البريد الإلكتروني للمستخدم */
  email: string;
}

// مخطط Zod للتحقق من بيانات المستخدم
export const UserSchema = z.object({
  id: z.string().min(1, "معرف المستخدم مطلوب"),
  name: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("البريد الإلكتروني غير صالح"),
});

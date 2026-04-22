/**
 * @module constants
 * @description الثوابت المستخدمة في تطبيق العصف الذهني الذكي
 */

import type { AgentStatus, AgentCategory, BrainstormPhase } from "../types";

/** رسائل الأخطاء المعروضة للمستخدم حسب كود الحالة HTTP */
export const ERROR_MESSAGES: Record<number, string> = {
  401: "لم يتم العثور على API key - يرجى إضافتها في ملف .env.local",
  429: "تم تجاوز الحد المسموح من الطلبات - يرجى المحاولة لاحقاً",
  503: "فشل الاتصال بخادم AI - تحقق من الاتصال بالإنترنت",
  504: "تم تجاوز الحد الزمني - حاول بنص أقصر",
};

/** ألوان حالات الوكلاء */
export const STATUS_COLORS: Record<AgentStatus, string> = {
  working: "bg-blue-400 animate-pulse",
  completed: "bg-green-400",
  error: "bg-red-400",
  idle: "bg-gray-400",
};

/** ألوان فئات الوكلاء */
export const CATEGORY_COLORS: Record<AgentCategory, string> = {
  core: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  analysis: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  creative: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  predictive:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  advanced: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/** أسماء فئات الوكلاء بالعربية */
export const CATEGORY_NAMES: Record<AgentCategory, string> = {
  core: "أساسي",
  analysis: "تحليل",
  creative: "إبداع",
  predictive: "تنبؤ",
  advanced: "متقدم",
};

/** مهام كل مرحلة (تُضاف إليها ملخص الفكرة ديناميكياً) */
export const PHASE_TASK_PREFIXES: Record<BrainstormPhase, string> = {
  1: "التحليل الأولي للبريف:",
  2: "التوسع الإبداعي:",
  3: "التحقق والتدقيق:",
  4: "النقاش والتوافق:",
  5: "التقييم النهائي:",
};

/** رسالة الخطأ عند غياب ملخص الفكرة */
export const EMPTY_BRIEF_ERROR =
  "⚠️ يرجى إدخال ملخص الفكرة الإبداعية أو رفع ملف (PDF, DOCX, TXT)";

/** عدد المراحل الكلي */
export const TOTAL_PHASES = 5;

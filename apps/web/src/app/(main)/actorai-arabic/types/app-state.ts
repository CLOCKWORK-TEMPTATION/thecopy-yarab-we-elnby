/**
 * @fileoverview حالة التطبيق الرئيسية
 */

import type { AnalysisResult } from "./analysis";
import type { Notification } from "./notification";
import type { User } from "./user";
import type { ViewType } from "./view";

/**
 * حالة التطبيق الرئيسية
 * @description الحالة الكاملة للتطبيق (للاستخدام مع useReducer مستقبلاً)
 */
export interface AppState {
  /** المستخدم الحالي */
  user: User | null;
  /** العرض الحالي */
  currentView: ViewType;
  /** الثيم */
  theme: "light" | "dark";
  /** الإشعار الحالي */
  notification: Notification | null;
  /** حالة التحليل */
  analyzing: boolean;
  /** نتيجة التحليل */
  analysisResult: AnalysisResult | null;
}

/**
 * @fileoverview تصدير جميع الخطافات المخصصة لاستوديو الممثل الذكي
 * يوفر نقطة دخول موحدة لجميع الخطافات المستخدمة في التطبيق
 */

// خطاف تحليل الصوت
export { useVoiceAnalytics } from "./useVoiceAnalytics";
export type { VoiceMetrics, VoiceAnalyticsState } from "./useVoiceAnalytics";

// خطاف الإشعارات
export { useNotification } from "./useNotification";
export type { UseNotificationReturn } from "./useNotification";

// خطاف اختبار الحفظ
export { useMemorization } from "./useMemorization";
export type {
  MemorizationState,
  UseMemorizationReturn,
  DeletionLevel,
} from "./useMemorization";

// خطاف تحليل الكاميرا
export { useWebcamAnalysis } from "./useWebcamAnalysis";
export type {
  WebcamState,
  WebcamPermission,
  UseWebcamAnalysisReturn,
} from "./useWebcamAnalysis";

// ============================================================================
// أنواع رد الـ API الموحد
// ============================================================================
// يفرض هذا الملف عقد البيانات الموحد لكل endpoint إنتاجي عبر التطبيقات.
// كل استجابة يجب أن تتبع شكل ApiSuccess<T> أو ApiFailure.

/**
 * رمز الخطأ المُصنَّف.
 * أي endpoint يجب أن يرجّع واحداً من هذه الرموز عند الفشل.
 * ممنوع منعاً باتاً ابتلاع الأخطاء أو تحويلها إلى نجاح.
 */
export type ApiErrorCode =
  | "auth_required"      // لم يسجّل المستخدم الدخول
  | "forbidden"          // مسجّل لكن غير مصرّح له
  | "validation_error"   // المدخلات غير صالحة
  | "not_found"          // المورد غير موجود
  | "conflict"           // تعارض في الحالة
  | "timeout"            // انتهت مهلة الطلب
  | "network_error"      // فشل الاتصال
  | "server_error"       // خطأ خادم 5xx
  | "quota_exceeded"     // تجاوز حد الاستخدام أو rate limit
  | "model_empty"        // النموذج رجّع محتوى فارغاً ولا يُعتبر نجاحاً
  | "unknown_error";     // خطأ غير مصنّف — يجب تجنّبه

/**
 * بيانات تعريف الطلب المرفقة مع كل استجابة ناجحة.
 */
export interface ApiMeta {
  requestId: string;
  durationMs: number;
  version?: string;
}

/**
 * استجابة نجاح موحدة.
 */
export interface ApiSuccess<TData> {
  ok: true;
  data: TData;
  meta: ApiMeta;
}

/**
 * استجابة فشل موحدة.
 */
export interface ApiFailure {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;       // رسالة عربية مفهومة للمستخدم
    requestId?: string;
    details?: unknown;     // تفاصيل تشخيصية اختيارية للسجل فقط
  };
}

/**
 * النوع الجامع لاستجابة الـ API.
 */
export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

/**
 * خيارات الطلب المُمررة إلى apiFetch.
 */
export interface ApiRequestOptions {
  /** المهلة بالميلي ثانية. الافتراضي 30000. */
  timeoutMs?: number;
  /** رؤوس مخصصة. */
  headers?: Record<string, string>;
  /** AbortSignal خارجي (مثلاً من useEffect cleanup). */
  signal?: AbortSignal;
  /** عدد محاولات إعادة المحاولة على أخطاء الشبكة فقط. الافتراضي 0. */
  retry?: number;
  /** تأخير بين المحاولات بالميلي ثانية. الافتراضي 500. */
  retryDelayMs?: number;
  /** هل ترسل cookies الجلسة (للمسارات المصادقة). الافتراضي "include". */
  credentials?: RequestCredentials;
}

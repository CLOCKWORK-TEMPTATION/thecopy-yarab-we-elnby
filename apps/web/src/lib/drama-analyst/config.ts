// تكوين مسارات المكتبة
export const DRAMA_ANALYST_CONFIG = {
  // مفتاح API الخاص بـ Gemini
  GEMINI_API_KEY: process.env["NEXT_PUBLIC_GEMINI_API_KEY"] || "",

  // إعدادات التحليل
  MIN_TEXT_LENGTH: 100,
  MAX_TEXT_LENGTH: 50000,

  // إعدادات الطلبات
  REQUEST_TIMEOUT: 30000,
  MAX_RETRIES: 3,

  // رسائل الأخطاء
  ERRORS: {
    NO_API_KEY:
      "مفتاح API غير موجود. يرجى التأكد من إعداد NEXT_PUBLIC_GEMINI_API_KEY",
    TEXT_TOO_SHORT: "النص قصير جداً. يجب أن يكون على الأقل 100 حرف",
    TEXT_TOO_LONG: "النص طويل جداً. الحد الأقصى 50000 حرف",
    NETWORK_ERROR: "خطأ في الشبكة. يرجى المحاولة مرة أخرى",
    UNKNOWN_ERROR: "حدث خطأ غير متوقع",
  },
};

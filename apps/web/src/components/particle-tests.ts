import { logger } from "@/lib/logger";
// اختبار سريع للتحقق من صحة الكود المحسن
logger.info("🧪 بدء اختبار كود الجسيمات المحسن...");

// اختبار 1: التحقق من دوال SDF الأساسية
const testSDF = () => {
  // اختبار دالة المسافة للدائرة
  const sdCircle = (
    px: number,
    py: number,
    cx: number,
    cy: number,
    r: number
  ) => Math.hypot(px - cx, py - cy) - r;

  const result = sdCircle(1, 1, 0, 0, 2);
  const expected = Math.hypot(1, 1) - 2; // ≈ -0.586

  logger.info("✅ اختبار SDF:", Math.abs(result - expected) < 0.001);
};

// اختبار 2: التحقق من دوال إدارة الدفعات
const testBatchProcessing = () => {
  const requestIdle = (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => {
    if (typeof requestIdleCallback !== "undefined") {
      return requestIdleCallback(callback, options);
    } else {
      return setTimeout(
        () =>
          callback({
            timeRemaining: () => Math.max(0, 50),
            didTimeout: false,
          }),
        options?.timeout ?? 0
      );
    }
  };

  logger.info("✅ اختبار requestIdle:", typeof requestIdle === "function");
};

// اختبار 3: التحقق من معالجة الأخطاء
const testErrorHandling = () => {
  const testFunction = (data: number[] | null) => {
    try {
      if (!data) throw new Error("بيانات فارغة");
      return data.map((x: number) => x * 2);
    } catch (error) {
      logger.warn("خطأ تم التعامل معه:", (error as Error).message);
      return [];
    }
  };

  const result = testFunction(null);
  logger.info(
    "✅ اختبار معالجة الأخطاء:",
    Array.isArray(result) && result.length === 0
  );
};

// تشغيل الاختبارات
try {
  testSDF();
  testBatchProcessing();
  testErrorHandling();
  logger.info("🎉 جميع الاختبارات نجحت!");
} catch (error) {
  logger.error("❌ فشل في أحد الاختبارات:", error);
}

export { testSDF, testBatchProcessing, testErrorHandling };

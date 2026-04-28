/**
 * @fileoverview أنواع تحليل الأداء البصري (الكاميرا)
 */

/**
 * اتجاهات النظر الممكنة
 */
export type EyeDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "center"
  | "audience";

/**
 * حالة معدل الرمش
 */
export type BlinkRateStatus = "normal" | "high" | "low";

/**
 * واجهة نتيجة تحليل الكاميرا/الويب كام
 * @description النتيجة الكاملة لتحليل الأداء البصري للممثل
 * @reason تساعد الممثل على تحسين لغة الجسد والتعبيرات أمام الكاميرا
 */
export interface WebcamAnalysisResult {
  /** تحليل خط النظر */
  eyeLine: {
    /** الاتجاه السائد للنظر */
    direction: EyeDirection;
    /** نسبة اتساق النظر (0-100) */
    consistency: number;
    /** تنبيهات متعلقة بالنظر */
    alerts: string[];
  };
  /** تحليل تزامن التعبيرات */
  expressionSync: {
    /** نتيجة التزامن (0-100) */
    score: number;
    /** المشاعر المتطابقة مع النص */
    matchedEmotions: string[];
    /** المشاعر غير المتطابقة */
    mismatches: string[];
  };
  /** تحليل معدل الرمش */
  blinkRate: {
    /** معدل الرمش (مرة/دقيقة) */
    rate: number;
    /** حالة المعدل */
    status: BlinkRateStatus;
    /** مؤشر التوتر (0-100) */
    tensionIndicator: number;
  };
  /** تحليل استخدام المساحة */
  blocking: {
    /** نسبة استخدام المساحة (0-100) */
    spaceUsage: number;
    /** الحركات المُكتشفة */
    movements: string[];
    /** اقتراحات التحسين */
    suggestions: string[];
  };
  /** التنبيهات العامة */
  alerts: string[];
  /** النتيجة الإجمالية (0-100) */
  overallScore: number;
  /** الطابع الزمني للتحليل */
  timestamp: string;
}

/**
 * واجهة جلسة الكاميرا
 * @description سجل لجلسة تحليل بصري سابقة
 */
export interface WebcamSession {
  /** المعرف الفريد للجلسة */
  id: string;
  /** تاريخ الجلسة */
  date: string;
  /** مدة الجلسة */
  duration: string;
  /** النتيجة الإجمالية */
  score: number;
  /** التنبيهات الرئيسية */
  alerts: string[];
}

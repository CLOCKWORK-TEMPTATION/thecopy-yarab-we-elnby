/**
 * @fileoverview أنواع تحليل النص (الأهداف، العقبات، المسار العاطفي).
 */

/**
 * واجهة القوس العاطفي
 * @description تمثل نقطة عاطفية واحدة في مسار الشخصية
 */
export interface EmotionalArcPoint {
  /** رقم اللحظة/الضربة في المشهد */
  beat: number;
  /** المشاعر السائدة */
  emotion: string;
  /** شدة المشاعر (0-100) */
  intensity: number;
}

/**
 * واجهة نتيجة تحليل النص
 * @description تحتوي على التحليل الكامل للنص بما في ذلك الأهداف والعقبات والنصائح
 * @reason الهدف الأساسي من التطبيق - تقديم تحليل عميق للنص لمساعدة الممثل
 */
export interface AnalysisResult {
  /** أهداف الشخصية والمشهد */
  objectives: {
    /** الهدف الرئيسي للشخصية */
    main: string;
    /** هدف المشهد المحدد */
    scene: string;
    /** الضربات الدرامية (لحظات التحول) */
    beats: string[];
  };
  /** العقبات التي تواجه الشخصية */
  obstacles: {
    /** العقبات الداخلية (نفسية) */
    internal: string[];
    /** العقبات الخارجية (بيئية/شخصيات أخرى) */
    external: string[];
  };
  /** مسار المشاعر عبر المشهد */
  emotionalArc: EmotionalArcPoint[];
  /** نصائح الكوتش للأداء */
  coachingTips: string[];
}

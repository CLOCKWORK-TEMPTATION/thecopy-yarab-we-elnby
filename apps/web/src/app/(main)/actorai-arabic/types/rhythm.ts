/**
 * @fileoverview أنواع تحليل إيقاع المشهد
 */

/**
 * سرعة الإيقاع
 */
export type TempoLevel = "slow" | "medium" | "fast" | "very-fast";

/**
 * واجهة نقطة الإيقاع
 * @description تمثل نقطة واحدة على خريطة الإيقاع الدرامي
 * @reason تُستخدم لتصور التدفق الإيقاعي للمشهد ومساعدة الممثل على فهم البنية
 */
export interface RhythmPoint {
  /** الموضع في النص (0-100%) */
  position: number;
  /** شدة الإيقاع (0-100) */
  intensity: number;
  /** سرعة الإيقاع في هذه النقطة */
  tempo: TempoLevel;
  /** المشاعر السائدة */
  emotion: string;
  /** وصف اللحظة الدرامية */
  beat: string;
}

/**
 * مستوى خطورة التنبيه
 */
export type AlertSeverity = "low" | "medium" | "high";

/**
 * واجهة تنبيه الرتابة
 * @description تحدد مناطق في النص تعاني من رتابة إيقاعية
 * @reason تساعد الممثل على تحديد وإصلاح المناطق المملة في الأداء
 */
export interface MonotonyAlert {
  /** بداية المنطقة المتأثرة (0-100%) */
  startPosition: number;
  /** نهاية المنطقة المتأثرة (0-100%) */
  endPosition: number;
  /** مستوى خطورة المشكلة */
  severity: AlertSeverity;
  /** وصف المشكلة */
  description: string;
  /** اقتراح للتحسين */
  suggestion: string;
}

/**
 * واجهة مقارنة الإيقاع
 * @description مقارنة أداء المستخدم مع الأداء المثالي
 */
export interface RhythmComparison {
  /** الجانب المُقارن */
  aspect: string;
  /** نتيجة المستخدم */
  yourScore: number;
  /** النتيجة المثالية */
  optimalScore: number;
  /** الفرق بين النتيجتين */
  difference: number;
  /** ملاحظات وتوجيهات */
  feedback: string;
}

/**
 * واجهة اقتراح اللون العاطفي
 * @description اقتراحات لتحسين التعبير العاطفي في مقاطع محددة
 */
export interface EmotionalColorSuggestion {
  /** المقطع النصي المستهدف */
  segment: string;
  /** المشاعر الحالية المُكتشفة */
  currentEmotion: string;
  /** المشاعر المقترحة */
  suggestedEmotion: string;
  /** التقنية الموصى بها */
  technique: string;
  /** مثال على التنفيذ */
  example: string;
}

/**
 * واجهة تحليل إيقاع المشهد الكامل
 * @description النتيجة الشاملة لتحليل إيقاع المشهد
 * @reason توفر نظرة شاملة على البنية الإيقاعية للمشهد مع توصيات التحسين
 */
export interface SceneRhythmAnalysis {
  /** الإيقاع العام للمشهد */
  overallTempo: Exclude<TempoLevel, "very-fast">;
  /** نتيجة الإيقاع الإجمالية (0-100) */
  rhythmScore: number;
  /** خريطة الإيقاع التفصيلية */
  rhythmMap: RhythmPoint[];
  /** تنبيهات الرتابة */
  monotonyAlerts: MonotonyAlert[];
  /** مقارنات الأداء */
  comparisons: RhythmComparison[];
  /** اقتراحات التلوين العاطفي */
  emotionalSuggestions: EmotionalColorSuggestion[];
  /** لحظات الذروة في المشهد */
  peakMoments: string[];
  /** لحظات الهدوء في المشهد */
  valleyMoments: string[];
  /** ملخص التحليل */
  summary: string;
}

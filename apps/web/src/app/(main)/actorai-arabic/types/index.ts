/**
 * @fileoverview أنواع البيانات الأساسية لاستوديو الممثل الذكي
 * هذا الملف يحتوي على جميع واجهات TypeScript المستخدمة في التطبيق
 * لضمان الاتساق والأمان النوعي عبر جميع المكونات
 */

import { z } from "zod";

// ==================== أنواع المستخدم والمصادقة ====================

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

// ==================== أنواع النصوص والسيناريو ====================

/**
 * حالة النص في النظام
 * @description تحدد المرحلة الحالية لمعالجة النص
 */
export type ScriptStatus = "analyzed" | "processing" | "pending";

/**
 * واجهة النص/السيناريو
 * @description تمثل نصاً مرفوعاً في النظام مع بياناته الوصفية
 * @reason تُستخدم لإدارة مكتبة النصوص وعرض حالة كل نص
 */
export interface Script {
  /** المعرف الفريد للنص */
  id: string;
  /** عنوان النص */
  title: string;
  /** اسم المؤلف */
  author: string;
  /** محتوى النص الكامل */
  content: string;
  /** تاريخ رفع النص */
  uploadDate: string;
  /** حالة معالجة النص */
  status: ScriptStatus;
}

// مخطط Zod للتحقق من بيانات النص
export const ScriptSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "عنوان النص مطلوب"),
  author: z.string().min(1, "اسم المؤلف مطلوب"),
  content: z.string().min(10, "محتوى النص قصير جداً"),
  uploadDate: z.string(),
  status: z.enum(["analyzed", "processing", "pending"]),
});

// ==================== أنواع التسجيلات ====================

/**
 * واجهة التسجيل الصوتي/المرئي
 * @description تمثل تسجيلاً واحداً للممثل مع تقييمه
 * @reason تُستخدم لحفظ وعرض تاريخ تسجيلات الممثل مع نتائجها
 */
export interface Recording {
  /** المعرف الفريد للتسجيل */
  id: string;
  /** عنوان التسجيل */
  title: string;
  /** مدة التسجيل بصيغة "دقائق:ثواني" */
  duration: string;
  /** تاريخ التسجيل */
  date: string;
  /** نتيجة تقييم الأداء (0-100) */
  score: number;
}

// مخطط Zod للتحقق من بيانات التسجيل
export const RecordingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  duration: z.string().regex(/^\d+:\d{2}$/, "صيغة المدة غير صالحة"),
  date: z.string(),
  score: z.number().min(0).max(100),
});

// ==================== أنواع تحليل النص ====================

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

// ==================== أنواع الدردشة وشريك المشهد ====================

/**
 * دور المتحدث في المحادثة
 */
export type ChatRole = "user" | "ai";

/**
 * واجهة رسالة الدردشة
 * @description تمثل رسالة واحدة في محادثة شريك المشهد
 * @reason تُستخدم لإدارة تدفق المحادثة مع الذكاء الاصطناعي
 */
export interface ChatMessage {
  /** دور المرسل (مستخدم أو ذكاء اصطناعي) */
  role: ChatRole;
  /** محتوى الرسالة */
  text: string;
  /** هل الرسالة قيد الكتابة (للتأثير البصري) */
  typing?: boolean;
}

// ==================== أنواع تمارين الصوت ====================

/**
 * فئة التمرين الصوتي
 */
export type ExerciseCategory =
  | "breathing"
  | "articulation"
  | "projection"
  | "resonance";

/**
 * واجهة التمرين الصوتي
 * @description تمثل تمريناً صوتياً واحداً مع تفاصيله
 * @reason توفر هيكلاً موحداً لعرض وإدارة التمارين الصوتية
 */
export interface VocalExercise {
  /** المعرف الفريد للتمرين */
  id: string;
  /** اسم التمرين */
  name: string;
  /** وصف تفصيلي للتمرين وكيفية تنفيذه */
  description: string;
  /** المدة المقترحة للتمرين */
  duration: string;
  /** فئة التمرين */
  category: ExerciseCategory;
}

// مخطط Zod للتحقق من بيانات التمرين
export const VocalExerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(10),
  duration: z.string(),
  category: z.enum(["breathing", "articulation", "projection", "resonance"]),
});

// ==================== أنواع العرض والتنقل ====================

/**
 * أنواع الصفحات/العروض المتاحة في التطبيق
 * @description تحدد جميع الشاشات الممكنة في التطبيق
 */
export type ViewType =
  | "home"
  | "demo"
  | "dashboard"
  | "login"
  | "register"
  | "vocal"
  | "voicecoach"
  | "rhythm"
  | "webcam"
  | "ar"
  | "memorization";

// ==================== أنواع تحليل إيقاع المشهد ====================

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

// ==================== أنواع تحليل الأداء البصري (الكاميرا) ====================

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

// ==================== أنواع وضع اختبار الحفظ ====================

/**
 * واجهة إحصائيات الحفظ
 * @description تتبع أداء المستخدم في اختبار الحفظ
 * @reason تساعد على تحديد نقاط الضعف وقياس التقدم في الحفظ
 */
export interface MemorizationStats {
  /** إجمالي المحاولات */
  totalAttempts: number;
  /** عدد الكلمات الصحيحة */
  correctWords: number;
  /** عدد الكلمات الخاطئة */
  incorrectWords: number;
  /** عدد مرات التردد */
  hesitationCount: number;
  /** نقاط الضعف (كلمات يُخطئ فيها كثيراً) */
  weakPoints: string[];
  /** متوسط وقت الاستجابة (بالثواني) */
  averageResponseTime: number;
}

// مخطط Zod للتحقق من إحصائيات الحفظ
export const MemorizationStatsSchema = z.object({
  totalAttempts: z.number().min(0),
  correctWords: z.number().min(0),
  incorrectWords: z.number().min(0),
  hesitationCount: z.number().min(0),
  weakPoints: z.array(z.string()),
  averageResponseTime: z.number().min(0),
});

// ==================== أنواع AR/MR (الواقع المعزز/المختلط) ====================

/**
 * حالة ميزة AR
 */
export type ARFeatureStatus = "ready" | "coming_soon";

/**
 * واجهة ميزة الواقع المعزز
 * @description تمثل ميزة واحدة من ميزات AR/MR
 */
export interface ARFeature {
  /** المعرف الفريد للميزة */
  id: string;
  /** اسم الميزة */
  name: string;
  /** وصف الميزة */
  description: string;
  /** رمز الميزة (إيموجي) */
  icon: string;
  /** حالة الميزة */
  status: ARFeatureStatus;
}

/**
 * موضع التلقين النصي
 */
export type TeleprompterPosition = "top" | "center" | "bottom";

/**
 * واجهة إعدادات جهاز التلقين
 * @description إعدادات عرض النص على التلقين الافتراضي
 */
export interface TeleprompterSettings {
  /** سرعة التمرير (0-100) */
  speed: number;
  /** حجم الخط */
  fontSize: number;
  /** شفافية الخلفية (0-100) */
  opacity: number;
  /** موضع النص على الشاشة */
  position: TeleprompterPosition;
}

/**
 * واجهة علامة الحركة (Blocking)
 * @description علامة موضعية على الأرض لتحديد مواقع الحركة
 */
export interface BlockingMark {
  /** المعرف الفريد للعلامة */
  id: string;
  /** الموضع الأفقي (%) */
  x: number;
  /** الموضع الرأسي (%) */
  y: number;
  /** تسمية العلامة */
  label: string;
  /** لون العلامة */
  color: string;
}

/**
 * نوع اللقطة السينمائية
 */
export type ShotType = "closeup" | "medium" | "wide" | "extreme_wide";

/**
 * نسبة العرض للكاميرا
 */
export type AspectRatio = "16:9" | "2.35:1" | "4:3" | "1:1";

/**
 * واجهة إعدادات عين الكاميرا
 * @description إعدادات الكاميرا الافتراضية لفهم التكوين
 */
export interface CameraEyeSettings {
  /** البعد البؤري (مم) */
  focalLength: number;
  /** نوع اللقطة */
  shotType: ShotType;
  /** نسبة العرض */
  aspectRatio: AspectRatio;
}

/**
 * واجهة الشريك الهولوغرافي
 * @description إعدادات الشريك الافتراضي للتدريب
 */
export interface HolographicPartner {
  /** اسم الشخصية */
  character: string;
  /** المشاعر الحالية */
  emotion: string;
  /** شدة المشاعر (0-100) */
  intensity: number;
  /** هل الشريك نشط */
  isActive: boolean;
}

/**
 * نوع التحكم بالإيماءات
 */
export type GestureType = "eye" | "hand" | "head" | "voice";

/**
 * واجهة التحكم بالإيماءات
 * @description تعريف إيماءة تحكم واحدة
 */
export interface GestureControl {
  /** نوع الإيماءة */
  type: GestureType;
  /** الإجراء المرتبط */
  action: string;
  /** هل الإيماءة مفعلة */
  enabled: boolean;
}

// ==================== أنواع الإشعارات ====================

/**
 * نوع الإشعار
 */
export type NotificationType = "success" | "error" | "info";

/**
 * واجهة الإشعار
 * @description تمثل إشعاراً يُعرض للمستخدم
 */
export interface Notification {
  /** نوع الإشعار */
  type: NotificationType;
  /** رسالة الإشعار */
  message: string;
}

// ==================== أنواع المنهجيات التمثيلية ====================

/**
 * واجهة المنهجية التمثيلية
 * @description تمثل منهجية تمثيلية واحدة (ستانيسلافسكي، مايسنر، إلخ)
 */
export interface ActingMethodology {
  /** المعرف الفريد للمنهجية */
  id: string;
  /** الاسم بالعربية */
  name: string;
  /** الاسم بالإنجليزية */
  nameEn: string;
}

// مخطط Zod للتحقق من المنهجية
export const ActingMethodologySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().min(1),
});

// ==================== تصدير الأنواع المجمعة ====================

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

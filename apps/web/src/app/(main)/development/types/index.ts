/**
 * @fileoverview أنواع البيانات الخاصة بصفحة التطوير الإبداعي
 *
 * يحتوي هذا الملف على جميع الـ Interfaces والـ Types المستخدمة
 * في مكونات التطوير الإبداعي لضمان Type Safety كاملة
 *
 * @module development/types
 */

import { z } from "zod";

/**
 * أنواع المهام الإبداعية المتاحة
 * تُستخدم لتحديد نوع المهمة التي يختارها المستخدم
 */
export enum CreativeTaskType {
  /** إبداع محاكي - توليد محتوى إبداعي جديد */
  CREATIVE = "CREATIVE",
  /** إكمال النص - إكمال نص ناقص */
  COMPLETION = "COMPLETION",
  /** إعادة الكتابة التكيفية - تعديل النص حسب السياق */
  ADAPTIVE_REWRITING = "ADAPTIVE_REWRITING",
  /** مولد المشاهد - توليد مشاهد جديدة */
  SCENE_GENERATOR = "SCENE_GENERATOR",
  /** صوت الشخصية - محاكاة صوت شخصية معينة */
  CHARACTER_VOICE = "CHARACTER_VOICE",
  /** بناء العالم - توسيع عالم القصة */
  WORLD_BUILDER = "WORLD_BUILDER",
  /** متنبئ الحبكة - التنبؤ بأحداث القصة */
  PLOT_PREDICTOR = "PLOT_PREDICTOR",
  /** محسّن التوتر - تحسين التوتر الدرامي */
  TENSION_OPTIMIZER = "TENSION_OPTIMIZER",
  /** خريطة الإيقاع - تحليل إيقاع القصة */
  RHYTHM_MAPPING = "RHYTHM_MAPPING",
  /** شبكة الشخصيات - تحليل علاقات الشخصيات */
  CHARACTER_NETWORK = "CHARACTER_NETWORK",
  /** تشريح الحوار - تحليل عميق للحوارات */
  DIALOGUE_FORENSICS = "DIALOGUE_FORENSICS",
  /** استخراج الثيمات - اكتشاف الموضوعات الرئيسية */
  THEMATIC_MINING = "THEMATIC_MINING",
  /** بصمة الأسلوب - تحليل الأسلوب الكتابي */
  STYLE_FINGERPRINT = "STYLE_FINGERPRINT",
  /** ديناميكيات الصراع - تحليل الصراعات الدرامية */
  CONFLICT_DYNAMICS = "CONFLICT_DYNAMICS",
}

/**
 * تسميات المهام الإبداعية بالعربية
 * تُستخدم لعرض أسماء المهام في واجهة المستخدم
 */
export const CREATIVE_TASK_LABELS: Record<CreativeTaskType, string> = {
  [CreativeTaskType.CREATIVE]: "إبداع محاكي",
  [CreativeTaskType.COMPLETION]: "إكمال النص",
  [CreativeTaskType.ADAPTIVE_REWRITING]: "إعادة الكتابة التكيفية",
  [CreativeTaskType.SCENE_GENERATOR]: "مولد المشاهد",
  [CreativeTaskType.CHARACTER_VOICE]: "صوت الشخصية",
  [CreativeTaskType.WORLD_BUILDER]: "بناء العالم",
  [CreativeTaskType.PLOT_PREDICTOR]: "متنبئ الحبكة",
  [CreativeTaskType.TENSION_OPTIMIZER]: "محسّن التوتر",
  [CreativeTaskType.RHYTHM_MAPPING]: "خريطة الإيقاع",
  [CreativeTaskType.CHARACTER_NETWORK]: "شبكة الشخصيات",
  [CreativeTaskType.DIALOGUE_FORENSICS]: "تشريح الحوار",
  [CreativeTaskType.THEMATIC_MINING]: "استخراج الثيمات",
  [CreativeTaskType.STYLE_FINGERPRINT]: "بصمة الأسلوب",
  [CreativeTaskType.CONFLICT_DYNAMICS]: "ديناميكيات الصراع",
};

/**
 * إعدادات أنظمة الذكاء الاصطناعي المتقدمة
 * تتحكم في تفعيل/تعطيل الأنظمة المتقدمة
 */
export interface AdvancedAISettings {
  /** تفعيل نظام الاسترجاع المعزز (RAG) */
  enableRAG: boolean;
  /** تفعيل النقد الذاتي للمخرجات */
  enableSelfCritique: boolean;
  /** تفعيل الذكاء الدستوري للالتزام بالقواعد */
  enableConstitutional: boolean;
  /** تفعيل كشف الهلوسات والتحقق من الدقة */
  enableHallucination: boolean;
  /** تفعيل قياس عدم اليقين */
  enableUncertainty: boolean;
  /** تفعيل النقاش متعدد الوكلاء */
  enableDebate: boolean;
}

/**
 * القيم الافتراضية لإعدادات الذكاء الاصطناعي
 */
export const DEFAULT_AI_SETTINGS: AdvancedAISettings = {
  enableRAG: true,
  enableSelfCritique: true,
  enableConstitutional: true,
  enableHallucination: true,
  enableUncertainty: false,
  enableDebate: false,
};

/**
 * ملف معالج للإدخال
 * يمثل ملفاً تم تحميله وجاهز للمعالجة
 */
export interface ProcessedInputFile {
  /** اسم الملف */
  fileName: string;
  /** محتوى الملف النصي */
  textContent: string;
  /** حجم الملف بالأحرف */
  size: number;
  /** حجم الملف بالبايت */
  sizeBytes: number;
}

/**
 * استجابة الذكاء الاصطناعي
 * تمثل الرد من نظام الذكاء الاصطناعي
 */
export interface AIResponseData {
  /** النص المولد */
  text: string;
  /** البيانات الخام من النموذج */
  raw: string;
  /** مستوى الثقة في الاستجابة */
  confidence?: number;
  /** البيانات الوصفية الإضافية */
  metadata?: Record<string, unknown>;
}

/**
 * طلب الذكاء الاصطناعي
 * يمثل طلباً مرسلاً لنظام الذكاء الاصطناعي
 */
export interface AIRequestData {
  /** معرف الوكيل المستهدف */
  agent: string;
  /** الطلب أو التعليمات الخاصة */
  prompt: string;
  /** سياق الطلب */
  context: {
    /** الملفات المرفقة */
    files: ProcessedInputFile[];
  };
  /** خيارات إضافية */
  options: {
    /** معلومات إضافية */
    additionalInfo?: string;
    /** تقرير التحليل السابق */
    analysisReport?: string;
    /** معرف التحليل */
    analysisId?: string | null;
    /** نطاق الإكمال المطلوب */
    completionScope?: string;
    /** التحسينات المختارة للإكمال */
    selectedCompletionEnhancements?: CreativeTaskType[];
  };
}

/**
 * بيانات تحليل المحطات السبع
 * تمثل نتائج تحليل سابق من نظام المحطات السبع
 */
export interface SevenStationsAnalysis {
  /** التقرير النهائي */
  finalReport: string;
  /** النص الأصلي */
  originalText: string;
  /** مستوى الثقة */
  confidence: number;
  /** مخرجات المحطات */
  stationOutputs?: {
    station7?: unknown;
  };
}

/**
 * تقرير الوكيل
 * يمثل تقريراً مولداً من أحد الوكلاء
 */
export interface AgentReport {
  /** اسم الوكيل */
  agentName: string;
  /** معرف الوكيل */
  agentId: string;
  /** نص التقرير */
  text: string;
  /** مستوى الثقة */
  confidence: number;
  /** الطابع الزمني */
  timestamp: string;
}

/**
 * نتائج المهام
 * يمثل مجموعة من نتائج المهام المنجزة
 */
export type TaskResults = Record<string, AgentReport>;

/**
 * حالة التطوير الإبداعي
 * تمثل الحالة الكاملة لصفحة التطوير
 */
export interface CreativeDevelopmentState {
  /** النص المدخل */
  textInput: string;
  /** المهمة المختارة */
  selectedTask: CreativeTaskType | null;
  /** المتطلبات الخاصة */
  specialRequirements: string;
  /** معلومات إضافية */
  additionalInfo: string;
  /** نطاق الإكمال */
  completionScope: string;
  /** التحسينات المختارة */
  selectedCompletionEnhancements: CreativeTaskType[];
  /** تقرير التحليل */
  analysisReport: string;
  /** هل اكتمل التحليل */
  isAnalysisComplete: boolean;
  /** نتائج المهام */
  taskResults: TaskResults;
  /** معرف modal التقرير المعروض */
  showReportModal: string | null;
  /** معرف التحليل */
  analysisId: string | null;
  /** إعدادات الذكاء الاصطناعي المتقدمة */
  advancedSettings: AdvancedAISettings;
  /** استجابة الذكاء الاصطناعي */
  aiResponse: AIResponseData | null;
  /** رسالة الخطأ */
  error: string | null;
  /** حالة التحميل */
  isLoading: boolean;
}

// ============================================
// Development Full Agent Catalog Types (27 tasks)
// ============================================

/**
 * فئة المهمة داخل كتالوج أدوات التطوير
 *
 * - `core`       — المهام الأساسية الموروثة من المسار الكلاسيكي (14 مهمة)
 * - `analysis`   — مهام التحليل العميق للنص الدرامي
 * - `creative`   — مهام توليد المحتوى الإبداعي
 * - `predictive` — مهام التنبؤ بمسار القصة
 * - `advanced`   — وكلاء متخصصون ذوو قدرات متقدمة
 */
export type DevelopmentTaskCategory =
  | "core"
  | "analysis"
  | "creative"
  | "predictive"
  | "advanced";

/**
 * وضع التنفيذ الذي يحدد المسار الخلفي لكل مهمة
 *
 * - `brainstorm`       — يُرسل الطلب إلى POST /api/brainstorm (المسار الكلاسيكي، 16 مهمة)
 * - `workflow-single`  — يُرسل الطلب إلى POST /api/workflow/execute-custom بخطوة واحدة (9 مهام)
 * - `workflow-custom`  — يُرسل الطلب إلى POST /api/workflow/execute-custom بمسار متعدد الخطوات (2 مهمة مركبة)
 */
export type DevelopmentExecutionMode =
  | "brainstorm"
  | "workflow-single"
  | "workflow-custom";

/**
 * تعريف مهمة واحدة قابلة للاختيار من المستخدم داخل صفحة development
 *
 * يُستخدم لبناء كتالوج 27 مهمة موزعة على 5 فئات.
 * قيمة `executionMode` تحدد شكل `backendTarget` والمسار الخلفي المُستخدم.
 */
export interface DevelopmentTaskDefinition {
  /** معرّف فريد للمهمة داخل الكتالوج — يجب أن يتطابق مع معرّف الوكيل في الباك إند */
  id: string;
  /** الاسم العربي للمهمة كما يظهر للمستخدم في الواجهة */
  nameAr: string;
  /** فئة المهمة لتجميع العرض في الواجهة */
  category: DevelopmentTaskCategory;
  /** اسم الأيقونة المرتبطة بالمهمة في task-icon-mapper */
  icon: string;
  /** وصف مختصر يظهر كـ tooltip عند تحريك المؤشر على الزر */
  description: string;
  /** وضع التنفيذ الذي يحدد المسار الخلفي المُستخدم */
  executionMode: DevelopmentExecutionMode;
  /**
   * الهدف الخلفي للمهمة:
   * - سلسلة نصية لمعرّف الوكيل عند `brainstorm`
   * - كائن `WorkflowTaskTarget` عند `workflow-single` أو `workflow-custom`
   */
  backendTarget: string | WorkflowTaskTarget;
  /**
   * معرّف الخطوة النهائية المُستخدم لاستخراج `finalText` من نتيجة التنفيذ.
   * يجب أن يشير إلى خطوة فعلية قابلة للاستخراج من ناتج التنفيذ.
   */
  finalStepId: string;
}

/**
 * المدخلات المشتركة التي يستخدمها أي تشغيل داخل صفحة development
 *
 * تُبنى من حالة الهوك وتُمرَّر إلى ExecutionAdapter لتحديد المسار الصحيح.
 * `completionScope` و`selectedCompletionEnhancements` مشروطان ولا يُمرَّران
 * إلا عند اختيار مهمة `completion`.
 */
export interface DevelopmentExecutionInput {
  /** معرّف المهمة المختارة من الكتالوج */
  taskId: string;
  /** النص الدرامي الأصلي المُدخَل من المستخدم — خاضع لحد الطول الأدنى 100 حرف */
  originalText: string;
  /** تقرير تحليل المحطات السبع — يجب أن يكون متاحًا قبل فتح التنفيذ */
  analysisReport: string;
  /** معرّف جلسة التحليل أو null إذا لم يكن متاحًا */
  analysisId: string | null;
  /** متطلبات خاصة أو توجيهات إضافية للوكيل */
  specialRequirements: string;
  /** معلومات سياقية داعمة اختيارية */
  additionalInfo: string;
  /** نطاق الإكمال المطلوب — مطلوب فقط للمهام التي تحتاجه (completion) */
  completionScope?: string;
  /** التحسينات المختارة للإكمال — صالح فقط في مسار completion */
  selectedCompletionEnhancements?: string[];
  /** إعدادات أنظمة الذكاء الاصطناعي المتقدمة */
  advancedSettings: AdvancedAISettings;
}

/**
 * خطوة واحدة داخل تكوين workflow مخصص
 *
 * تُستخدم لبناء `WorkflowTaskTarget` للمهام التي تُنفَّذ عبر execute-custom.
 * المهام أحادية الوكيل تمتلك خطوة واحدة فقط بدون تبعيات.
 */
export interface WorkflowTaskStep {
  /** معرّف الخطوة — يُستخدم كـ finalStepId في تعريف المهمة */
  id: string;
  /** معرّف الوكيل المنفّذ لهذه الخطوة */
  agentId: string;
  /** نوع المهمة التي سيؤديها الوكيل */
  taskType: string;
  /**
   * التبعيات على خطوات سابقة — تحدد ترتيب التنفيذ ومتطلبات الاعتماد.
   * تُترك فارغة للخطوات الأولى أو المستقلة.
   */
  dependencies?: {
    agentId: string;
    taskType: string;
    /** إذا كان true يتوقف التنفيذ عند فشل هذه التبعية */
    required?: boolean;
    /** الحد الأدنى لمستوى الثقة المقبول من التبعية */
    minConfidence?: number;
  }[];
  /** إذا كان true يمكن تنفيذ هذه الخطوة بالتوازي مع خطوات أخرى */
  parallel?: boolean;
}

/**
 * التكوين الداخلي للمهام التي تُنفَّذ عبر POST /api/workflow/execute-custom
 *
 * يُبنى إما من خطوة واحدة (workflow-single) أو خطوات متعددة (workflow-custom).
 * يُمرَّر كحقل `config` في جسم الطلب إلى الباك إند.
 */
export interface WorkflowTaskTarget {
  /** نوع ثابت يُعرّف هذا الكائن كـ custom workflow */
  type: "custom-workflow";
  /** اسم الـ workflow يُستخدم في السجلات والتتبع */
  name: string;
  /** وصف يُوضح الغرض من الـ workflow */
  description: string;
  /** مصفوفة الخطوات المُرتبة — الخطوة الأخيرة تُنتج finalText */
  steps: WorkflowTaskStep[];
}

/**
 * ناتج خطوة واحدة داخل workflow أو مخرجات داعمة من مسار brainstorm
 *
 * يُستخدم لعرض النتائج الداعمة في AgentReportViewer وتصديرها عبر AgentReportsExporter.
 * الخطوات ذات `status !== "completed"` تُستثنى من التصدير.
 */
export interface SupportingStepResult {
  /** معرّف الخطوة يُطابق `WorkflowTaskStep.id` */
  stepId: string;
  /** معرّف الوكيل الذي نفّذ الخطوة */
  agentId: string;
  /** عنوان الخطوة للعرض في الواجهة */
  title: string;
  /** النص الناتج من الخطوة */
  text: string;
  /** مستوى الثقة في الناتج (0–1) */
  confidence?: number;
  /** حالة تنفيذ الخطوة */
  status: "completed" | "failed" | "skipped";
  /** الطابع الزمني لبداية التنفيذ (ISO 8601) */
  startedAt?: string;
  /** الطابع الزمني لانتهاء التنفيذ (ISO 8601) */
  completedAt?: string;
}

/**
 * التقرير الموحّد الذي تستهلكه الواجهة بعد التطبيع بغض النظر عن مسار التنفيذ
 *
 * يُنتج من `normalizeResult()` في result-normalizer.ts ويُضمَن دائمًا
 * عند نجاح التنفيذ في جميع المسارات (brainstorm / workflow-single / workflow-custom).
 * `finalText` يأتي من `finalStepId` أو من النص النهائي لمسار brainstorm.
 * `taskResults` يحتوي فقط النتائج المكتملة فعليًا (`status === "completed"`).
 */
export interface UnifiedDevelopmentReport {
  /** معرّف المهمة المُنفَّذة — يُطابق `DevelopmentTaskDefinition.id` */
  taskId: string;
  /** وضع التنفيذ المُستخدم — يُستخدم لتتبع الفشل وتشخيص المسار */
  executionMode: DevelopmentExecutionMode;
  /** النص النهائي المُستخرج من الخطوة المحددة بـ finalStepId */
  finalText: string;
  /** استجابة الذكاء الاصطناعي الكاملة للعرض والتصدير */
  aiResponse: AIResponseData;
  /** خريطة نتائج الخطوات المكتملة — مفتاحها معرّف الخطوة أو الوكيل */
  taskResults: Record<string, AgentReport>;
}

/**
 * اسم بديل لـ UnifiedDevelopmentReport يُستخدم كشكل الناتج الأساسي في الواجهة
 *
 * يضمن توافق الأنواع عند استهلاك النتائج من أي مسار تنفيذ.
 */
export type NormalizedDevelopmentResult = UnifiedDevelopmentReport;

// ============================================
// Zod Schemas للتحقق من البيانات
// ============================================

/**
 * مخطط التحقق من إعدادات الذكاء الاصطناعي
 */
export const advancedAISettingsSchema = z.object({
  enableRAG: z.boolean(),
  enableSelfCritique: z.boolean(),
  enableConstitutional: z.boolean(),
  enableHallucination: z.boolean(),
  enableUncertainty: z.boolean(),
  enableDebate: z.boolean(),
});

/**
 * مخطط التحقق من ملف معالج
 */
export const processedInputFileSchema = z.object({
  fileName: z.string().min(1, "اسم الملف مطلوب"),
  textContent: z.string().min(100, "يجب أن يحتوي النص على 100 حرف على الأقل"),
  size: z.number().positive(),
  sizeBytes: z.number().positive(),
});

/**
 * مخطط التحقق من طلب الذكاء الاصطناعي
 */
export const aiRequestSchema = z.object({
  agent: z.string().min(1, "معرف الوكيل مطلوب"),
  prompt: z.string(),
  context: z.object({
    files: z.array(processedInputFileSchema),
  }),
  options: z.object({
    additionalInfo: z.string().optional(),
    analysisReport: z.string().optional(),
    analysisId: z.string().nullable().optional(),
    completionScope: z.string().optional(),
    selectedCompletionEnhancements: z
      .array(z.nativeEnum(CreativeTaskType))
      .optional(),
  }),
});

/**
 * مخطط التحقق من مدخلات التقديم
 */
export const submitInputSchema = z.object({
  textInput: z.string().min(100, "يجب أن يحتوي النص على 100 حرف على الأقل"),
  selectedTask: z.nativeEnum(CreativeTaskType),
  completionScope: z.string().optional(),
});

/**
 * نوع الطلب بعد التحقق
 */
export type ValidatedAIRequest = z.infer<typeof aiRequestSchema>;

/**
 * نوع مدخلات التقديم بعد التحقق
 */
export type ValidatedSubmitInput = z.infer<typeof submitInputSchema>;

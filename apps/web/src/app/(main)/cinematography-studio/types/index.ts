/**
 * @fileoverview أنواع ومخططات التحقق لاستوديو التصوير السينمائي
 *
 * هذا الملف يحتوي على جميع التعريفات النوعية ومخططات Zod للتحقق من البيانات
 * المستخدمة في استوديو التصوير السينمائي. الهدف هو ضمان سلامة النوع
 * وتوفير تحقق قوي للبيانات في جميع أنحاء التطبيق.
 *
 * @module cinematography-studio/types
 */

import { z } from "zod";

// ============================================
// ثوابت التطبيق
// ============================================

/**
 * المراحل الأساسية للإنتاج السينمائي
 * كل مرحلة تمثل خطوة مختلفة في عملية صناعة الفيلم
 */
export const PRODUCTION_PHASES = ["pre", "production", "post"] as const;

/**
 * قيم علامات التبويب المتاحة في واجهة المستخدم
 */
export const TAB_VALUES = [
  "pre-production",
  "production",
  "post-production",
] as const;

/**
 * الأمزجة البصرية المتاحة للمشروع
 * كل مود يؤثر على اقتراحات الإضاءة والتصوير
 */
export const VISUAL_MOODS = [
  "noir",
  "realistic",
  "surreal",
  "vintage",
] as const;

/**
 * حالات الأدوات المتاحة
 */
export const TOOL_STATUS = ["available"] as const;

/**
 * طرق العرض في لوحة التحكم
 */
export const VIEW_MODES = ["dashboard", "phases"] as const;

// ============================================
// مخططات Zod للتحقق
// ============================================

/**
 * مخطط التحقق من مرحلة الإنتاج
 */
export const PhaseSchema = z.enum(PRODUCTION_PHASES);

/**
 * مخطط التحقق من قيمة علامة التبويب
 */
export const TabValueSchema = z.enum(TAB_VALUES);

/**
 * مخطط التحقق من المود البصري
 */
export const VisualMoodSchema = z.enum(VISUAL_MOODS);

/**
 * مخطط التحقق من حالة الأداة
 */
export const ToolStatusSchema = z.enum(TOOL_STATUS);

/**
 * مخطط التحقق من طريقة العرض
 */
export const ViewModeSchema = z.enum(VIEW_MODES);

/**
 * مخطط التحقق من بيانات الأداة
 */
export const ToolSchema = z.object({
  id: z.string().min(1, "معرف الأداة مطلوب"),
  name: z.string().min(1, "اسم الأداة مطلوب"),
  nameEn: z.string().min(1, "الاسم الإنجليزي مطلوب"),
  description: z.string().min(1, "وصف الأداة مطلوب"),
  color: z.string().min(1, "لون الأداة مطلوب"),
  status: ToolStatusSchema,
});

/**
 * مخطط التحقق من الإحصائيات
 */
export const StatSchema = z.object({
  label: z.string().min(1, "عنوان الإحصائية مطلوب"),
  value: z.string().min(1, "قيمة الإحصائية مطلوبة"),
});

/**
 * مخطط التحقق من وصف المشهد (ما قبل الإنتاج)
 */
export const ScenePromptSchema = z.object({
  prompt: z
    .string()
    .min(10, "يجب أن يحتوي الوصف على 10 أحرف على الأقل")
    .max(1000, "الوصف طويل جداً"),
  darkness: z.number().min(0, "قيمة الغموض يجب أن تكون بين 0 و 100").max(100),
  complexity: z
    .number()
    .min(0, "قيمة الفوضى البصرية يجب أن تكون بين 0 و 100")
    .max(100),
});

/**
 * مخطط التحقق من تحليل اللقطة (أثناء التصوير)
 */
export const ShotAnalysisSchema = z.object({
  score: z.number().min(0).max(100),
  dynamicRange: z.string(),
  grainLevel: z.string(),
  issues: z.array(z.string()),
  exposure: z.number().min(0).max(100),
});

/**
 * مخطط التحقق من درجة حرارة اللون (ما بعد الإنتاج)
 */
export const ColorTemperatureSchema = z
  .number()
  .min(2000, "درجة الحرارة يجب أن تكون 2000K على الأقل")
  .max(10000, "درجة الحرارة يجب ألا تتجاوز 10000K");

/**
 * مخطط التحقق من لون الباليت
 */
export const ColorHexSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "صيغة اللون غير صالحة");

/**
 * مخطط التحقق من لوحة الألوان
 */
export const ColorPaletteSchema = z.array(ColorHexSchema).min(1).max(10);

/**
 * مخطط التحقق من حالة استوديو السينما
 */
export const CineStudioStateSchema = z.object({
  currentPhase: PhaseSchema,
  visualMood: VisualMoodSchema,
  activeTool: z.string().nullable(),
  activeView: ViewModeSchema,
});

// ============================================
// استخراج الأنواع من مخططات Zod
// ============================================

/** نوع مرحلة الإنتاج */
export type Phase = z.infer<typeof PhaseSchema>;

/** نوع قيمة علامة التبويب */
export type TabValue = z.infer<typeof TabValueSchema>;

/** نوع المود البصري */
export type VisualMood = z.infer<typeof VisualMoodSchema>;

/** نوع حالة الأداة */
export type ToolStatus = z.infer<typeof ToolStatusSchema>;

/** نوع طريقة العرض */
export type ViewMode = z.infer<typeof ViewModeSchema>;

/** نوع بيانات الأداة */
export type Tool = z.infer<typeof ToolSchema>;

/** نوع الإحصائية */
export type Stat = z.infer<typeof StatSchema>;

/** نوع وصف المشهد */
export type ScenePrompt = z.infer<typeof ScenePromptSchema>;

/** نوع تحليل اللقطة */
export type ShotAnalysis = z.infer<typeof ShotAnalysisSchema>;

/** نوع حالة استوديو السينما */
export type CineStudioState = z.infer<typeof CineStudioStateSchema>;

// ============================================
// واجهات الخصائص للمكونات
// ============================================

/**
 * خصائص أدوات ما قبل الإنتاج
 */
export interface PreProductionToolsProps {
  /** المود البصري المحدد للمشروع */
  mood?: VisualMood;
}

/**
 * خصائص أدوات أثناء التصوير
 */
export interface ProductionToolsProps {
  /** المود البصري المحدد للمشروع */
  mood?: VisualMood;
}

/**
 * خصائص أدوات ما بعد الإنتاج
 */
export interface PostProductionToolsProps {
  /** المود البصري المحدد للمشروع */
  mood?: VisualMood;
}

/**
 * نتيجة التوليد البصري
 */
export interface VisualGenerationResult {
  /** معرف فريد للنتيجة */
  id: string;
  /** النص المقترح للّقطة */
  suggestionText?: string;
  /** نوع اللقطة المقترح */
  shotType?: string;
  /** نوع العدسة المقترح */
  lens: string;
  /** نوع الإضاءة المقترح */
  lighting: string;
  /** زاوية الكاميرا المقترحة */
  angle: string;
  /** الطابع الزمني للإنشاء */
  createdAt: Date;
}

/**
 * إعدادات تصدير الفيديو
 */
export interface ExportSettings {
  /** المنصة المستهدفة */
  platform: "cinema-dcp" | "broadcast-hd" | "web-social" | "bluray";
  /** دقة الفيديو */
  resolution?: string;
  /** معدل الإطارات */
  frameRate?: number;
  /** صيغة الترميز */
  codec?: string;
}

/**
 * ملخص تحليل الإطار المرجعي
 */
export interface FootageAnalysisSummary {
  score: number;
  status: string;
  exposure: string;
  colorBalance: string;
  focus: string;
  suggestions: string[];
}

// ============================================
// خرائط التحويل
// ============================================

/**
 * خريطة تحويل المرحلة إلى قيمة التبويب
 */
export const TAB_VALUE_BY_PHASE: Record<Phase, TabValue> = {
  pre: "pre-production",
  production: "production",
  post: "post-production",
};

/**
 * خريطة تحويل قيمة التبويب إلى المرحلة
 */
export const PHASE_BY_TAB: Record<TabValue, Phase> = {
  "pre-production": "pre",
  production: "production",
  "post-production": "post",
};

// ============================================
// دوال التحقق المساعدة
// ============================================

/**
 * التحقق من صحة قيمة التبويب
 *
 * @param value - القيمة المراد التحقق منها
 * @returns صحيح إذا كانت القيمة علامة تبويب صالحة
 */
export const isValidTabValue = (value: string): value is TabValue => {
  return TabValueSchema.safeParse(value).success;
};

/**
 * التحقق من صحة المود البصري
 *
 * @param value - القيمة المراد التحقق منها
 * @returns صحيح إذا كانت القيمة مود بصري صالح
 */
export const isValidVisualMood = (value: string): value is VisualMood => {
  return VisualMoodSchema.safeParse(value).success;
};

/**
 * التحقق من صحة وصف المشهد
 *
 * @param data - بيانات وصف المشهد
 * @returns نتيجة التحقق مع الأخطاء إن وجدت
 */
export const validateScenePrompt = (data: unknown) => {
  return ScenePromptSchema.safeParse(data);
};

/**
 * التحقق من صحة درجة حرارة اللون
 *
 * @param temperature - درجة الحرارة بالكلفن
 * @returns نتيجة التحقق مع الأخطاء إن وجدت
 */
export const validateColorTemperature = (temperature: number) => {
  return ColorTemperatureSchema.safeParse(temperature);
};

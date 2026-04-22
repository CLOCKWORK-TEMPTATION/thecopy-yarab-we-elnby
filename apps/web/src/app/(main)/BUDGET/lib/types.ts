/**
 * أنواع BUDGET المشتركة
 *
 * @description
 * يجمع كل تعريفات الأنواع المستخدمة في تطبيق إدارة ميزانيات الأفلام
 * لضمان سلامة النوعية في جميع أنحاء التطبيق
 *
 * السبب: توحيد الأنواع يمنع أخطاء التشغيل ويُسهّل الصيانة
 */

import { z } from "zod";

// ==================== مخططات Zod للتحقق ====================

/**
 * مخطط التحقق من عنصر الميزانية
 *
 * @description
 * يُستخدم للتحقق من صحة بيانات كل بند في الميزانية
 */
export const LineItemSchema = z.object({
  /** رمز البند */
  code: z.string(),
  /** وصف البند */
  description: z.string(),
  /** الكمية */
  amount: z.number().nonnegative(),
  /** وحدة القياس */
  unit: z.string(),
  /** السعر الوحدوي */
  rate: z.number().nonnegative(),
  /** المجموع (الكمية × السعر) */
  total: z.number().nonnegative(),
  /** ملاحظات إضافية */
  notes: z.string().optional(),
  /** تاريخ آخر تعديل */
  lastModified: z.string().optional(),
});

/**
 * مخطط التحقق من فئة الميزانية
 */
export const CategorySchema = z.object({
  /** رمز الفئة */
  code: z.string(),
  /** اسم الفئة */
  name: z.string(),
  /** بنود الفئة */
  items: z.array(LineItemSchema),
  /** مجموع الفئة */
  total: z.number().nonnegative(),
  /** وصف الفئة */
  description: z.string().optional(),
});

/**
 * مخطط التحقق من قسم الميزانية
 */
export const SectionSchema = z.object({
  /** معرّف القسم */
  id: z.string(),
  /** اسم القسم */
  name: z.string(),
  /** فئات القسم */
  categories: z.array(CategorySchema),
  /** مجموع القسم */
  total: z.number().nonnegative(),
  /** وصف القسم */
  description: z.string().optional(),
  /** لون القسم في الرسم البياني */
  color: z.string().optional(),
});

/**
 * مخطط التحقق من البيانات الوصفية للميزانية
 */
export const BudgetMetadataSchema = z.object({
  /** عنوان الفيلم */
  title: z.string().optional(),
  /** اسم المخرج */
  director: z.string().optional(),
  /** اسم المنتج */
  producer: z.string().optional(),
  /** شركة الإنتاج */
  productionCompany: z.string().optional(),
  /** عدد أيام التصوير */
  shootingDays: z.number().positive().optional(),
  /** مواقع التصوير */
  locations: z.array(z.string()).optional(),
  /** نوع الفيلم */
  genre: z.string().optional(),
});

/**
 * مخطط التحقق من الميزانية الكاملة
 */
export const BudgetSchema = z.object({
  /** أقسام الميزانية */
  sections: z.array(SectionSchema),
  /** المجموع الكلي */
  grandTotal: z.number().nonnegative(),
  /** العملة */
  currency: z.string(),
  /** البيانات الوصفية */
  metadata: BudgetMetadataSchema.optional(),
});

/**
 * مخطط طلب إنشاء الميزانية
 */
export const GenerateBudgetRequestSchema = z.object({
  /** عنوان الفيلم */
  title: z.string().min(1, "عنوان الفيلم مطلوب"),
  /** نص السيناريو */
  scenario: z.string().min(10, "السيناريو قصير جداً"),
});

/**
 * مخطط تحليل الذكاء الاصطناعي
 */
export const AIAnalysisSchema = z.object({
  /** ملخص التحليل */
  summary: z.string(),
  /** التوصيات */
  recommendations: z.array(z.string()),
  /** عوامل المخاطرة */
  riskFactors: z.array(z.string()),
  /** فرص توفير التكاليف */
  costOptimization: z.array(z.string()),
  /** الجدول الزمني المقترح */
  shootingSchedule: z.object({
    totalDays: z.number().positive(),
    phases: z.object({
      preProduction: z.number().nonnegative(),
      production: z.number().nonnegative(),
      postProduction: z.number().nonnegative(),
    }),
  }),
});

// ==================== أنواع TypeScript ====================

/**
 * عنصر في الميزانية (بند)
 *
 * @description
 * يمثل بنداً واحداً في قائمة تكاليف الميزانية
 * كالمعدات أو الطاقم أو المواقع
 */
export interface LineItem {
  /** رمز البند - يُستخدم للتعريف الفريد */
  code: string;
  /** وصف البند */
  description: string;
  /** الكمية أو العدد */
  amount: number;
  /** وحدة القياس (يوم، أسبوع، وحدة) */
  unit: string;
  /** السعر الوحدوي بالدولار */
  rate: number;
  /** المجموع (الكمية × السعر) */
  total: number;
  /** ملاحظات إضافية */
  notes?: string;
  /** تاريخ آخر تعديل */
  lastModified?: string;
}

/**
 * فئة في الميزانية
 *
 * @description
 * تجمع البنود المتشابهة تحت تصنيف واحد
 * مثل: معدات الكاميرا، طاقم الإضاءة
 */
export interface Category {
  /** رمز الفئة */
  code: string;
  /** اسم الفئة */
  name: string;
  /** قائمة البنود في هذه الفئة */
  items: LineItem[];
  /** مجموع تكاليف الفئة */
  total: number;
  /** وصف الفئة */
  description?: string;
}

/**
 * قسم في الميزانية
 *
 * @description
 * يمثل قسماً رئيسياً في الميزانية
 * مثل: فوق الخط (ATL)، الإنتاج، ما بعد الإنتاج
 */
export interface Section {
  /** معرّف القسم الفريد */
  id: string;
  /** اسم القسم */
  name: string;
  /** فئات هذا القسم */
  categories: Category[];
  /** مجموع تكاليف القسم */
  total: number;
  /** وصف القسم */
  description?: string;
  /** لون القسم في الرسوم البيانية */
  color?: string;
}

/**
 * الميزانية الكاملة
 *
 * @description
 * تمثل ميزانية فيلم كاملة مع جميع الأقسام والتفاصيل
 */
export interface Budget {
  /** أقسام الميزانية */
  sections: Section[];
  /** المجموع الكلي للميزانية */
  grandTotal: number;
  /** رمز العملة */
  currency: string;
  /** البيانات الوصفية للمشروع */
  metadata?: {
    title?: string;
    director?: string;
    producer?: string;
    productionCompany?: string;
    shootingDays?: number;
    locations?: string[];
    genre?: string;
  };
}

/**
 * مخاطر الأمان المالي
 *
 * @description
 * يحسب رسوم التأمين والاحتياطي والائتمانات
 * التي تُضاف للميزانية كضمانات مالية
 */
export interface SecurityRisk {
  /** رسوم ضمان الإنجاز */
  bondFee: { percent: number; total: number };
  /** احتياطي الطوارئ */
  contingency: { percent: number; total: number };
  /** ائتمانات المنتج */
  credits: { percent: number; total: number };
}

/**
 * حالة المعالجة
 *
 * @description
 * تتبع حالة عملية إنشاء أو تحليل الميزانية
 */
export type ProcessingStatus =
  | "idle"
  | "analyzing"
  | "calculating"
  | "complete"
  | "error";

/**
 * ميزانية محفوظة
 *
 * @description
 * تمثل ميزانية تم حفظها في التخزين المحلي
 * مع البيانات الوصفية الإضافية
 */
export interface SavedBudget {
  /** معرّف الميزانية الفريد */
  id: string;
  /** اسم الميزانية */
  name: string;
  /** بيانات الميزانية الكاملة */
  budget: Budget;
  /** نص السيناريو المرتبط */
  script: string;
  /** تاريخ الحفظ */
  date: string;
  /** صورة مصغرة */
  thumbnail?: string;
  /** وسوم للتصنيف */
  tags?: string[];
}

/**
 * قالب ميزانية
 *
 * @description
 * قالب جاهز للميزانية بناءً على نوع المشروع
 * يوفر نقطة بداية سريعة للمستخدم
 */
export interface BudgetTemplate {
  /** معرّف القالب */
  id: string;
  /** اسم القالب */
  name: string;
  /** وصف القالب */
  description: string;
  /** بيانات الميزانية */
  budget: Budget;
  /** أيقونة العرض */
  icon: string;
  /** فئة المشروع */
  category: "feature" | "short" | "documentary" | "commercial" | "music-video";
}

/**
 * بيانات الرسم البياني
 *
 * @description
 * يمثل نقطة بيانات واحدة في الرسم البياني
 */
export interface ChartData {
  /** اسم العنصر */
  name: string;
  /** القيمة */
  value: number;
  /** النسبة المئوية */
  percentage?: string;
  /** اللون */
  color?: string;
}

/**
 * خيارات التصدير
 *
 * @description
 * يحدد تنسيق ومحتوى ملف التصدير
 */
export interface ExportOptions {
  /** تنسيق الملف */
  format: "csv" | "pdf" | "json" | "excel";
  /** تضمين القيم الصفرية */
  includeZeroValues: boolean;
  /** تضمين التفاصيل */
  includeDetails: boolean;
  /** تضمين الرسوم البيانية */
  includeCharts: boolean;
}

/**
 * تفضيلات المستخدم
 *
 * @description
 * إعدادات التطبيق القابلة للتخصيص من المستخدم
 */
export interface UserPreferences {
  /** لغة الواجهة */
  language: "en" | "ar" | "es" | "fr";
  /** نمط المظهر */
  theme: "light" | "dark" | "auto";
  /** العملة الافتراضية */
  currency: string;
  /** تنسيق التاريخ */
  dateFormat: string;
  /** تفعيل الإشعارات */
  notifications: boolean;
  /** الحفظ التلقائي */
  autoSave: boolean;
}

/**
 * بيانات المقارنة
 *
 * @description
 * نتيجة مقارنة ميزانيتين لتحديد الفروقات
 */
export interface ComparisonData {
  /** الميزانية الأولى */
  budget1: SavedBudget;
  /** الميزانية الثانية */
  budget2: SavedBudget;
  /** قائمة الفروقات */
  differences: {
    section: string;
    category: string;
    difference: number;
    percentage: number;
  }[];
}

/**
 * بيانات التحليلات
 *
 * @description
 * إحصائيات ومقاييس أداء الميزانية
 */
export interface AnalyticsData {
  /** إجمالي عدد الميزانيات */
  totalBudgets: number;
  /** متوسط قيمة الميزانية */
  averageBudget: number;
  /** الفئة الأعلى تكلفة */
  mostExpensiveCategory: string;
  /** التكلفة لكل يوم تصوير */
  costPerShootingDay: number;
  /** كفاءة الميزانية */
  budgetEfficiency: number;
}

/**
 * إشعار
 *
 * @description
 * رسالة إشعار للمستخدم
 */
export interface Notification {
  /** معرّف الإشعار */
  id: string;
  /** نوع الإشعار */
  type: "success" | "error" | "warning" | "info";
  /** عنوان الإشعار */
  title: string;
  /** محتوى الرسالة */
  message: string;
  /** الطابع الزمني */
  timestamp: string;
}

/**
 * تحليل الذكاء الاصطناعي
 *
 * @description
 * نتيجة تحليل السيناريو بواسطة الذكاء الاصطناعي
 * يتضمن التوصيات والمخاطر وفرص التوفير
 *
 * السبب: يوفر رؤى احترافية تساعد في اتخاذ قرارات
 * مدروسة حول الميزانية
 */
export interface AIAnalysis {
  /** ملخص التحليل الإنتاجي */
  summary: string;
  /** قائمة التوصيات */
  recommendations: string[];
  /** عوامل المخاطرة المحددة */
  riskFactors: string[];
  /** فرص تحسين التكاليف */
  costOptimization: string[];
  /** الجدول الزمني المقترح للتصوير */
  shootingSchedule: {
    /** إجمالي أيام المشروع */
    totalDays: number;
    /** تفصيل المراحل */
    phases: {
      /** أيام ما قبل الإنتاج */
      preProduction: number;
      /** أيام الإنتاج/التصوير */
      production: number;
      /** أيام ما بعد الإنتاج */
      postProduction: number;
    };
  };
}

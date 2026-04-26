/**
 * CineArchitect AI - Core Types
 * أنواع البيانات الأساسية لنظام CineArchitect
 *
 * @description هذا الملف يحتوي على جميع الأنواع والواجهات المستخدمة في التطبيق
 * لضمان Type Safety وتوحيد البيانات عبر المكونات المختلفة
 */

import { z } from "zod";

// ==================== Zod Schemas ====================
// مخططات Zod للتحقق من صحة البيانات في وقت التشغيل

/**
 * مخطط فئات الإضافات
 * يحدد الفئات المسموح بها للإضافات في النظام
 */
export const PluginCategorySchema = z.enum([
  "ai-analytics", // أدوات الذكاء الاصطناعي التحليلية
  "collaboration", // أدوات التعاون
  "resource-management", // إدارة الموارد
  "xr-immersive", // الواقع الممتد
  "learning", // التعلم والمعرفة
  "sustainability", // الاستدامة
  "documentation", // التوثيق
  "safety", // الأمان
  "marketing", // التسويق
]);

/**
 * مخطط بيانات الإضافة المدخلة
 * يتحقق من صحة البيانات المرسلة إلى الإضافة
 */
export const PluginInputSchema = z.object({
  type: z.string().min(1, "نوع المدخل مطلوب"),
  data: z.record(z.unknown()),
  options: z.record(z.unknown()).optional(),
});

/**
 * مخطط نتيجة تنفيذ الإضافة
 * يتحقق من صحة البيانات المرجعة من الإضافة
 */
export const PluginOutputSchema = z.object({
  success: z.boolean(),
  data: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});

/**
 * مخطط معلومات الإضافة الأساسية
 * يستخدم للتحقق من بيانات الإضافة المسترجعة من API
 */
export const PluginInfoSchema = z.object({
  id: z.string().min(1, "معرف الإضافة مطلوب"),
  name: z.string().min(1, "اسم الإضافة مطلوب"),
  nameAr: z.string().min(1, "الاسم العربي مطلوب"),
  version: z.string().optional(),
  category: z.string(),
});

/**
 * مخطط استجابة API للإضافات
 */
export const PluginsApiResponseSchema = z.object({
  plugins: z.array(PluginInfoSchema).optional(),
  success: z.boolean().optional(),
  error: z.string().optional(),
});

// ==================== Type Definitions ====================
// تعريفات الأنواع المشتقة من مخططات Zod

export type PluginCategory = z.infer<typeof PluginCategorySchema>;
export type PluginInput = z.infer<typeof PluginInputSchema>;
export type PluginOutput = z.infer<typeof PluginOutputSchema>;
export type PluginInfo = z.infer<typeof PluginInfoSchema>;
export type PluginsApiResponse = z.infer<typeof PluginsApiResponseSchema>;

/**
 * واجهة الإضافة الكاملة
 * تمثل إضافة قابلة للتنفيذ في النظام
 *
 * @property id - المعرف الفريد للإضافة
 * @property name - الاسم بالإنجليزية
 * @property nameAr - الاسم بالعربية
 * @property version - رقم الإصدار
 * @property description - الوصف بالإنجليزية
 * @property descriptionAr - الوصف بالعربية
 * @property category - فئة الإضافة
 */
export interface Plugin {
  id: string;
  name: string;
  nameAr: string;
  version: string;
  description: string;
  descriptionAr: string;
  category: PluginCategory;
  initialize(): Promise<void>;
  execute(input: PluginInput): Promise<PluginOutput>;
  shutdown(): Promise<void>;
}

// ==================== Project Types ====================
// أنواع المشاريع والمشاهد

/**
 * واجهة المشروع
 * تمثل مشروع إنتاج سينمائي كامل
 */
export interface Project {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  scenes: Scene[];
  budget: Budget;
  team: TeamMember[];
  locations: Location[];
  assets: Asset[];
}

/**
 * واجهة المشهد
 * تمثل مشهد واحد في المشروع
 */
export interface Scene {
  id: string;
  number: number;
  name: string;
  description: string;
  location: string;
  timeOfDay: "day" | "night" | "dawn" | "dusk";
  characters: string[];
  props: string[];
  notes: string;
  colorPalette?: ColorPalette;
  lightingSetup?: LightingSetup;
}

/**
 * واجهة لوحة الألوان
 * تحدد نظام الألوان المستخدم في المشهد
 */
export interface ColorPalette {
  primary: string[];
  secondary: string[];
  accent: string[];
  mood: string;
}

/**
 * واجهة إعداد الإضاءة
 * تحدد تكوين الإضاءة للمشهد
 */
export interface LightingSetup {
  type: "natural" | "artificial" | "mixed";
  keyLight?: Light;
  fillLight?: Light;
  backLight?: Light;
  practicals?: Light[];
  notes: string;
}

/**
 * واجهة مصدر الضوء
 * تمثل خصائص مصدر ضوء واحد
 */
export interface Light {
  type: string;
  intensity: number;
  colorTemperature: number;
  position: string;
}

// ==================== Budget Types ====================
// أنواع الميزانية

/**
 * واجهة الميزانية
 * تمثل ميزانية المشروع الكاملة
 */
export interface Budget {
  total: number;
  currency: string;
  categories: BudgetCategory[];
  spent: number;
  remaining: number;
}

/**
 * واجهة فئة الميزانية
 * تمثل تخصيص ميزانية لفئة معينة
 */
export interface BudgetCategory {
  name: string;
  nameAr: string;
  allocated: number;
  spent: number;
}

// ==================== Team Types ====================
// أنواع الفريق

/**
 * واجهة عضو الفريق
 * تمثل معلومات عضو واحد في فريق الإنتاج
 */
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  roleAr: string;
  department: string;
  email: string;
  phone?: string;
}

// ==================== Location Types ====================
// أنواع المواقع

/**
 * مخطط الموقع للتحقق من صحة البيانات
 */
export const LocationSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string(),
  type: z.string(),
  address: z.string(),
  features: z.array(z.string()).optional(),
});

/**
 * واجهة الموقع (بسيطة)
 * تستخدم في عرض قائمة المواقع
 */
export interface LocationSimple {
  id: string;
  name: string;
  nameAr: string;
  type: string;
  address: string;
  features: string[];
}

/**
 * واجهة الموقع (كاملة)
 * تمثل معلومات موقع تصوير كاملة
 */
export interface Location {
  id: string;
  name: string;
  address: string;
  type: "studio" | "outdoor" | "interior" | "exterior";
  availability: DateRange[];
  permits: Permit[];
  photos: string[];
  notes: string;
}

/**
 * واجهة نطاق التاريخ
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * واجهة التصريح
 */
export interface Permit {
  type: string;
  status: "pending" | "approved" | "denied";
  expiresAt?: Date;
}

// ==================== Asset Types ====================
// أنواع الأصول والديكور

/**
 * مخطط قطعة الديكور للتحقق من صحة البيانات
 */
export const SetPieceSchema = z.object({
  id: z.string(),
  name: z.string(),
  nameAr: z.string(),
  category: z.string(),
  condition: z.string(),
  reusabilityScore: z.number().min(0).max(100),
});

/**
 * واجهة قطعة الديكور
 */
export interface SetPiece {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  condition: string;
  reusabilityScore: number;
}

/**
 * واجهة الأصل
 * تمثل قطعة من قطع الإنتاج
 */
export interface Asset {
  id: string;
  name: string;
  type: "prop" | "costume" | "set-piece" | "vehicle" | "equipment";
  status: "available" | "in-use" | "maintenance" | "retired";
  location: string;
  photos: string[];
  notes: string;
}

// ==================== Analysis Types (re-exported) ====================
export type {
  VisualAnalysisResult,
  VisualIssue,
  TranslationResult,
  RiskAnalysis,
  Risk,
  Mitigation,
  ContingencyPlan,
} from "./analysis";

// ==================== Component-Specific Types (re-exported) ====================
export {
  ColorPaletteInspirationSchema,
  MoodBoardSchema,
  SustainabilityReportSchema,
  ProductionBookSchema,
  StyleGuideSchema,
} from "./components";
export type {
  ColorPaletteInspiration,
  MoodBoard,
  SustainabilityReport,
  ProductionBook,
  StyleGuide,
} from "./components";

// ==================== API Response Types ====================
// أنواع استجابات API

/**
 * مخطط استجابة API العامة
 *
 * @description يضمن هذا المخطط أن استجابات API تتبع نمطاً موحداً:
 * - عند النجاح: success = true مع data (اختياري)
 * - عند الفشل: success = false مع error (مطلوب)
 *
 * @param dataSchema - مخطط Zod للبيانات المتوقعة
 * @returns مخطط Zod للاستجابة الكاملة
 */
 
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion("success", [
    // حالة النجاح: success = true مع data اختياري
    z.object({
      success: z.literal(true),
      data: dataSchema.optional(),
      error: z.undefined(),
    }),
    // حالة الفشل: success = false مع error مطلوب
    z.object({
      success: z.literal(false),
      data: z.undefined(),
      error: z.string().min(1, "رسالة الخطأ مطلوبة عند الفشل"),
    }),
  ]);

/**
 * مخطط استجابة API البسيط (للاستخدام العام)
 * يستخدم عندما لا نحتاج للتحقق من بنية data بالتفصيل
 */
export const SimpleApiResponseSchema = z
  .object({
    success: z.boolean(),
    data: z.record(z.unknown()).optional(),
    error: z.string().optional(),
  })
  .refine(
    (data) => {
      // إذا فشلت العملية، يجب أن يكون هناك رسالة خطأ
      if (!data.success && !data.error) {
        return false;
      }
      return true;
    },
    {
      message: "رسالة الخطأ مطلوبة عند فشل العملية",
    }
  );

/**
 * واجهة استجابة API العامة
 *
 * @template T - نوع البيانات المتوقعة في حالة النجاح
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * واجهة استجابة API الناجحة
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  error?: never;
}

/**
 * واجهة استجابة API الفاشلة
 */
export interface ApiErrorResponse {
  success: false;
  data?: never;
  error: string;
}

/**
 * @module types/analysis
 * @description أنواع البيانات الخاصة بنظام التحليل الدرامي - المحطات السبع
 *
 * هذا الملف يعرّف جميع الـ interfaces و Zod schemas المستخدمة في
 * صفحة التحليل الدرامي ونظام المحطات السبع للتحليل المتقدم.
 *
 * السبب: توحيد التعريفات وضمان Type Safety عبر جميع المكونات
 * المتعلقة بالتحليل الدرامي، مع التحقق من صحة البيانات القادمة من الـ API.
 */

import { z } from "zod";

// ==========================================
// Zod Schemas للتحقق من البيانات
// ==========================================

/**
 * مخطط التحقق من علاقات الشخصيات
 * السبب: ضمان صحة بيانات الشخصيات وعلاقاتهم القادمة من الـ API
 */
export const CharactersRelationshipsSchema = z.object({
  characters: z.array(z.string()).default([]),
  relationships: z.array(z.string()).default([]),
});

/**
 * مخطط التحقق من المواضيع والأنواع الدرامية
 * السبب: ضمان تصنيف دقيق للعمل الدرامي
 */
export const ThemesGenresSchema = z.object({
  themes: z.array(z.string()).default([]),
  genres: z.array(z.string()).default([]),
});

/**
 * مخطط التحقق من تحليل الكفاءة
 * السبب: قياس جودة السيناريو بشكل موضوعي
 */
export const EfficiencySchema = z.object({
  efficiencyScore: z.number().min(0).max(100),
  effectivenessAnalysis: z.string(),
});

/**
 * مخطط التحقق من شبكة الصراع
 * السبب: تمثيل العلاقات المعقدة بين الشخصيات والأحداث
 */
export const ConflictNetworkSchema = z.object({
  conflictNetworkJson: z.string(),
});

/**
 * مخطط التحقق من تدفقات التحليل (Flows)
 * السبب: تجميع كل تحليلات التدفق في كائن واحد موحد
 */
export const FlowsResultSchema = z.object({
  charactersRelationships: CharactersRelationshipsSchema.optional(),
  themesGenres: ThemesGenresSchema.optional(),
  efficiency: EfficiencySchema.optional(),
  conflictNetwork: ConflictNetworkSchema.optional(),
});

/**
 * مخطط التحقق من جزء RAG (قطعة نصية)
 * السبب: التعامل مع النصوص الطويلة عبر تقسيمها لقطع قابلة للمعالجة
 */
export const RAGChunkSchema = z.object({
  id: z.string(),
  content: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
});

/**
 * مخطط التحقق من نتائج RAG
 * السبب: معالجة النصوص الطويلة عبر تقنية RAG
 */
export const RAGResultSchema = z.object({
  needsChunking: z.boolean(),
  chunks: z.array(RAGChunkSchema).default([]),
  summary: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * مخطط التحقق من الميزات المفعلة
 * السبب: تتبع أي محطات/ميزات تم تفعيلها في التحليل
 */
export const FeaturesSchema = z.object({
  station1: z.boolean(),
  flows: z.boolean(),
  rag: z.boolean(),
});

/**
 * مخطط التحقق من البيانات الوصفية للتحليل
 * السبب: تتبع معلومات مهمة عن عملية التحليل
 */
export const AnalysisMetadataSchema = z.object({
  stationName: z.string(),
  stationNumber: z.number(),
  status: z.string(),
  executionTime: z.number(),
  agentsUsed: z.array(z.string()).default([]),
  tokensUsed: z.number(),
  features: FeaturesSchema,
});

/**
 * مخطط التحقق من نتائج المحطة الأولى
 * السبب: التحقق من صحة بيانات التحليل النصي الأساسي
 */
export const Station1ResultSchema = z.object({
  logline: z.string().optional(),
  majorCharacters: z.array(z.string()).optional(),
  synopsis: z.string().optional(),
  genre: z.string().optional(),
  tone: z.string().optional(),
});

/**
 * مخطط التحقق من نتيجة التحليل الكاملة
 * السبب: التحقق الشامل من كل بيانات نتيجة التحليل
 */
export const AnalysisResultSchema = z.object({
  success: z.boolean(),
  station1: Station1ResultSchema.optional(),
  flows: FlowsResultSchema.optional(),
  rag: RAGResultSchema.optional(),
  metadata: AnalysisMetadataSchema.optional(),
});

/**
 * مخطط التحقق من طلب التحليل
 * السبب: التحقق من صحة بيانات الطلب قبل إرساله للـ API
 */
export const AnalysisRequestSchema = z.object({
  text: z.string().min(1, "يجب إدخال نص للتحليل"),
  enableFlows: z.boolean().default(true),
  enableRAG: z.boolean().default(true),
});

// ==========================================
// TypeScript Interfaces (مستخرجة من Zod)
// ==========================================

/**
 * واجهة علاقات الشخصيات
 */
export type CharactersRelationships = z.infer<
  typeof CharactersRelationshipsSchema
>;

/**
 * واجهة المواضيع والأنواع
 */
export type ThemesGenres = z.infer<typeof ThemesGenresSchema>;

/**
 * واجهة تحليل الكفاءة
 */
export type Efficiency = z.infer<typeof EfficiencySchema>;

/**
 * واجهة شبكة الصراع
 */
export type ConflictNetwork = z.infer<typeof ConflictNetworkSchema>;

/**
 * واجهة تدفقات التحليل
 */
export type FlowsResult = z.infer<typeof FlowsResultSchema>;

/**
 * واجهة جزء RAG
 */
export type RAGChunk = z.infer<typeof RAGChunkSchema>;

/**
 * واجهة نتائج RAG
 */
export type RAGResult = z.infer<typeof RAGResultSchema>;

/**
 * واجهة الميزات المفعلة
 */
export type Features = z.infer<typeof FeaturesSchema>;

/**
 * واجهة البيانات الوصفية
 */
export type AnalysisMetadata = z.infer<typeof AnalysisMetadataSchema>;

/**
 * واجهة نتائج المحطة الأولى
 */
export type Station1Result = z.infer<typeof Station1ResultSchema>;

/**
 * واجهة نتيجة التحليل الكاملة
 */
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * واجهة طلب التحليل
 */
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

// ==========================================
// حالات التحليل
// ==========================================

/**
 * حالات عملية التحليل
 * السبب: تتبع حالة التحليل في واجهة المستخدم
 */
export type AnalysisStatus =
  | "idle" // الحالة الأولية
  | "loading" // جاري التحليل
  | "success" // نجح التحليل
  | "error"; // فشل التحليل

/**
 * واجهة حالة صفحة التحليل
 * السبب: توحيد حالة المكون الرئيسي
 */
export interface AnalysisPageState {
  /** النص المدخل للتحليل */
  text: string;
  /** حالة التحليل الحالية */
  status: AnalysisStatus;
  /** نتيجة التحليل */
  result: AnalysisResult | null;
  /** رسالة الخطأ إن وجدت */
  error: string | null;
}

// ==========================================
// رسائل الخطأ
// ==========================================

/**
 * رسائل الخطأ المعرّفة مسبقاً
 * السبب: توحيد رسائل الخطأ عبر التطبيق
 */
export const ANALYSIS_ERROR_MESSAGES = {
  EMPTY_TEXT: "يرجى إدخال نص للتحليل",
  API_ERROR: "فشل الاتصال بخادم التحليل",
  VALIDATION_ERROR: "بيانات التحليل غير صالحة",
  UNKNOWN_ERROR: "حدث خطأ غير متوقع",
  TIMEOUT_ERROR: "انتهت مهلة التحليل - يرجى المحاولة مرة أخرى",
} as const;

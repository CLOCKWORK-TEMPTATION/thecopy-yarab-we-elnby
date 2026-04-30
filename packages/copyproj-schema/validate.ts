/**
 * @fileoverview التحقق من صحة ملفات .copyproj باستخدام zod
 *
 * يُتيح هذا الموديول:
 * 1. التحقق من صلاحية بيانات JSON تمثّل ملف .copyproj
 * 2. استخراج النوع TypeScript المستنتج (CopyprojFile)
 * 3. التحقق من توافق schema-version عند فتح ملف
 */

import { z } from "zod";

// ============================================================
// الأنواع الجزئية المشتركة
// ============================================================

const SceneHeaderDataSchema = z.object({
  sceneNumber: z.union([z.string(), z.number()]).optional(),
  interior: z.boolean().optional(),
  location: z.string().optional(),
  timeOfDay: z.string().optional(),
});

const SceneStatsSchema = z.object({
  wordCount: z.number().int().nonnegative().optional(),
  pageCount: z.number().nonnegative().optional(),
  estimatedScreenTime: z.number().nonnegative().optional(),
});

const CastMemberSchema = z.object({
  name: z.string().min(1).max(255),
  role: z.string().max(100),
  age: z.string().max(50).optional(),
  gender: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  motivation: z.string().max(1000).optional(),
});

const SceneBreakdownSchema = z
  .object({
    cast: z.array(CastMemberSchema).optional(),
    costumes: z.array(z.string()).optional(),
    makeup: z.array(z.string()).optional(),
    setDressing: z.array(z.string()).optional(),
    graphics: z.array(z.string()).optional(),
    sound: z.array(z.string()).optional(),
    equipment: z.array(z.string()).optional(),
  })
  .passthrough(); // يسمح بحقول إضافية لأسباب التوافق المستقبلي

const VersionSchema = z.object({
  id: z.string(),
  timestamp: z.number().int(),
  label: z.string().max(255),
  analysis: SceneBreakdownSchema.optional(),
  scenarios: z.record(z.unknown()).optional(),
  headerData: SceneHeaderDataSchema.optional(),
  stats: SceneStatsSchema.optional(),
  warnings: z.array(z.string()).optional(),
});

const BreakdownElementSchema = z.object({
  category: z.string(),
  items: z.array(z.string()),
});

const SceneSchema = z.object({
  id: z.number().int().nonnegative(),
  remoteId: z.string().optional(),
  projectId: z.string().optional(),
  reportId: z.string().optional(),
  header: z.string().min(1).max(1000),
  content: z.string().max(500_000),
  isAnalyzed: z.boolean(),
  source: z.enum(["ai", "fallback"]).optional(),
  headerData: SceneHeaderDataSchema.optional(),
  stats: SceneStatsSchema.optional(),
  analysis: SceneBreakdownSchema.optional(),
  scenarios: z.record(z.unknown()).optional(),
  elements: z.array(BreakdownElementSchema).optional(),
  warnings: z.array(z.string()).optional(),
  versions: z.array(VersionSchema).optional(),
});

const AttachmentSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  mimeType: z
    .string()
    .regex(
      /^(image\/.+|video\/mp4|application\/pdf)$/,
      "نوع الملف غير مدعوم — يُقبل: image/* | video/mp4 | application/pdf",
    ),
  sizeBytes: z.number().int().nonnegative().max(50 * 1024 * 1024),
  addedAt: z.string().datetime(),
  url: z.string().url().optional(),
  sceneId: z.number().int().optional(),
});

const BreakdownReportSchema = z
  .object({
    id: z.string(),
    projectId: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime().optional(),
    scenes: z.array(z.record(z.unknown())),
  })
  .passthrough();

// ============================================================
// المخطط الرئيسي لـ .copyproj
// ============================================================

export const CopyprojSchema = z.object({
  "schema-version": z
    .string()
    .regex(
      /^\d+\.\d+\.\d+$/,
      "schema-version يجب أن يتبع صيغة semver (مثال: 1.0.0)",
    ),
  id: z.string().uuid("id يجب أن يكون UUID v4"),
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  scriptText: z.string().max(5_000_000).optional(),
  projectId: z.string().optional(),
  reportId: z.string().optional(),
  metadata: z
    .object({
      director: z.string().max(255).optional(),
      producer: z.string().max(255).optional(),
      genre: z.string().max(100).optional(),
      language: z.string().max(50).optional(),
      productionCompany: z.string().max(255).optional(),
      tags: z.array(z.string().max(100)).max(50).optional(),
    })
    .optional(),
  scenes: z.array(SceneSchema),
  report: BreakdownReportSchema.optional(),
  attachments: z.array(AttachmentSchema).max(100).optional(),
  exportedAt: z.string().datetime().optional(),
  appVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional(),
});

export type CopyprojFile = z.infer<typeof CopyprojSchema>;

// ============================================================
// الحد الأعلى لإصدار المخطط المدعوم في هذه النسخة
// ============================================================
export const SUPPORTED_SCHEMA_VERSION = "1.0.0";

function compareVersions(a: string, b: string): number {
  const [aMaj, aMin] = a.split(".").map(Number);
  const [bMaj, bMin] = b.split(".").map(Number);
  if (aMaj !== bMaj) return (aMaj ?? 0) - (bMaj ?? 0);
  return (aMin ?? 0) - (bMin ?? 0);
}

// ============================================================
// API العامة
// ============================================================

export interface ValidateResult {
  success: true;
  data: CopyprojFile;
}

export interface ValidateError {
  success: false;
  error: string;
  issues?: { path: string; message: string }[];
}

/**
 * يتحقق من صلاحية كائن JSON كملف .copyproj صالح.
 * يتحقق أيضاً من أن schema-version مدعوم من هذا الإصدار من الكود.
 */
export function validateCopyproj(
  raw: unknown,
): ValidateResult | ValidateError {
  const result = CopyprojSchema.safeParse(raw);

  if (!result.success) {
    return {
      success: false,
      error: "ملف .copyproj غير صالح",
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  // تحقق من التوافق مع الإصدار المدعوم حالياً
  const fileVersion = result.data["schema-version"];
  if (compareVersions(fileVersion, SUPPORTED_SCHEMA_VERSION) > 0) {
    return {
      success: false,
      error: `الملف يستخدم schema-version ${fileVersion} وهو أحدث من الإصدار المدعوم (${SUPPORTED_SCHEMA_VERSION}). يرجى تحديث التطبيق.`,
    };
  }

  return { success: true, data: result.data };
}

/**
 * يُنشئ كائن .copyproj جديداً فارغاً جاهزاً للحفظ.
 */
export function createEmptyCopyproj(
  title: string,
  overrides?: Partial<CopyprojFile>,
): CopyprojFile {
  const now = new Date().toISOString();
  return {
    "schema-version": SUPPORTED_SCHEMA_VERSION,
    id: globalThis.crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    scenes: [],
    ...overrides,
  };
}

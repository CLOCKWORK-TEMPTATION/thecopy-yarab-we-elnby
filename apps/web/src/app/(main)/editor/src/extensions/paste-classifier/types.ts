/**
 * @module extensions/paste-classifier/types
 *
 * أنواع عامة لطبقة paste-classifier.
 * تنقل النوع نفسه دون تعديل عقد واجهات public.
 */

import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import type { SequenceOptimizationResult } from "../structural-sequence-optimizer";
import type { SuspicionCase } from "@editor/suspicion-engine/types";
import type { FinalReviewSuspiciousLinePayload } from "@editor/types/final-review";

/**
 * خيارات مصنّف اللصق التلقائي.
 */
export interface PasteClassifierOptions {
  /** دالة مراجعة محلية مخصصة (اختياري) */
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[];
}

/**
 * مدخلات schema element من المحرك المضمّن.
 */
export interface SchemaElementInput {
  readonly element: string;
  readonly value: string;
}

/**
 * سياق استدعاء classifyLines.
 */
export interface ClassifyLinesContext {
  classificationProfile?: string;
  sourceFileType?: string;
  sourceMethod?: string;
  structuredHints?: readonly unknown[];
  schemaElements?: readonly SchemaElementInput[];
}

/**
 * خيارات تطبيق تدفق التصنيف على العرض.
 */
export interface ApplyPasteClassifierFlowOptions {
  /** دالة مراجعة محلية مخصصة (اختياري) */
  agentReview?: (
    classified: readonly ClassifiedDraftWithId[]
  ) => ClassifiedDraftWithId[];
  /** موضع البدء في العرض (اختياري) */
  from?: number;
  /** موضع النهاية في العرض (اختياري) */
  to?: number;
  /** بروفايل مصدر التصنيف (paste | generic-open) */
  classificationProfile?: string;
  /** نوع الملف المصدر (اختياري) */
  sourceFileType?: string;
  /** طريقة الاستخراج (اختياري) */
  sourceMethod?: string;
  /** تلميحات بنيوية من المصدر (Filmlane، PDF، إلخ) */
  structuredHints?: readonly unknown[];
  /** عناصر schema من المحرك المضمّن (اختياري) */
  schemaElements?: readonly SchemaElementInput[];
  /** النص الخام الأصلي المعروض أولاً في الملفات قبل التطوير الصامت */
  rawExtractedText?: string;
  /** اسم الملف عند الاستيراد */
  fileName?: string | null;
  /** مصدر أول نسخة ظاهرة في فتح الملفات */
  firstVisibleSourceKind?: "user-paste" | "direct-extraction" | "ocr";
}

/**
 * حالة ميتا داخلية تُلصق على مصفوفة ClassifiedDraftWithId
 * لتمرير نتائج المراحل بين الخطوات دون إنشاء بنى مستقلة.
 */
export type ClassifiedDraftPipelineState = ClassifiedDraftWithId[] & {
  _sequenceOptimization?: SequenceOptimizationResult;
  _suspicionCases?: readonly SuspicionCase[];
  _finalReviewCandidates?: readonly FinalReviewSuspiciousLinePayload[];
};

/**
 * نوع نتيجة عرض داخل المحرر.
 */
export interface RenderClassifiedDraftsResult {
  readonly from: number;
  readonly to: number;
  readonly documentSignature: string;
  readonly nodesRendered: number;
}

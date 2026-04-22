/**
 * @module types/unified-reception
 * @description عقود الاستقبال الموحد وحالة السطح التقدمي للمحرر
 */

import type { ElementType } from "../extensions/classification-types";

export type ReceptionSourceType = "paste" | "doc" | "docx" | "pdf";

export type FirstVisibleSourceKind = "user-paste" | "direct-extraction" | "ocr";

export type ProgressiveRunStatus =
  | "started"
  | "initial-visible"
  | "karank-visible"
  | "local-complete"
  | "suspicion-complete"
  | "final-complete"
  | "settled"
  | "failed-after-visible"
  | "approved";

export type VisibleVersionStage =
  | "user-paste"
  | "extracted"
  | "karank"
  | "local-classified"
  | "suspicion-reviewed"
  | "final-reviewed"
  | "settled"
  | "approved";

export type ReviewEligibility = "reviewable" | "non-reviewable";
export type ApprovalState = "unapproved" | "approved";

export interface UnifiedReceptionElement {
  /** معرف متوافق مع الاستجابة القديمة */
  id: string;
  /** الهوية الثابتة للعنصر عبر النسخ */
  elementId: string;
  /** النص الأصلي قبل التطبيع */
  originalText: string;
  /** النص بعد التطبيع */
  normalizedText: string;
  /** تلميح أولي من المحرك أو من التصنيف المحلي */
  suggestedType?: ElementType;
  /** حالة دخول العنصر إلى طبقات المراجعة اللاحقة */
  reviewEligibility?: ReviewEligibility;
  /** سبب الاستبعاد عند عدم قابلية المراجعة */
  nonReviewableReason?: string | null;
  /** بيانات وصفية إضافية */
  metadata?: Record<string, string | number | boolean | null>;
}

export interface ExtractionMeta {
  sourceType: ReceptionSourceType;
  processingTimeMs: number;
  success: boolean;
  error?: string;
  progressiveStage?: "first-visible" | "karank-visible";
  firstVisibleSourceKind?: FirstVisibleSourceKind;
  warnings?: string[];
  attempts?: string[];
}

export interface UnifiedReceptionResponse {
  rawText: string;
  elements: UnifiedReceptionElement[];
  extractionMeta: ExtractionMeta;
}

export type VisibleTextValidity =
  | "valid"
  | "invalid-empty"
  | "invalid-degraded";

export interface KarankGuidanceElement {
  elementId: string;
  elementType: string;
  text: string;
  confidence?: number;
}

export interface KarankVisibleVersion {
  visibleVersionId: string;
  stage: "karank";
  text: string;
  processingTimeMs: number;
}

export interface KarankGuidancePayload {
  rawText: string;
  schemaText: string;
  visibleTextValidity: VisibleTextValidity;
  schemaElements: KarankGuidanceElement[];
}

export interface KarankTextExtractResponse {
  runId: string;
  visibleVersion: KarankVisibleVersion;
  guidance: KarankGuidancePayload;
}

export interface ProgressiveElement {
  elementId: string;
  runId: string;
  visibleVersionId: string;
  orderIndex: number;
  text: string;
  normalizedText: string;
  elementType: ElementType | string;
  expectedCurrentText: string;
  reviewEligibility: ReviewEligibility;
  nonReviewableReason?: string | null;
  approvalState: ApprovalState;
  approvedVersionId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface VisibleVersion {
  visibleVersionId: string;
  runId: string;
  stage: VisibleVersionStage;
  text: string;
  elements: ProgressiveElement[];
  elementCount: number;
  createdAt: string;
  replacesVersionId?: string | null;
  isVisible: boolean;
  isSettled: boolean;
  approvalEligible: boolean;
  approvalToken?: string | null;
}

export interface ProgressiveReviewRun {
  runId: string;
  intakeKind: "paste" | "file-open";
  sourceType: ReceptionSourceType;
  fileName?: string | null;
  startedAt: string;
  status: ProgressiveRunStatus;
  currentVisibleVersionId?: string | null;
  finalSettledVersionId?: string | null;
  surfaceLocked: boolean;
  latestFailureStage?: PipelineStage | null;
  latestFailureCode?: string | null;
  latestFailureMessage?: string | null;
  failureRecoveryRequired: boolean;
  firstVisibleSourceKind?: FirstVisibleSourceKind | null;
}

export interface FailureRecoveryAction {
  recoveryId: string;
  runId: string;
  visibleVersionId: string;
  actionKind: "dismiss-failure" | "retry-from-same-surface";
  resolvedAt: string;
}

export type PipelineStage =
  | "extraction"
  | "karank"
  | "local-classification"
  | "local_classification"
  | "suspicion-review"
  | "suspicion_engine"
  | "final-review"
  | "review_layer"
  | "approval-marking";

export type PipelineStageStatus =
  | "started"
  | "completed"
  | "failed"
  | "skipped";

export interface PipelineTelemetryEvent {
  importOpId: string;
  runId?: string;
  visibleVersionId?: string | null;
  stage: PipelineStage;
  status: PipelineStageStatus;
  sourceType: ReceptionSourceType;
  timestamp: number;
  durationMs?: number;
  firstVisibleSourceKind?: FirstVisibleSourceKind;
  errorDetails?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

import type {
  ProgressiveReviewRun,
  ProgressiveRunStatus,
  ReceptionSourceType,
  VisibleVersionStage,
} from "../../types/unified-reception";

// — يحوّل اسم مرحلة snapshot إلى حالة تشغيل نشطة (ProgressiveRunStatus)
export function mapSnapshotStageToRunStatus(
  stage: string
): ProgressiveRunStatus | null {
  switch (stage) {
    case "preview-literal":
      return "initial-visible";
    case "karank-visible":
      return "karank-visible";
    case "render-first":
      return "local-complete";
    case "suspicion-model":
      return "suspicion-complete";
    case "final-review":
      return "final-complete";
    case "settled":
      return "settled";
    default:
      return null;
  }
}

// — يحوّل اسم مرحلة snapshot ونوع المصدر إلى مرحلة نسخة ظاهرة (VisibleVersionStage)
export function mapSnapshotStageToVisibleStage(
  stage: string,
  sourceType: ReceptionSourceType
): VisibleVersionStage | null {
  switch (stage) {
    case "preview-literal":
      return sourceType === "paste" ? "user-paste" : "extracted";
    case "karank-visible":
      return "karank";
    case "render-first":
      return "local-classified";
    case "suspicion-model":
      return "suspicion-reviewed";
    case "final-review":
      return "final-reviewed";
    case "settled":
      return "settled";
    default:
      return null;
  }
}

// — يحدد نوع المصدر الأول الظاهر بناءً على نوع الاستقبال والبيانات الوصفية
export function resolveFirstVisibleSourceKind(
  sourceType: ReceptionSourceType,
  metadata?: Record<string, unknown>
): NonNullable<ProgressiveReviewRun["firstVisibleSourceKind"]> {
  if (metadata?.["firstVisibleSourceKind"] === "user-paste") {
    return "user-paste";
  }
  if (metadata?.["firstVisibleSourceKind"] === "ocr") {
    return "ocr";
  }
  if (sourceType === "paste") return "user-paste";
  if (
    sourceType === "pdf" &&
    metadata?.["firstVisibleSourceKind"] !== "direct-extraction"
  ) {
    return "ocr";
  }
  return "direct-extraction";
}

// — يستخرج رمز الموافقة من البيانات الوصفية إذا كان نصياً صالحاً
export function resolveApprovalToken(
  metadata?: Record<string, unknown>
): string | null {
  return typeof metadata?.["approvalToken"] === "string"
    ? metadata["approvalToken"]
    : null;
}

// — يُطبّع قيمة نوع مصدر الاستقبال إلى نوع معروف أو "paste" افتراضياً
export function normalizeReceptionSourceType(
  value?: string
): ReceptionSourceType {
  if (value === "doc" || value === "docx" || value === "pdf") {
    return value;
  }
  return "paste";
}

// — يُطبّع اسم مرحلة الفشل إلى مرحلة معروفة أو "final-review" افتراضياً
export function normalizeFailureStage(
  stage: string
): NonNullable<ProgressiveReviewRun["latestFailureStage"]> {
  if (
    stage === "extraction" ||
    stage === "karank" ||
    stage === "approval-marking" ||
    stage === "suspicion-review" ||
    stage === "final-review"
  ) {
    return stage;
  }
  if (stage === "local-classification") {
    return stage;
  }
  return "final-review";
}

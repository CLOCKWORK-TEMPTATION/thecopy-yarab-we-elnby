// ============================================================================
// طبقة تنسيق مخرجات AI الموحدة
// ============================================================================
// الغرض الأهم: منع empty response من المرور كنجاح.
// الموثَّق في تقرير development:
//   "نفّذت المهمة 'إكمال النص' لكن لم تُرجع أي محتوى"
// هذا الفشل يجب أن يتحول إلى ApiError model_empty لا أن يُعرض كنجاح.

import { ApiError } from "@the-copy/api-client";

/**
 * يفحص محتوى نص مرشّح ليكون نتيجة نموذج.
 * يرفع model_empty إذا كان فارغاً أو يحتوي placeholder شائعاً.
 */
const PLACEHOLDER_PATTERNS: ReadonlyArray<RegExp> = [
  /^\s*$/,
  /^(\s*null\s*|\s*undefined\s*)$/i,
  /^\s*"?\s*"?\s*$/,
  /^\s*\[\s*\]\s*$/,
  /^\s*\{\s*\}\s*$/,
  /لم\s*تُرجع\s*أي\s*محتوى/,
  /no\s+content/i,
  /empty\s+response/i,
];

/**
 * يفحص مخرج نصي ويرفع model_empty عند الفراغ.
 */
export function assertModelTextNotEmpty(text: unknown, contextLabel = "النموذج"): string {
  if (typeof text !== "string") {
    throw new ApiError({
      code: "model_empty",
      message: `${contextLabel} لم يرجع نصاً قابلاً للاستخدام.`,
    });
  }
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new ApiError({
      code: "model_empty",
      message: `${contextLabel} لم يرجع نصاً قابلاً للاستخدام.`,
    });
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) {
      throw new ApiError({
        code: "model_empty",
        message: `${contextLabel} لم يرجع نصاً قابلاً للاستخدام.`,
      });
    }
  }
  return trimmed;
}

/**
 * شكل مخرج أداة development عام.
 */
export interface ToolExecutionResult {
  toolId: string;
  title: string;
  content: string;
  sections?: ReadonlyArray<{ title: string; body: string }>;
  warnings?: ReadonlyArray<string>;
}

/**
 * يفحص نتيجة تنفيذ أداة development ويرفع model_empty
 * إذا لم يكن فيها محتوى قابل للاستخدام.
 */
export function assertToolResultNotEmpty(
  result: Partial<ToolExecutionResult> | null | undefined,
  contextLabel = "الأداة",
): ToolExecutionResult {
  if (result === null || result === undefined) {
    throw new ApiError({
      code: "model_empty",
      message: `${contextLabel} لم تُرجع نتيجة.`,
    });
  }

  const directContent = typeof result.content === "string" ? result.content.trim() : "";
  const sectionsHaveBody =
    Array.isArray(result.sections) &&
    result.sections.some(
      (s) => typeof s.body === "string" && s.body.trim().length > 0,
    );

  if (directContent.length === 0 && !sectionsHaveBody) {
    throw new ApiError({
      code: "model_empty",
      message: `${contextLabel} لم تُرجع محتوى قابلاً للاستخدام.`,
    });
  }

  return {
    toolId: result.toolId ?? "",
    title: result.title ?? "",
    content: directContent,
    sections: result.sections ?? [],
    warnings: result.warnings ?? [],
  };
}

/**
 * تنسيق مخرج تحليل ممثل (نص + إيقاع).
 */
export interface ActorAnalysisOutput {
  characterNotes: string[];
  beats: string[];
  objectives: string[];
  subtext: string[];
  performanceGuidance: string[];
  warnings: string[];
}

/**
 * يفحص مخرج تحليل الممثل ضد الفراغ.
 */
export function assertActorAnalysisNotEmpty(
  output: Partial<ActorAnalysisOutput> | null | undefined,
): ActorAnalysisOutput {
  if (output === null || output === undefined) {
    throw new ApiError({
      code: "model_empty",
      message: "لم يرجع التحليل أي نتيجة.",
    });
  }
  const safe: ActorAnalysisOutput = {
    characterNotes: output.characterNotes ?? [],
    beats: output.beats ?? [],
    objectives: output.objectives ?? [],
    subtext: output.subtext ?? [],
    performanceGuidance: output.performanceGuidance ?? [],
    warnings: output.warnings ?? [],
  };
  const totalEntries =
    safe.characterNotes.length +
    safe.beats.length +
    safe.objectives.length +
    safe.subtext.length +
    safe.performanceGuidance.length;
  if (totalEntries === 0) {
    throw new ApiError({
      code: "model_empty",
      message: "لم يرجع التحليل أي محتوى قابل للاستخدام.",
    });
  }
  return safe;
}

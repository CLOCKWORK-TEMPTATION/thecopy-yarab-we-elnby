/**
 * @module extensions/paste-classifier/errors
 *
 * أخطاء مراحل pipeline التصنيف.
 */

/**
 * خطأ مرحلة من مراحل التصنيف التدريجي يحمل معه اسم المرحلة وكود اختياري.
 */
export class ProgressivePipelineStageError extends Error {
  readonly stage: "suspicion-review" | "final-review";
  readonly code: string | null;

  constructor(
    stage: "suspicion-review" | "final-review",
    message: string,
    code?: string | null
  ) {
    super(message);
    this.name = "ProgressivePipelineStageError";
    this.stage = stage;
    this.code = code ?? null;
  }
}

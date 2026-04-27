// ─────────────────────────────────────────────────────────
// final-review/errors.mjs — أخطاء التحقق
// ─────────────────────────────────────────────────────────

export class FinalReviewValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "FinalReviewValidationError";
    this.statusCode = 400;
  }
}

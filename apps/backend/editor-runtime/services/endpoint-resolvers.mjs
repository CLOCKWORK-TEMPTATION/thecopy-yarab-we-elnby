/**
 * @description محلّلات نقاط النهاية للمراجعة
 */

/**
 * @description حل نقطة نهاية مراجعة الشك
 */
export function resolveSuspicionReviewEndpoint(env = process.env) {
  const suspicionEnabled = env.SUSPICION_MODEL_ENABLED !== "false";
  const hasGeminiKey =
    env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;

  return suspicionEnabled && hasGeminiKey ? "gemini-2.5-flash" : null;
}

/**
 * @description حل نقطة نهاية المراجعة النهائية
 */
export function resolveFinalReviewEndpoint(env = process.env) {
  const finalReviewEnabled = env.FINAL_REVIEW_ENABLED !== "false";
  const hasClaudeKey =
    env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY.trim().length > 0;
  const hasGeminiKey =
    env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0;

  if (!finalReviewEnabled || (!hasClaudeKey && !hasGeminiKey)) {
    return null;
  }

  if (hasClaudeKey) {
    return "claude-sonnet-4";
  }

  return "gemini-2.5-flash";
}

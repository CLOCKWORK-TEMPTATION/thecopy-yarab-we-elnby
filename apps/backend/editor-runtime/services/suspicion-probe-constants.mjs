/**
 * @description ثوابت المسبار لمراجعة الشك
 */

import {
  REFERENCE_SUSPICION_FIXTURE,
  FIXTURE_METADATA,
} from "../fixtures/reference-suspicion-fixture.mjs";

export const SUSPICION_SCORE_THRESHOLD = 40;
export const FINAL_REVIEW_SCORE_THRESHOLD = 60;
export const PROBE_VERSION = "2.0.0";

// مسجل بسيط بدون pino
export const createSimpleLogger = () => ({
  info: (msg, meta) => console.log(`[PROBE:INFO] ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn: (msg, meta) => console.warn(`[PROBE:WARN] ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg, meta) => console.error(`[PROBE:ERROR] ${msg}`, meta ? JSON.stringify(meta) : ""),
});

export const logger = createSimpleLogger();

// حالات الشك المتوقعة (للتوافق العكسي)
export const EXPECTED_SUSPICION_CASES = {
  minimum: FIXTURE_METADATA.statistics.expectedMinimumSuspicionCases || 2,
  detailed: FIXTURE_METADATA.intendedSuspicionCases || [],
};

/**
 * @description مرشحي المراجعة النهائية المتوقعون
 */
export const EXPECTED_FINAL_REVIEW_CANDIDATES = {
  minimum: FIXTURE_METADATA.statistics.expectedMinimumFinalReviewCandidates || 1,
  detailed: FIXTURE_METADATA.expectedFinalReviewCandidates || [],
};

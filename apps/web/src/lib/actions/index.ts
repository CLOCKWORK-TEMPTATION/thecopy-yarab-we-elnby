"use server";

/**
 * Centralized Server Actions
 *
 * All server actions are organized by domain/feature:
 * - analysis: Text and drama analysis pipelines
 * - projects: (future) Project management actions
 * - users: (future) User-related actions
 */

// Export analysis actions
export { runFullPipeline, type PipelineResult } from "./analysis";

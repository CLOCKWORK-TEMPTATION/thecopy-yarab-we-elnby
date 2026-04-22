// @the-copy/prompt-engineering
// Main entry point — re-export the library-only public APIs.

// ─── Types ───────────────────────────────────────────────────────────
export type {
  PromptMetrics,
  PromptAnalysis,
  PromptCategory,
  PromptEnhancementOptions,
  EnhancedPrompt,
  PromptTemplate,
  TemplateVariable,
  PromptTestResult,
  TestCase,
  PromptComparison,
  PromptSession,
  PromptHistoryEntry,
} from './types';

// ─── Lib / Services ──────────────────────────────────────────────────

// prompt-analyzer
export {
  analyzePrompt,
  comparePrompts,
  generateEnhancementSuggestions,
} from './lib/prompt-analyzer';

// prompt-data (templates & helpers)
export {
  defaultPromptTemplates,
  getTemplateById,
  getTemplatesByCategory,
  getTemplatesByLanguage,
  renderTemplate,
  validateTemplateVariables,
  extractTemplateVariables,
} from './lib/prompt-data';

// gemini-service (client-side wrapper)
export type { PromptStudioGeminiConfig } from './lib/gemini-service';
export {
  createPromptStudioGeminiService,
  generatePromptAnalysis,
  estimateTokenCount,
  estimatePromptCost,
  validatePrompt,
} from './lib/gemini-service';


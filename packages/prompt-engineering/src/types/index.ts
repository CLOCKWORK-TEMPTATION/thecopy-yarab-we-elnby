// types/index.ts
// Type definitions for Arabic Prompt Engineering Studio

/**
 * Prompt quality metrics
 */
export interface PromptMetrics {
  clarity: number; // 0-100
  specificity: number; // 0-100
  completeness: number; // 0-100
  effectiveness: number; // 0-100
  tokenEfficiency: number; // 0-100
  overallScore: number; // 0-100
}

/**
 * Prompt analysis result
 */
export interface PromptAnalysis {
  prompt: string;
  metrics: PromptMetrics;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  estimatedTokens: number;
  complexity: "low" | "medium" | "high";
  category: PromptCategory;
  language: "ar" | "en" | "mixed";
}

/**
 * Prompt categories
 */
export type PromptCategory =
  | "creative_writing"
  | "analysis"
  | "translation"
  | "summarization"
  | "question_answering"
  | "code_generation"
  | "data_extraction"
  | "conversation"
  | "other";

/**
 * Prompt enhancement options
 */
export interface PromptEnhancementOptions {
  targetLanguage?: "ar" | "en";
  addContext?: boolean;
  addExamples?: boolean;
  improveClarity?: boolean;
  optimizeTokens?: boolean;
  targetAudience?: "beginner" | "intermediate" | "expert";
  desiredLength?: "short" | "medium" | "long";
}

/**
 * Enhanced prompt result
 */
export interface EnhancedPrompt {
  original: string;
  enhanced: string;
  improvements: string[];
  beforeMetrics: PromptMetrics;
  afterMetrics: PromptMetrics;
  tokenSavings?: number;
  estimatedCost?: number;
}

/**
 * Prompt template
 */
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: PromptCategory;
  template: string;
  variables: TemplateVariable[];
  examples: string[];
  tags: string[];
  language: "ar" | "en";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Template variable
 */
export interface TemplateVariable {
  name: string;
  description: string;
  required: boolean;
  defaultValue?: string;
  type: "string" | "number" | "boolean" | "array";
}

/**
 * Prompt test result
 */
export interface PromptTestResult {
  prompt: string;
  testCases: TestCase[];
  averageScore: number;
  successRate: number;
  commonIssues: string[];
}

/**
 * Test case
 */
export interface TestCase {
  input: string;
  expectedOutput?: string;
  actualOutput?: string;
  score: number;
  passed: boolean;
  feedback: string;
}

/**
 * Prompt comparison
 */
export interface PromptComparison {
  prompts: Array<{
    prompt: string;
    metrics: PromptMetrics;
    label?: string;
  }>;
  winner?: number; // Index of the best prompt
  differences: string[];
}

/**
 * Prompt engineering session
 */
export interface PromptSession {
  id: string;
  title: string;
  originalPrompt: string;
  currentPrompt: string;
  history: PromptHistoryEntry[];
  analysis?: PromptAnalysis;
  enhancedVersion?: EnhancedPrompt;
  testResults?: PromptTestResult;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Prompt history entry
 */
export interface PromptHistoryEntry {
  id: string;
  prompt: string;
  action: "created" | "edited" | "enhanced" | "analyzed" | "tested";
  timestamp: Date;
  metrics?: PromptMetrics;
  notes?: string;
}

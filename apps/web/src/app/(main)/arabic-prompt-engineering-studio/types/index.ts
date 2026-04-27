import type { PromptAnalysis, PromptTemplate } from "@the-copy/prompt-engineering";

export interface PromptHistoryEntry {
  prompt: string;
  timestamp: Date;
  score: number;
}

export interface PersistedPromptHistoryEntry {
  prompt: string;
  timestamp: string;
  score: number;
}

export interface PromptEngineeringSnapshot {
  prompt: string;
  analysis: PromptAnalysis | null;
  activeTab: string;
  selectedTemplate: PromptTemplate | null;
  templateVariables: Record<string, string>;
  promptHistory: PersistedPromptHistoryEntry[];
  comparePrompt1: string;
  comparePrompt2: string;
  comparisonResult: any | null;
  suggestions: string[];
}

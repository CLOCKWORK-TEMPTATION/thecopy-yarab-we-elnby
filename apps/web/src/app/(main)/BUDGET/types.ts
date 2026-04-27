export interface BudgetLineItem {
  code: string;
  description: string;
  amount: number;
  unit: string;
  rate: number;
  total: number;
  notes?: string;
}

export interface BudgetCategory {
  code: string;
  name: string;
  items: BudgetLineItem[];
  total: number;
}

export interface BudgetSection {
  id: string;
  name: string;
  categories: BudgetCategory[];
  total: number;
}

export interface BudgetDocument {
  sections: BudgetSection[];
  grandTotal: number;
  currency: string;
  metadata?: {
    title?: string;
    director?: string;
    producer?: string;
    productionCompany?: string;
    shootingDays?: number;
    locations?: string[];
    genre?: string;
  };
}

export interface BudgetAnalysis {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
  costOptimization: string[];
  shootingSchedule: {
    totalDays: number;
    phases: {
      preProduction: number;
      production: number;
      postProduction: number;
    };
  };
}

export interface BudgetEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BudgetRuntimeMeta {
  source: "ai" | "fallback";
  generatedAt: string;
  fallbackReason?: string;
}

export interface BudgetRuntimePayload {
  budget: BudgetDocument;
  analysis: BudgetAnalysis;
  meta?: BudgetRuntimeMeta;
}

export interface BudgetAnalysisRuntimePayload {
  analysis: BudgetAnalysis;
  meta?: BudgetRuntimeMeta;
}

export interface BudgetPersistedState {
  title: string;
  scenario: string;
  budget: BudgetDocument | null;
  analysis: BudgetAnalysis | null;
  meta: BudgetRuntimeMeta | null;
  persistedAt: string | null;
}

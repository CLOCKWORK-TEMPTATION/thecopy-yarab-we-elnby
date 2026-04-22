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
  color?: string;
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

export type BudgetRuntimeSource = 'ai' | 'fallback';

export interface BudgetRuntimeMeta {
  source: BudgetRuntimeSource;
  generatedAt: string;
  fallbackReason?: string;
}

export interface BudgetRuntimeResult {
  budget: BudgetDocument;
  analysis: BudgetAnalysis;
  meta: BudgetRuntimeMeta;
}

export interface BudgetAnalysisRuntimeResult {
  analysis: BudgetAnalysis;
  meta: BudgetRuntimeMeta;
}

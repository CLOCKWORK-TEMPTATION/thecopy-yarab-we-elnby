// Station Types and Interfaces
export interface StationInput {
  text: string;
  previousResults?: any;
  options?: Record<string, unknown>;
}

export interface StationOutput {
  summary: string;
  confidence: number;
  uncertainties?: Array<{
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
    reducible: boolean;
  }>;
  alternates?: Array<{
    hypothesis: string;
    confidence: number;
  }>;
  meta?: Record<string, unknown>;
}

export interface Station6Input extends StationInput {
  conflictNetwork: any;
  previousStations: any[];
}

export interface Station6Output extends StationOutput {
  diagnostics: any[];
  recommendations: any[];
  treatmentPlan: any;
}

export interface UncertaintyQuantificationEngine {
  quantify(data: any): {
    epistemic: number;
    aleatoric: number;
    total: number;
  };
}

export interface DiagnosticIssue {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location?: string;
  suggestions: string[];
}

export interface Recommendation {
  id: string;
  priority: "low" | "medium" | "high" | "immediate";
  category:
    | "character"
    | "dialogue"
    | "theme"
    | "plot"
    | "structure"
    | "pacing";
  title: string;
  description: string;
  rationale: string;
  impact: number;
  effort: number;
  timeline: string;
  dependencies: string[];
  expectedOutcome: string;
}

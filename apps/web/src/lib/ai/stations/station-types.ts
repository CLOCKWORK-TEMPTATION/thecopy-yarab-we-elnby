// Station Types and Interfaces
export interface StationInput {
  text: string;
  previousResults?: Record<string, unknown>;
  options?: Record<string, unknown>;
}

export interface StationOutput {
  summary: string;
  confidence: number;
  uncertainties?: {
    type: "epistemic" | "aleatoric";
    aspect: string;
    note: string;
    reducible: boolean;
  }[];
  alternates?: {
    hypothesis: string;
    confidence: number;
  }[];
  meta?: Record<string, unknown>;
}

export interface Station6Input extends StationInput {
  conflictNetwork: Record<string, unknown>;
  previousStations: Record<string, unknown>[];
}

export interface Station6Output extends StationOutput {
  diagnostics: Record<string, unknown>[];
  recommendations: Record<string, unknown>[];
  treatmentPlan: Record<string, unknown>;
}

export interface UncertaintyQuantificationEngine {
  quantify(data: unknown): {
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

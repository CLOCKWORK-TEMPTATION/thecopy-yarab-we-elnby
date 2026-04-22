// أنواع البيانات المشتركة لنظام المحطات السبع
export type StationInput = {
  text: string;
  prev?: unknown;
};

export type StationOutput = {
  summary: string;
  confidence: number;
  uncertainties?: {
    type: "epistemic" | "aleatoric";
    note: string;
  }[];
  alternates?: {
    hypothesis: string;
    confidence: number;
  }[];
  meta?: Record<string, unknown>;
};

export interface Station {
  id: `S${1 | 2 | 3 | 4 | 5 | 6 | 7}`;
  run(input: StationInput): Promise<StationOutput>;
}

export type OrchestrationResult = {
  stations: Record<string, StationOutput>;
  finalReport: string;
  totalConfidence: number;
  executionTime: number;
};

// Pipeline types
export interface PipelineInputSchema {
  text: string;
  options?: Record<string, unknown>;
}

export interface PipelineInput {
  text: string;
  options?: Record<string, unknown>;
}

export interface PipelineRunResult {
  success: boolean;
  data?: OrchestrationResult;
  error?: string;
}

export interface EnhancedPipelineRunResult extends PipelineRunResult {
  stationOutputs?: Record<string, StationOutput>;
  metadata?: Record<string, unknown>;
}

export enum StationStatus {
  PENDING = "pending",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

// Validation function
export function validateAndNormalizePipelineInput(
  input: unknown
): PipelineInput {
  if (typeof input === "string") {
    return { text: input };
  }

  if (typeof input === "object" && input !== null && "text" in input) {
    return input as PipelineInput;
  }

  throw new Error("Invalid pipeline input");
}

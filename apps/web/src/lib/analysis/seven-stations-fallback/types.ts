export type StationKey =
  | "station1"
  | "station2"
  | "station3"
  | "station4"
  | "station5"
  | "station6"
  | "station7";

export interface AnalysisPipelinePayload {
  success: boolean;
  mode: "ai" | "fallback";
  warnings: string[];
  stationOutputs: Record<StationKey, Record<string, unknown>>;
  metadata: Record<string, unknown>;
}

export interface FallbackInput {
  fullText: string;
  projectName: string;
  warning?: string;
}

export interface TextChunk {
  id: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

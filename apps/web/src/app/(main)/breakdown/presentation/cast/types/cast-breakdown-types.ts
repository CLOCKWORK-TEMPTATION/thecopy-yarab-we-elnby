import type { CastMember, ExtendedCastMember, CastAnalysisResult } from "../../domain/models";

export type { CastMember, ExtendedCastMember, CastAnalysisResult };

export type SortField = "name" | "role" | "age" | "gender" | "dialogueCount";
export type FilterRole =
  | "all"
  | "Lead"
  | "Supporting"
  | "Bit Part"
  | "Silent"
  | "Group"
  | "Mystery";
export type FilterGender = "all" | "Male" | "Female" | "Non-binary" | "Unknown";

export interface GenderAnalysis {
  gender: "Male" | "Female" | "Non-binary" | "Unknown";
  confidence: number;
  conflict: boolean;
  clues: string[];
}

export interface ArcAnalysis {
  type: "rising" | "falling" | "flat" | "arc" | "unknown";
  description: string;
  confidence: number;
}

export interface EmotionAnalysis {
  emotion: "positive" | "negative" | "intense" | "mysterious" | "neutral";
  intensity: number;
  keywords: string[];
}

export interface CastCardData extends ExtendedCastMember {
  dialogueCount?: number;
  firstScene?: number;
  lastScene?: number;
  totalScenes?: number;
  sceneAppearances?: number[];
  genderAnalysis?: GenderAnalysis;
  arcAnalysis?: ArcAnalysis;
  emotionAnalysis?: EmotionAnalysis;
}

export interface CastBreakdownViewProps {
  cast?: CastMember[] | ExtendedCastMember[];
  isProcessing?: boolean;
  sceneContent?: string;
  onAnalyze?: (content: string) => Promise<CastAnalysisResult>;
}

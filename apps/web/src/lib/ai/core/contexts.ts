// Context types for drama analysis system

import type {
  CharacterContext as CharacterContextType,
  NarrativeContext as NarrativeContextType,
  AnalysisContext as AnalysisContextType,
} from "../interfaces/response-types";

// Re-export for backward compatibility
export type CharacterContext = CharacterContextType;
export type NarrativeContext = NarrativeContextType;
export type AnalysisContext = AnalysisContextType;

/**
 * Text-Only Station Interfaces
 *
 * This file defines strict text-only input/output contracts for the Seven Stations pipeline.
 * NO JSON parsing/stringifying should occur in UI or report components.
 * All data exchange happens through plain text with structured sections.
 */

/**
 * Shared context passed to all stations
 */
export interface StationContext {
  /** The full dramatic text being analyzed */
  fullText: string;
  /** User preferences or metadata (plain text key-value format) */
  metadata?: string;
  /** Optional user instructions in plain text */
  userInstructions?: string;
}

/**
 * Generic station input - always text-based
 */
export interface StationInput {
  /** The station context */
  context: StationContext;
  /** Output from previous station(s) as plain text */
  previousOutput?: string;
}

/**
 * Generic station output - always plain text with sections
 */
export interface StationOutput {
  /** Station identifier */
  stationId: string;
  /** Station name in Arabic */
  stationName: string;
  /** Plain text output organized in sections */
  textOutput: string;
  /** Optional metadata about processing (plain text) */
  processingNotes?: string;
  /** Success status */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Station 1: Character and Style Analysis
 * Input: Full text
 * Output: Plain text listing characters and style analysis
 */
export interface Station1Input extends StationInput {
  // Uses base context
}

export interface Station1Output extends StationOutput {
  stationId: "station-1";
  stationName: "تحليل الشخصيات والأسلوب";
}

/**
 * Station 2: Story Statement and Genre
 * Input: Full text + Station 1 output
 * Output: Plain text with story statement and genre analysis
 */
export interface Station2Input extends StationInput {
  previousOutput: string; // Station 1 output
}

export interface Station2Output extends StationOutput {
  stationId: "station-2";
  stationName: "بيان القصة والنوع الأدبي";
}

/**
 * Station 3: Conflict Network
 * Input: Full text + Station 1 & 2 outputs
 * Output: Plain text describing conflict networks
 */
export interface Station3Input extends StationInput {
  previousOutput: string; // Combined Station 1 & 2 outputs
}

export interface Station3Output extends StationOutput {
  stationId: "station-3";
  stationName: "شبكة الصراع";
}

/**
 * Station 4: Efficiency Assessment
 * Input: Station 3 output
 * Output: Plain text efficiency metrics and recommendations
 */
export interface Station4Input extends StationInput {
  previousOutput: string; // Station 3 output
}

export interface Station4Output extends StationOutput {
  stationId: "station-4";
  stationName: "تقييم الكفاءة";
}

/**
 * Station 5: Dynamic Analysis
 * Input: Full text + Station 4 output
 * Output: Plain text dynamic analysis results
 */
export interface Station5Input extends StationInput {
  previousOutput: string; // Station 4 output
}

export interface Station5Output extends StationOutput {
  stationId: "station-5";
  stationName: "التحليل الديناميكي";
}

/**
 * Station 6: Diagnostics
 * Input: Station 5 output
 * Output: Plain text diagnostics report
 */
export interface Station6Input extends StationInput {
  previousOutput: string; // Station 5 output
}

export interface Station6Output extends StationOutput {
  stationId: "station-6";
  stationName: "التشخيص";
}

/**
 * Station 7: Final Report
 * Input: All previous outputs
 * Output: Plain text final comprehensive report
 */
export interface Station7Input extends StationInput {
  previousOutput: string; // All previous stations combined
}

export interface Station7Output extends StationOutput {
  stationId: "station-7";
  stationName: "التقرير النهائي";
}

/**
 * Orchestrator result - aggregates all station outputs
 */
export interface OrchestratorResult {
  /** Overall success status */
  success: boolean;
  /** Combined text output from all stations */
  fullReport: string;
  /** Individual station outputs in order */
  stationOutputs: StationOutput[];
  /** Total processing time in milliseconds */
  processingTime: number;
  /** Any warnings or notes */
  notes?: string;
}

/**
 * Station processor interface - each station must implement this
 */
export interface StationProcessor {
  /** Process the station with text input, return text output */
  process(input: StationInput): Promise<StationOutput>;
  /** Station metadata */
  getMetadata(): {
    id: string;
    name: string;
    description: string;
  };
}

/**
 * Text section marker constants for parsing structured text
 */
export const TEXT_SECTIONS = {
  HEADER: "===",
  SUBSECTION: "---",
  LIST_ITEM: "•",
  NUMBERED_ITEM: /^\d+\./,
  KEY_VALUE: ":",
} as const;

/**
 * Helper type for text-only data exchange
 */
export type TextOnlyData = string;

/**
 * NO JSON ZONE
 * =============
 * Any code importing from this file should NEVER use:
 * - JSON.parse()
 * - JSON.stringify()
 * - JSON object methods
 *
 * Use text-protocol helpers from lib/utils/text-protocol.ts instead
 */

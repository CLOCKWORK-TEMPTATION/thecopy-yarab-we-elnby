import type { LineType } from "./screenplay";
import type { ImportSource } from "@editor/suspicion-engine/types";

export const SUSPICION_REVIEW_API_VERSION = "1.0" as const;

export type SuspicionReviewRoutingBand =
  | "local-review"
  | "agent-candidate"
  | "agent-forced";

export interface SuspicionReviewContextLine {
  readonly lineIndex: number;
  readonly text: string;
  readonly assignedType: LineType;
  readonly confidence: number;
  readonly offset: number;
}

export interface SuspicionReviewSourceHints {
  readonly importSource: ImportSource;
  readonly sourceMethod?: string;
  readonly engineSuggestedType?: LineType | null;
}

export interface SuspicionReviewLinePayload {
  readonly itemId: string;
  readonly lineIndex: number;
  readonly text: string;
  readonly assignedType: LineType;
  readonly originalConfidence: number;
  readonly suspicionScore: number;
  readonly routingBand: SuspicionReviewRoutingBand;
  readonly critical: boolean;
  readonly primarySuggestedType: LineType | null;
  readonly reasonCodes: readonly string[];
  readonly signalMessages: readonly string[];
  readonly contextLines: readonly SuspicionReviewContextLine[];
  readonly sourceHints: SuspicionReviewSourceHints;
}

export interface SuspicionReviewRequestPayload {
  readonly apiVersion: typeof SUSPICION_REVIEW_API_VERSION;
  readonly importOpId: string;
  readonly sessionId: string;
  readonly totalReviewed: number;
  readonly reviewLines: readonly SuspicionReviewLinePayload[];
}

export interface SuspicionReviewReviewedLine {
  readonly itemId: string;
  readonly verdict: "confirm" | "dismiss" | "escalate";
  readonly adjustedScore: number;
  readonly routingBand: SuspicionReviewRoutingBand;
  readonly confidence: number;
  readonly reason: string;
  readonly primarySuggestedType?: LineType | null;
}

export interface SuspicionReviewDiscoveredLine {
  readonly lineIndex: number;
  readonly text: string;
  readonly assignedType: LineType;
  readonly suspicionScore: number;
  readonly routingBand: "agent-candidate" | "agent-forced";
  readonly confidence: number;
  readonly reason: string;
  readonly primarySuggestedType?: LineType | null;
}

export interface SuspicionReviewResponsePayload {
  readonly apiVersion: typeof SUSPICION_REVIEW_API_VERSION;
  readonly importOpId: string;
  readonly requestId: string;
  readonly status: "applied" | "partial" | "skipped" | "error";
  readonly reviewedLines: readonly SuspicionReviewReviewedLine[];
  readonly discoveredLines: readonly SuspicionReviewDiscoveredLine[];
  readonly message: string;
  readonly latencyMs: number;
  readonly model?: string;
}

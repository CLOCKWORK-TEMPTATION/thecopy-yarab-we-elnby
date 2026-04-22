/**
 * @module types/agent-review
 * @description عقد `POST /api/agent/review`
 */

import type { LineType } from "./screenplay";

export const AGENT_API_VERSION = "2.0" as const;
export const AGENT_API_MODE = "auto-apply" as const;

export type CommandOp = "relabel" | "split";
export type AgentResponseStatus = "applied" | "partial" | "skipped" | "error";

export type AgentCompatibleLineType =
  | LineType
  | "scene-header-top-line"
  | "scene-header-1"
  | "scene-header-2"
  | "scene-header-3";

export interface RelabelCommand {
  readonly op: "relabel";
  readonly itemId: string;
  readonly newType: AgentCompatibleLineType;
  readonly confidence: number;
  readonly reason: string;
}

export interface SplitCommand {
  readonly op: "split";
  readonly itemId: string;
  readonly splitAt: number;
  readonly leftType: AgentCompatibleLineType;
  readonly rightType: AgentCompatibleLineType;
  readonly confidence: number;
  readonly reason: string;
}

export type AgentCommand = RelabelCommand | SplitCommand;

export interface AgentReviewContextLine {
  readonly lineIndex?: number;
  readonly assignedType?: AgentCompatibleLineType;
  readonly text?: string;
}

export interface AgentReviewSuspiciousLinePayload {
  readonly itemId: string;
  readonly itemIndex?: number;
  readonly lineIndex?: number;
  readonly text: string;
  readonly assignedType: AgentCompatibleLineType;
  readonly totalSuspicion: number;
  readonly reasons?: readonly string[];
  readonly contextLines?: readonly AgentReviewContextLine[];
  readonly escalationScore?: number;
  readonly routingBand?: "agent-candidate" | "agent-forced";
  readonly criticalMismatch?: boolean;
  readonly distinctDetectors?: number;
  readonly fingerprint?: string;
}

export interface AgentReviewRequestPayload {
  readonly sessionId: string;
  readonly importOpId: string;
  readonly totalReviewed: number;
  readonly suspiciousLines: readonly AgentReviewSuspiciousLinePayload[];
  readonly requiredItemIds: readonly string[];
  readonly forcedItemIds: readonly string[];
  readonly reviewPacketText?: string;
}

export interface AgentReviewResponseMeta {
  readonly requestedCount: number;
  readonly commandCount: number;
  readonly missingItemIds: readonly string[];
  readonly forcedItemIds: readonly string[];
  readonly unresolvedForcedItemIds: readonly string[];
  readonly retryCount?: number;
  readonly isMockResponse?: boolean;
}

export interface AgentReviewResponsePayload {
  readonly apiVersion: typeof AGENT_API_VERSION;
  readonly mode: typeof AGENT_API_MODE;
  readonly importOpId: string;
  readonly requestId: string;
  readonly status: AgentResponseStatus;
  readonly commands: readonly AgentCommand[];
  readonly message: string;
  readonly latencyMs: number;
  readonly meta?: AgentReviewResponseMeta;
  readonly model?: string;
}

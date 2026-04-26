/**
 * @module types
 * @description أنواع البيانات لتطبيق العصف الذهني الذكي
 */

import type { UncertaintyMetrics } from "@/lib/ai/constitutional";

export type BrainstormPhase = 1 | 2 | 3 | 4 | 5;

export type AgentCategory =
  | "core"
  | "analysis"
  | "creative"
  | "predictive"
  | "advanced";

export type AgentIcon =
  | "brain"
  | "users"
  | "message-square"
  | "book-open"
  | "target"
  | "shield"
  | "zap"
  | "cpu"
  | "layers"
  | "rocket"
  | "file-text"
  | "sparkles"
  | "trophy"
  | "globe"
  | "film"
  | "chart-bar"
  | "lightbulb"
  | "compass"
  | "fingerprint"
  | "pen-tool"
  | "music"
  | "search";

export interface BrainstormAgentCapabilities {
  canAnalyze: boolean;
  canGenerate: boolean;
  canPredict: boolean;
  hasMemory: boolean;
  usesSelfReflection: boolean;
  supportsRAG: boolean;
}

export interface BrainstormAgentDefinition {
  id: string;
  name: string;
  nameAr: string;
  role: string;
  description: string;
  category: AgentCategory;
  icon: AgentIcon;
  capabilities: BrainstormAgentCapabilities;
  collaboratesWith: string[];
  enhances: string[];
  complexityScore: number;
  phaseRelevance: BrainstormPhase[];
}

export interface BrainstormPhaseDefinition {
  id: BrainstormPhase;
  name: string;
  nameEn: string;
  description: string;
  primaryAction: "analyze" | "generate" | "debate" | "decide";
}

export interface BrainstormAgentStats {
  total: number;
  byCategory: Record<AgentCategory, number>;
  withRAG: number;
  withSelfReflection: number;
  withMemory: number;
  averageComplexity: number;
}

export interface BrainstormCatalog {
  agents: BrainstormAgentDefinition[];
  phases: BrainstormPhaseDefinition[];
  stats: BrainstormAgentStats;
}

// ============================================================================
// أنواع التطبيق
// ============================================================================

/** حالات الوكيل الممكنة أثناء جلسة العصف الذهني */
export type AgentStatus = "idle" | "working" | "completed" | "error";

/** حالة وكيل فردي أثناء جلسة العصف الذهني */
export interface AgentState {
  id: string;
  status: AgentStatus;
  lastMessage?: string;
  progress?: number;
}

/** بيانات جلسة العصف الذهني */
export interface Session {
  id: string;
  brief: string;
  phase: BrainstormPhase;
  status: "active" | "completed" | "paused" | "error";
  startTime: Date;
  activeAgents: string[];
  results?: Record<string, unknown>;
}

/** رسالة في نقاش العصف الذهني بين الوكلاء */
export interface DebateMessage {
  agentId: string;
  agentName: string;
  message: string;
  timestamp: Date;
  type: "proposal" | "critique" | "agreement" | "decision";
  uncertainty?: UncertaintyMetrics;
}

/** معلومات المرحلة للعرض */
export interface PhaseDisplayInfo {
  id: BrainstormPhase;
  name: string;
  nameEn: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  agentCount: number;
}

/** نتيجة النقاش من الخادم */
export interface DebateResult {
  proposals: {
    agentId: string;
    proposal: string;
    confidence: number;
  }[];
  consensus?: boolean;
  finalDecision?: string;
  judgeReasoning?: string;
}

/** استجابة API العصف الذهني */
export interface BrainstormApiResponse {
  success: boolean;
  result: DebateResult;
}

/** طلب API العصف الذهني */
export interface BrainstormApiRequest {
  task: string;
  context: {
    brief: string;
    phase: BrainstormPhase;
    sessionId: string;
  };
  agentIds: string[];
}

export type { UncertaintyMetrics };

/**
 * Types and Interfaces for Multi-Agent Debate System
 * المرحلة 3 - Multi-Agent Debate System
 */

import { BaseAgent } from '../shared/BaseAgent';
import { StandardAgentOutput } from '../shared/standardAgentPattern';

/**
 * Debate Role - دور الوكيل في النقاش
 */
export enum DebateRole {
  PROPOSER = 'proposer',     // مقدم الحجة الأولى
  OPPONENT = 'opponent',      // المعارض
  MODERATOR = 'moderator',    // المنسق
  SYNTHESIZER = 'synthesizer' // موحد الآراء
}

/**
 * Debate Position - موقف الوكيل
 */
export interface DebatePosition {
  agentName: string;
  role: DebateRole;
  argument: string;
  confidence: number;
  supportingEvidence: string[];
  timestamp: Date;
}

/**
 * Debate Argument - حجة في النقاش
 */
export interface DebateArgument {
  id: string;
  agentName: string;
  role: DebateRole;
  position: string;
  reasoning: string;
  evidence: string[];
  confidence: number;
  referencesTo?: string[]; // References to other arguments
  timestamp: Date;
}

/**
 * Debate Round - جولة نقاش
 */
export interface DebateRound {
  roundNumber: number;
  arguments: DebateArgument[];
  consensus?: ConsensusResult;
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'completed' | 'aborted';
}

/**
 * Consensus Result - نتيجة التوافق
 */
export interface ConsensusResult {
  achieved: boolean;
  agreementScore: number; // 0-1
  consensusPoints: string[];
  disagreementPoints: string[];
  finalSynthesis: string;
  participatingAgents: string[];
  confidence: number;
}

/**
 * Debate Configuration - إعدادات النقاش
 */
export interface DebateConfig {
  maxRounds?: number;
  minParticipants?: number;
  maxParticipants?: number;
  consensusThreshold?: number; // Minimum agreement score to achieve consensus
  confidenceThreshold?: number; // Minimum confidence to trigger debate
  allowUserInput?: boolean;
  timeoutPerRound?: number; // ms
  enableVoting?: boolean;
}

/**
 * Debate Session - جلسة نقاش
 */
export interface DebateSession {
  id: string;
  topic: string;
  participants: DebateParticipant[];
  rounds: DebateRound[];
  config: DebateConfig;
  status: 'initializing' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  finalResult?: StandardAgentOutput;
}

/**
 * Debate Participant - مشارك في النقاش
 */
export interface DebateParticipant {
  agent: BaseAgent;
  role: DebateRole;
  initialPosition?: string;
  voteWeight?: number; // For weighted voting
}

/**
 * Vote - تصويت
 */
export interface Vote {
  voterId: string;
  argumentId: string;
  score: number; // 0-1
  reasoning?: string;
  timestamp: Date;
}

/**
 * Debate Metrics - مقاييس النقاش
 */
export interface DebateMetrics {
  totalRounds: number;
  participantCount: number;
  consensusAchieved: boolean;
  finalAgreementScore: number;
  averageConfidence: number;
  totalArguments: number;
  processingTime: number; // ms
  qualityScore: number; // Overall quality of the debate
}

/**
 * Refutation - رد على حجة
 */
export interface Refutation {
  targetArgumentId: string;
  refutingAgent: string;
  counterArgument: string;
  evidence: string[];
  strength: number; // 0-1
}

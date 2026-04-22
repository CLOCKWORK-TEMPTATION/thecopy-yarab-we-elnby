/**
 * Multi-Agent Debate System - Index
 * نظام المناظرة متعدد الوكلاء
 * المرحلة 3 - Multi-Agent Debate System
 */

// Types
export * from './types';

// Core Classes
export { AgentDebator } from './agentDebator';
export { DebateSessionClass, DebateRoundClass } from './debateSession';
export { DebateModerator } from './debateModerator';

// Protocols
export {
  startDebate,
  presentArguments,
  refuteArguments,
  synthesizeConsensus,
  voteOnBestResponse,
} from './protocols';

// Selection
export {
  selectDebatingAgents,
  assignRoles,
  balanceAgentTypes,
  avoidRedundancy,
  selectAgentsByTaskTypes,
  selectMostConfidentAgents,
  createParticipantsWithRoles,
} from './selection';

// Resolution
export {
  calculateAgreementScore,
  identifyConsensusPoints,
  identifyDisagreementPoints,
  resolveDisagreements,
  generateFinalSynthesis,
  buildConsensusResult,
  calculateVoteResults,
} from './resolution';

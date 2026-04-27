// Knowledge Systems - Barrel Export
// Main entry point - re-exports all public APIs

export type {
  KnowledgeSystemCategory,
  KnowledgeGovernancePolicy,
  KnowledgeComponentKind,
  KnowledgeComponent,
  KnowledgeSystem,
  KnowledgeInventory,
  KnowledgeSystemDefinition,
  DiscoveryCandidate,
} from "./types";

export {
  KNOWLEDGE_DISCOVERY_EXCLUDED_FILE_PATTERNS,
  KNOWLEDGE_SYSTEM_DEFINITIONS,
} from "./definitions";

export {
  uniqueSorted,
  normalizeProviderSignal,
  normalizeVectorStoreSignal,
  collectKeywordMatches,
  hasMeaningfulDiscoverySignal,
  isExcludedKnowledgeDirectory,
  hasAllowedKnowledgeExtension,
  isExcludedKnowledgeFile,
  collectPackageScriptSignals,
  detectKnowledgeCandidate,
  walkKnowledgeRoot,
  collectKnowledgeDiscoveryCandidates,
  isGovernedLocalKnowledgeDoc,
  collectInvalidLocalKnowledgeDocs,
} from "./utils";

export { collectKnowledgeInventory } from "./inventory";

export type KnowledgeSystemCategory =
  | "code-retrieval"
  | "drama-retrieval"
  | "context-assembly"
  | "vector-memory"
  | "hybrid-knowledge"
  | "lightweight-search";

export type KnowledgeGovernancePolicy =
  | "unify-now"
  | "govern-only"
  | "temporary-independent"
  | "do-not-force-merge";

export type KnowledgeComponentKind =
  | "entrypoint"
  | "chunking"
  | "embedding-generation"
  | "indexing"
  | "vector-store"
  | "retrieval"
  | "reranking"
  | "context-assembly"
  | "api"
  | "search"
  | "governance";

export interface KnowledgeComponent {
  kind: KnowledgeComponentKind;
  path: string;
  exists: boolean;
}

export interface KnowledgeSystem {
  id: string;
  label: string;
  category: KnowledgeSystemCategory;
  policy: KnowledgeGovernancePolicy;
  root: string;
  status: "governed" | "competing" | "ungoverned";
  description: string;
  commands: string[];
  entrypoints: string[];
  criticalFiles: string[];
  inputs: string[];
  artifacts: string[];
  dependencies: string[];
  embeddingsProviders: string[];
  vectorStores: string[];
  rerankers: string[];
  governanceNotes: string[];
  components: KnowledgeComponent[];
}

export interface KnowledgeInventory {
  systems: KnowledgeSystem[];
  totalSystems: number;
  systemTypes: string[];
  embeddingsProviders: string[];
  vectorStores: string[];
  rerankers: string[];
  criticalFiles: string[];
  entrypoints: string[];
  commands: string[];
  competingSignals: string[];
  ungovernedFiles: string[];
  discoveryWarnings: string[];
  governanceStatus: "governed" | "competing" | "ungoverned";
}

export interface KnowledgeSystemDefinition {
  id: string;
  label: string;
  category: KnowledgeSystemCategory;
  policy: KnowledgeGovernancePolicy;
  root: string;
  description: string;
  commands: string[];
  entrypoints: string[];
  criticalFiles: string[];
  inputs: string[];
  artifacts: string[];
  dependencies: string[];
  components: Array<{ kind: KnowledgeComponentKind; path: string }>;
  ownedPrefixes: string[];
  localDocPaths: string[];
  providerPatterns: string[];
  vectorStorePatterns: string[];
  rerankerPatterns: string[];
  allowMultipleProviders?: boolean;
  allowMultipleVectorStores?: boolean;
}

export interface DiscoveryCandidate {
  path: string;
  reasons: string[];
}

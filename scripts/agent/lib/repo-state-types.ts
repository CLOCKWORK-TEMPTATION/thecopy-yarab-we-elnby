import type { DriftLevel } from "./constants";
import type { KnowledgeInventory } from "./knowledge-systems";
import type { CodeMemoryHealth } from "./code-memory/types";

export interface GitState {
  branch: string;
  headCommit: string;
  workingTreeClean: boolean;
  changedFiles: string[];
}

export interface WorkspaceApp {
  name: string;
  path: string;
}

export interface IdeTarget {
  id: string;
  label: string;
  path: string;
  kind: "markdown" | "cursor-rule";
  exists: boolean;
  referencedBySpecify: boolean;
  adopted: boolean;
  required: boolean;
  reasons: string[];
}

export interface RepoFacts {
  git: GitState;
  packageManager: string;
  workspacePatterns: string[];
  rootScripts: string[];
  officialCommands: string[];
  webPort: number | null;
  backendPort: number | null;
  apps: WorkspaceApp[];
  packages: WorkspaceApp[];
  entrypoints: string[];
  requiredIdeTargets: IdeTarget[];
  specifiedIdeTargets: string[];
  openIssues: string[];
  referenceFiles: string[];
  knowledgeInventory: KnowledgeInventory;
  codeMemory: CodeMemoryHealth;
}

export interface ReferenceStatus {
  sessionStateCurrent: boolean;
  roundNotesCurrent: boolean;
  codeMapCurrent: boolean;
  mindMapCurrent: boolean;
  ideMirrorsCurrent: boolean;
  knowledgeCurrent: boolean;
}

export interface FingerprintState {
  schemaVersion: number;
  branch: string;
  headCommit: string;
  lastBootstrapTimestamp: string;
  workingTreeHash: string;
  repoFactsHash: string;
  structuralHash: string;
  knowledgeHash: string;
  knowledgeStatus: KnowledgeInventory["governanceStatus"];
  driftLevel: DriftLevel;
  driftReasons: string[];
  structuralFiles: string[];
  criticalInputHashes: Record<string, string>;
  referenceOutputHashes: Record<string, string>;
  ideMirrorHashes: Record<string, string>;
  referenceStatus: ReferenceStatus;
}

export interface DriftResult {
  level: DriftLevel;
  reasons: string[];
}

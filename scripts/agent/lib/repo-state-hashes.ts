import {
  AGENT_CONTEXT_PATH,
  CODE_MAP_FILES,
  INPUT_FACT_FILES,
  MIND_MAP_FILES,
  SESSION_STATE_PATH,
  ROUND_NOTES_PATH,
} from "./constants";
import {
  fromRepoRoot,
  sha256,
  sha256FileIfExists,
  stableStringify,
} from "./utils";
import type { KnowledgeInventory } from "./knowledge-systems";
import { uniqueSorted } from "./repo-state-parsers";
import type { IdeTarget } from "./repo-state-types";

/**
 * Compute hashes for input fact files
 */
export async function computeInputHashes(
  filePaths: string[] = INPUT_FACT_FILES,
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const repoRelativePath of uniqueSorted(filePaths)) {
    const hash = await sha256FileIfExists(fromRepoRoot(repoRelativePath));
    if (hash) {
      hashes[repoRelativePath] = hash;
    }
  }
  return hashes;
}

/**
 * Compute hashes for output files
 */
export async function computeOutputHashes(): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  const outputFiles = [
    AGENT_CONTEXT_PATH,
    SESSION_STATE_PATH,
    ROUND_NOTES_PATH,
    ...CODE_MAP_FILES,
    ...MIND_MAP_FILES,
  ];

  for (const repoRelativePath of outputFiles) {
    const hash = await sha256FileIfExists(fromRepoRoot(repoRelativePath), {
      ignoreVolatileGeneratedLines: true,
    });
    if (hash) {
      hashes[repoRelativePath] = hash;
    }
  }
  return hashes;
}

/**
 * Compute hashes for IDE target files
 */
export async function computeIdeHashes(
  ideTargets: IdeTarget[],
): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const ideTarget of ideTargets.filter((entry) => entry.required)) {
    const hash = await sha256FileIfExists(fromRepoRoot(ideTarget.path));
    if (hash) {
      hashes[ideTarget.path] = hash;
    }
  }
  return hashes;
}

/**
 * Create hash from knowledge inventory
 */
export function createKnowledgeHash(
  knowledgeInventory: KnowledgeInventory,
): string {
  return sha256(
    stableStringify({
      governanceStatus: knowledgeInventory.governanceStatus,
      totalSystems: knowledgeInventory.totalSystems,
      systemTypes: knowledgeInventory.systemTypes,
      commands: knowledgeInventory.commands,
      entrypoints: knowledgeInventory.entrypoints,
      criticalFiles: knowledgeInventory.criticalFiles,
      embeddingsProviders: knowledgeInventory.embeddingsProviders,
      vectorStores: knowledgeInventory.vectorStores,
      rerankers: knowledgeInventory.rerankers,
      competingSignals: knowledgeInventory.competingSignals,
      ungovernedFiles: knowledgeInventory.ungovernedFiles,
      discoveryWarnings: knowledgeInventory.discoveryWarnings,
      systems: knowledgeInventory.systems.map((system) => ({
        id: system.id,
        category: system.category,
        policy: system.policy,
        status: system.status,
        entrypoints: system.entrypoints,
        criticalFiles: system.criticalFiles,
        inputs: system.inputs,
        artifacts: system.artifacts,
        dependencies: system.dependencies,
        embeddingsProviders: system.embeddingsProviders,
        vectorStores: system.vectorStores,
        rerankers: system.rerankers,
        governanceNotes: system.governanceNotes,
        components: system.components.map((component) => ({
          kind: component.kind,
          path: component.path,
          exists: component.exists,
        })),
      })),
    }),
  );
}

/**
 * Create hash from repo facts
 */
export function createFactsHash(facts: import("./repo-state-types").RepoFacts): string {
  return sha256(
    stableStringify({
      packageManager: facts.packageManager,
      workspacePatterns: facts.workspacePatterns,
      rootScripts: facts.rootScripts,
      officialCommands: facts.officialCommands,
      webPort: facts.webPort,
      backendPort: facts.backendPort,
      apps: facts.apps,
      packages: facts.packages,
      entrypoints: facts.entrypoints,
      ideTargets: facts.requiredIdeTargets.map((target) => ({
        path: target.path,
        required: target.required,
        referencedBySpecify: target.referencedBySpecify,
      })),
      knowledgeInventory: {
        governanceStatus: facts.knowledgeInventory.governanceStatus,
        totalSystems: facts.knowledgeInventory.totalSystems,
        systemTypes: facts.knowledgeInventory.systemTypes,
        commands: facts.knowledgeInventory.commands,
        entrypoints: facts.knowledgeInventory.entrypoints,
        criticalFiles: facts.knowledgeInventory.criticalFiles,
        competingSignals: facts.knowledgeInventory.competingSignals,
        ungovernedFiles: facts.knowledgeInventory.ungovernedFiles,
        discoveryWarnings: facts.knowledgeInventory.discoveryWarnings,
        systems: facts.knowledgeInventory.systems.map((system) => ({
          id: system.id,
          category: system.category,
          policy: system.policy,
          status: system.status,
          inputs: system.inputs,
          artifacts: system.artifacts,
          dependencies: system.dependencies,
        })),
      },
      codeMemory: {
        exists: facts.codeMemory.exists,
        stale: facts.codeMemory.stale,
        totalFiles: facts.codeMemory.totalFiles,
        totalChunks: facts.codeMemory.totalChunks,
        embeddedChunks: facts.codeMemory.embeddedChunks,
        coverageRate: facts.codeMemory.coverageRate,
        storage: facts.codeMemory.storage,
      },
    }),
  );
}

/**
 * Create structural hash from files and their hashes
 */
export function createStructuralHash(
  structuralFiles: string[],
  criticalInputHashes: Record<string, string>,
): string {
  return sha256(
    stableStringify({
      structuralFiles,
      hashes: Object.fromEntries(
        structuralFiles.map((filePath) => [
          filePath,
          criticalInputHashes[filePath] ?? "missing",
        ]),
      ),
    }),
  );
}

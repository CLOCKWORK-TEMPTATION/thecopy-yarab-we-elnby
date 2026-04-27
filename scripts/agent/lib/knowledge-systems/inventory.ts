import { RAG_CONTRACT_PATH } from "../constants";
import { fileExists, readTextIfExists, fromRepoRoot } from "../utils";
import type {
  KnowledgeSystem,
  KnowledgeSystemDefinition,
  KnowledgeInventory,
} from "./types";
import { KNOWLEDGE_SYSTEM_DEFINITIONS } from "./definitions";
import {
  uniqueSorted,
  normalizeProviderSignal,
  normalizeVectorStoreSignal,
  collectKnowledgeDiscoveryCandidates,
  collectInvalidLocalKnowledgeDocs,
} from "./utils";

function isSystemOwnedPath(
  definition: KnowledgeSystemDefinition,
  repoRelativePath: string,
): boolean {
  if (definition.criticalFiles.includes(repoRelativePath)) {
    return true;
  }

  if (definition.entrypoints.includes(repoRelativePath)) {
    return true;
  }

  if (
    definition.inputs.includes(repoRelativePath) ||
    definition.artifacts.includes(repoRelativePath)
  ) {
    return true;
  }

  return definition.ownedPrefixes.some((ownedPrefix) =>
    repoRelativePath.startsWith(ownedPrefix),
  );
}

function findOwningSystemId(repoRelativePath: string): string | null {
  for (const definition of KNOWLEDGE_SYSTEM_DEFINITIONS) {
    if (isSystemOwnedPath(definition, repoRelativePath)) {
      return definition.id;
    }
  }

  return null;
}

async function detectSignals(
  filePaths: string[],
  patterns: string[],
  normalizer?: (value: string) => string,
): Promise<string[]> {
  const found = new Set<string>();

  for (const filePath of filePaths) {
    const normalizedPath = filePath.toLowerCase();
    const content = await readTextIfExists(fromRepoRoot(filePath));
    const normalizedContent = content.toLowerCase();

    for (const pattern of patterns) {
      const normalizedPattern = pattern.toLowerCase();
      if (
        normalizedPath.includes(normalizedPattern) ||
        normalizedContent.includes(normalizedPattern)
      ) {
        found.add(normalizer ? normalizer(pattern) : pattern);
      }
    }
  }

  return uniqueSorted([...found]);
}

export async function collectKnowledgeInventory(): Promise<KnowledgeInventory> {
  const discoveryCandidates = await collectKnowledgeDiscoveryCandidates();
  const invalidLocalDocsBySystem = await collectInvalidLocalKnowledgeDocs();

  const discoveryWarnings: string[] = [];
  const ungovernedFiles = new Set<string>();

  for (const candidate of discoveryCandidates) {
    const owner = findOwningSystemId(candidate.path);
    if (owner) {
      continue;
    }

    ungovernedFiles.add(candidate.path);
    discoveryWarnings.push(
      `مرشح معرفة غير ممثل في الجرد المرجعي: ${candidate.path} (${candidate.reasons.join(" | ")})`,
    );
  }

  for (const [systemId, invalidDocs] of invalidLocalDocsBySystem.entries()) {
    for (const invalidDocPath of invalidDocs) {
      ungovernedFiles.add(invalidDocPath);
      discoveryWarnings.push(
        `وثيقة معرفة محلية بلا الترويسة المرجعية الإلزامية: ${invalidDocPath} (${systemId})`,
      );
    }
  }

  const systems: KnowledgeSystem[] = [];

  for (const definition of KNOWLEDGE_SYSTEM_DEFINITIONS) {
    const hasFootprint =
      definition.criticalFiles.some((filePath) => fileExists(filePath)) ||
      definition.entrypoints.some((filePath) => fileExists(filePath)) ||
      definition.components.some((component) => fileExists(component.path));

    if (!hasFootprint) {
      continue;
    }

    const components = definition.components.map((component) => ({
      ...component,
      exists: fileExists(component.path),
    }));

    const embeddingsProviders = await detectSignals(
      definition.criticalFiles,
      definition.providerPatterns,
      normalizeProviderSignal,
    );
    const vectorStores = await detectSignals(
      definition.criticalFiles,
      definition.vectorStorePatterns,
      normalizeVectorStoreSignal,
    );
    const rerankers = await detectSignals(
      definition.criticalFiles,
      definition.rerankerPatterns,
    );

    const governanceNotes: string[] = [];
    const invalidDocs = invalidLocalDocsBySystem.get(definition.id) ?? [];

    if (!fileExists(RAG_CONTRACT_PATH)) {
      governanceNotes.push("RAG contract missing");
    }

    if (embeddingsProviders.length > 1 && !definition.allowMultipleProviders) {
      governanceNotes.push(
        "Multiple embedding providers detected outside the approved policy",
      );
    }

    if (vectorStores.length > 1 && !definition.allowMultipleVectorStores) {
      governanceNotes.push(
        "Multiple vector stores detected outside the approved policy",
      );
    }

    if (invalidDocs.length > 0) {
      governanceNotes.push(
        "Local knowledge docs are missing the non-authoritative governance header",
      );
    }

    systems.push({
      id: definition.id,
      label: definition.label,
      category: definition.category,
      policy: definition.policy,
      root: definition.root,
      status:
        invalidDocs.length > 0
          ? "ungoverned"
          : governanceNotes.length > 0
            ? "competing"
            : "governed",
      description: definition.description,
      commands: definition.commands,
      entrypoints: uniqueSorted(definition.entrypoints),
      criticalFiles: uniqueSorted(definition.criticalFiles),
      inputs: uniqueSorted(definition.inputs),
      artifacts: uniqueSorted(definition.artifacts),
      dependencies: uniqueSorted(definition.dependencies),
      embeddingsProviders,
      vectorStores,
      rerankers,
      governanceNotes,
      components,
    });
  }

  const competingSignals = uniqueSorted(
    systems.flatMap((system) => system.governanceNotes),
  );
  const normalizedUngovernedFiles = uniqueSorted([...ungovernedFiles]);
  const normalizedDiscoveryWarnings = uniqueSorted(discoveryWarnings);

  const governanceStatus =
    normalizedUngovernedFiles.length > 0
      ? "ungoverned"
      : competingSignals.length > 0
        ? "competing"
        : "governed";

  return {
    systems,
    totalSystems: systems.length,
    systemTypes: uniqueSorted(systems.map((system) => system.category)),
    embeddingsProviders: uniqueSorted(
      systems.flatMap((system) => system.embeddingsProviders),
    ),
    vectorStores: uniqueSorted(
      systems.flatMap((system) => system.vectorStores),
    ),
    rerankers: uniqueSorted(systems.flatMap((system) => system.rerankers)),
    criticalFiles: uniqueSorted(
      systems.flatMap((system) => system.criticalFiles),
    ),
    entrypoints: uniqueSorted(systems.flatMap((system) => system.entrypoints)),
    commands: uniqueSorted(systems.flatMap((system) => system.commands)),
    competingSignals,
    ungovernedFiles: normalizedUngovernedFiles,
    discoveryWarnings: normalizedDiscoveryWarnings,
    governanceStatus,
  };
}

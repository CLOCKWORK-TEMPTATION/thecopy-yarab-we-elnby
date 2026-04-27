import { promises as fsp } from "node:fs";
import path from "node:path";
import {
  KNOWLEDGE_DISCOVERY_EXTENSIONS,
  KNOWLEDGE_DISCOVERY_EXCLUDED_DIRECTORIES,
  KNOWLEDGE_DISCOVERY_KEYWORDS,
  KNOWLEDGE_DISCOVERY_ROOTS,
  KNOWLEDGE_DISCOVERY_STRONG_KEYWORDS,
  KNOWLEDGE_LOCAL_DOC_DISCLAIMER,
  KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO,
  KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES,
} from "../constants";
import {
  fromRepoRoot,
  readTextIfExists,
  toPosixPath,
} from "../utils";
import { fileExists } from "../utils";
import type { DiscoveryCandidate } from "./types";
import { KNOWLEDGE_DISCOVERY_EXCLUDED_FILE_PATTERNS } from "./definitions";

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) =>
    left.localeCompare(right),
  );
}

export function normalizeProviderSignal(value: string): string {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("gemini") ||
    normalized.includes("googlegenai") ||
    normalized.includes("googlegenerativeai")
  ) {
    return "gemini";
  }

  if (normalized.includes("openrouter")) {
    return "openrouter";
  }

  if (normalized.includes("anthropic")) {
    return "anthropic";
  }

  if (normalized.includes("openai")) {
    return "openai";
  }

  return normalized;
}

export function normalizeVectorStoreSignal(value: string): string {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("weaviate") ||
    normalized.includes("codechunks") ||
    normalized.includes("documentation") ||
    normalized.includes("decisions") ||
    normalized.includes("architecture") ||
    normalized.includes("adhocchunks")
  ) {
    return "weaviate";
  }

  if (normalized.includes("qdrant") || normalized.includes("codebase-index")) {
    return "qdrant";
  }

  if (
    normalized.includes("lancedb") ||
    normalized.includes(".agent-code-memory")
  ) {
    return "lancedb";
  }

  if (normalized.includes("workspace-embedding-index.json")) {
    return "workspace-embedding-index";
  }

  return normalized;
}

export function collectKeywordMatches(text: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapedKeyword}[a-z0-9-]*($|[^a-z0-9])`,
      "i",
    );
    return pattern.test(text);
  });
}

export function hasMeaningfulDiscoverySignal(matches: string[]): boolean {
  return matches.some((match) =>
    KNOWLEDGE_DISCOVERY_STRONG_KEYWORDS.includes(match),
  );
}

export function isExcludedKnowledgeDirectory(repoRelativePath: string): boolean {
  const normalized = toPosixPath(repoRelativePath);

  return KNOWLEDGE_DISCOVERY_EXCLUDED_DIRECTORIES.some((excludedDirectory) => {
    if (excludedDirectory.includes("/")) {
      return (
        normalized === excludedDirectory ||
        normalized.startsWith(`${excludedDirectory}/`)
      );
    }

    return normalized.split("/").includes(excludedDirectory);
  });
}

export function hasAllowedKnowledgeExtension(repoRelativePath: string): boolean {
  if (repoRelativePath.endsWith("/package.json")) {
    return true;
  }

  return KNOWLEDGE_DISCOVERY_EXTENSIONS.some((extension) =>
    repoRelativePath.endsWith(extension),
  );
}

export function isExcludedKnowledgeFile(repoRelativePath: string): boolean {
  return KNOWLEDGE_DISCOVERY_EXCLUDED_FILE_PATTERNS.some((excludedPattern) =>
    repoRelativePath.includes(excludedPattern),
  );
}

export function collectPackageScriptSignals(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as { scripts?: Record<string, string> };
    const scripts = parsed.scripts ?? {};
    const scriptSignals = Object.entries(scripts)
      .filter(([scriptName, scriptValue]) => {
        if (
          scriptName === "lint" ||
          scriptName.startsWith("lint:") ||
          scriptValue.includes("lint-chunked.mjs") ||
          scriptValue.includes("run-vitest-chunks.mjs")
        ) {
          return false;
        }
        const matches = collectKeywordMatches(
          `${scriptName} ${scriptValue}`,
          KNOWLEDGE_DISCOVERY_KEYWORDS,
        );
        return hasMeaningfulDiscoverySignal(matches);
      })
      .map(([scriptName]) => `package script: ${scriptName}`);

    return uniqueSorted(scriptSignals);
  } catch {
    return [];
  }
}

export async function detectKnowledgeCandidate(
  repoRelativePath: string,
): Promise<string[]> {
  const pathSignals = collectKeywordMatches(
    repoRelativePath,
    KNOWLEDGE_DISCOVERY_KEYWORDS,
  );
  const reasons: string[] = [];

  if (hasMeaningfulDiscoverySignal(pathSignals)) {
    reasons.push(`path signal: ${uniqueSorted(pathSignals).join(", ")}`);
  }

  if (repoRelativePath.endsWith("/package.json")) {
    const content = await readTextIfExists(fromRepoRoot(repoRelativePath));
    reasons.push(...collectPackageScriptSignals(content));
    return uniqueSorted(reasons);
  }

  if (reasons.length > 0) {
    return uniqueSorted(reasons);
  }

  return [];
}

export async function walkKnowledgeRoot(
  repoRelativeDirectory: string,
  candidates: Map<string, Set<string>>,
): Promise<void> {
  const absoluteDirectory = fromRepoRoot(repoRelativeDirectory);
  let entries: Array<Awaited<ReturnType<typeof fsp.readdir>>[number]> = [];

  try {
    entries = await fsp.readdir(absoluteDirectory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const repoRelativePath = toPosixPath(
      path.join(repoRelativeDirectory, entry.name),
    );

    if (entry.isDirectory()) {
      if (isExcludedKnowledgeDirectory(repoRelativePath)) {
        continue;
      }

      await walkKnowledgeRoot(repoRelativePath, candidates);
      continue;
    }

    if (!entry.isFile() || !hasAllowedKnowledgeExtension(repoRelativePath)) {
      continue;
    }

    if (isExcludedKnowledgeFile(repoRelativePath)) {
      continue;
    }

    const reasons = await detectKnowledgeCandidate(repoRelativePath);
    if (reasons.length === 0) {
      continue;
    }

    const existingReasons =
      candidates.get(repoRelativePath) ?? new Set<string>();
    for (const reason of reasons) {
      existingReasons.add(reason);
    }
    candidates.set(repoRelativePath, existingReasons);
  }
}

export async function collectKnowledgeDiscoveryCandidates(): Promise<
  DiscoveryCandidate[]
> {
  const candidates = new Map<string, Set<string>>();

  for (const root of KNOWLEDGE_DISCOVERY_ROOTS) {
    await walkKnowledgeRoot(root, candidates);
  }

  return [...candidates.entries()]
    .map(([candidatePath, reasons]) => ({
      path: candidatePath,
      reasons: uniqueSorted([...reasons]),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

export function isGovernedLocalKnowledgeDoc(content: string): boolean {
  if (!content.includes(KNOWLEDGE_LOCAL_DOC_DISCLAIMER)) {
    return false;
  }

  if (!content.includes(KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO)) {
    return false;
  }

  return KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES.every((reference) =>
    content.includes(reference),
  );
}

export async function collectInvalidLocalKnowledgeDocs(): Promise<
  Map<string, string[]>
> {
  const invalidDocsBySystem = new Map<string, string[]>();
  const { KNOWLEDGE_SYSTEM_DEFINITIONS } = await import("./definitions");

  for (const definition of KNOWLEDGE_SYSTEM_DEFINITIONS) {
    const invalidDocs: string[] = [];

    for (const localDocPath of definition.localDocPaths) {
      if (!fileExists(localDocPath)) {
        continue;
      }

      const content = await readTextIfExists(fromRepoRoot(localDocPath));
      if (!isGovernedLocalKnowledgeDoc(content)) {
        invalidDocs.push(localDocPath);
      }
    }

    if (invalidDocs.length > 0) {
      invalidDocsBySystem.set(definition.id, uniqueSorted(invalidDocs));
    }
  }

  return invalidDocsBySystem;
}

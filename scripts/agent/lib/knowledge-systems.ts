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
  RAG_CONTRACT_PATH,
} from "./constants";
import { fileExists, fromRepoRoot, readTextIfExists, toPosixPath } from "./utils";

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

interface KnowledgeSystemDefinition {
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

interface DiscoveryCandidate {
  path: string;
  reasons: string[];
}

const KNOWLEDGE_DISCOVERY_EXCLUDED_FILE_PATTERNS = [
  "dop_assistant_spec_package/",
  "arab-stylist-studio-spec/",
];

const KNOWLEDGE_SYSTEM_DEFINITIONS: KnowledgeSystemDefinition[] = [
  {
    id: "workspace-embeddings",
    label: "Workspace Code Embeddings",
    category: "code-retrieval",
    policy: "govern-only",
    root: "scripts",
    description: "Workspace-level semantic retrieval and embedding index generation.",
    commands: ["pnpm workspace:embed"],
    entrypoints: ["scripts/generate-workspace-embeddings.js"],
    criticalFiles: [
      "scripts/generate-workspace-embeddings.js",
      "WORKSPACE-EMBEDDING-INDEX.json",
      "WORKSPACE-EMBEDDING-SUMMARY.md",
      ".embedding-hash-cache.json",
      RAG_CONTRACT_PATH,
    ],
    inputs: [
      "package.json",
      "pnpm-workspace.yaml",
      "scripts/generate-workspace-embeddings.js",
      "apps/*",
      "packages/*",
    ],
    artifacts: [
      "WORKSPACE-EMBEDDING-INDEX.json",
      "WORKSPACE-EMBEDDING-SUMMARY.md",
      ".embedding-hash-cache.json",
    ],
    dependencies: [
      "Google Gemini embeddings",
      "pnpm workspace:embed",
    ],
    components: [
      { kind: "entrypoint", path: "scripts/generate-workspace-embeddings.js" },
      { kind: "chunking", path: "scripts/generate-workspace-embeddings.js" },
      { kind: "embedding-generation", path: "scripts/generate-workspace-embeddings.js" },
      { kind: "indexing", path: "scripts/generate-workspace-embeddings.js" },
      { kind: "search", path: "scripts/generate-workspace-embeddings.js" },
      { kind: "governance", path: RAG_CONTRACT_PATH },
    ],
    ownedPrefixes: [
      "scripts/generate-workspace-embeddings.js",
      "WORKSPACE-EMBEDDING-INDEX.json",
      "WORKSPACE-EMBEDDING-SUMMARY.md",
      ".embedding-hash-cache.json",
    ],
    localDocPaths: [],
    providerPatterns: ["gemini-embedding-2-preview", "gemini-embedding-001", "GoogleGenAI"],
    vectorStorePatterns: ["WORKSPACE-EMBEDDING-INDEX.json"],
    rerankerPatterns: [],
  },
  {
    id: "backend-memory",
    label: "Backend Memory Retrieval",
    category: "vector-memory",
    policy: "unify-now",
    root: "apps/backend/src/memory",
    description: "Unified repository indexing, Weaviate retrieval, and profile-based context assembly.",
    commands: [],
    entrypoints: [
      "apps/backend/src/memory/index.ts",
      "apps/backend/src/memory/api/routes.ts",
    ],
    criticalFiles: [
      "apps/backend/src/memory/index.ts",
      "apps/backend/src/memory/api/routes.ts",
      "apps/backend/src/memory/embeddings/generator.ts",
      "apps/backend/src/memory/embeddings/mrl-optimizer.ts",
      "apps/backend/src/memory/indexer/repository-crawler.ts",
      "apps/backend/src/memory/indexer/weaviate-indexing.service.ts",
      "apps/backend/src/memory/indexer/git-watcher.ts",
      "apps/backend/src/memory/context/context-assembly.service.ts",
      "apps/backend/src/memory/retrieval/context-builder.ts",
      "apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts",
      "apps/backend/src/memory/vector-store/client.ts",
      "apps/backend/src/memory/vector-store/schema.ts",
      "apps/backend/src/memory/types.ts",
      "packages/core-memory/src/chunking/semanticChunker.ts",
      "packages/core-memory/src/types.ts",
      RAG_CONTRACT_PATH,
    ],
    inputs: [
      "apps/backend/src/memory/index.ts",
      "apps/backend/src/memory/api/routes.ts",
      "packages/core-memory/src/chunking/semanticChunker.ts",
      "apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts",
    ],
    artifacts: [
      "Weaviate:CodeChunks",
      "Weaviate:Documentation",
      "Weaviate:Decisions",
      "Weaviate:Architecture",
      "Weaviate:AdHocChunks",
    ],
    dependencies: [
      "Weaviate",
      "Google Gemini embeddings",
      "@the-copy/core-memory",
    ],
    components: [
      { kind: "entrypoint", path: "apps/backend/src/memory/index.ts" },
      { kind: "api", path: "apps/backend/src/memory/api/routes.ts" },
      { kind: "embedding-generation", path: "apps/backend/src/memory/embeddings/generator.ts" },
      { kind: "embedding-generation", path: "apps/backend/src/memory/embeddings/mrl-optimizer.ts" },
      { kind: "indexing", path: "apps/backend/src/memory/indexer/repository-crawler.ts" },
      { kind: "indexing", path: "apps/backend/src/memory/indexer/weaviate-indexing.service.ts" },
      { kind: "indexing", path: "apps/backend/src/memory/indexer/git-watcher.ts" },
      { kind: "chunking", path: "packages/core-memory/src/chunking/semanticChunker.ts" },
      { kind: "context-assembly", path: "apps/backend/src/memory/context/context-assembly.service.ts" },
      { kind: "context-assembly", path: "apps/backend/src/memory/retrieval/context-builder.ts" },
      { kind: "retrieval", path: "apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts" },
      { kind: "vector-store", path: "apps/backend/src/memory/vector-store/client.ts" },
      { kind: "vector-store", path: "apps/backend/src/memory/vector-store/schema.ts" },
      { kind: "governance", path: RAG_CONTRACT_PATH },
    ],
    ownedPrefixes: [
      "apps/backend/src/memory/",
      "packages/core-memory/",
    ],
    localDocPaths: [],
    providerPatterns: ["GoogleGenAI", "gemini-embedding-2-preview", "gemini-embedding-001"],
    vectorStorePatterns: ["weaviate", "Weaviate", "CodeChunks", "Documentation", "Decisions", "Architecture", "AdHocChunks"],
    rerankerPatterns: ["selectHits"],
  },
  {
    id: "backend-enhanced-rag",
    label: "Backend Enhanced RAG",
    category: "drama-retrieval",
    policy: "unify-now",
    root: "apps/backend/src/services/rag",
    description: "Coordinator facade over shared chunking, Weaviate retrieval, and unified context assembly.",
    commands: [],
    entrypoints: ["apps/backend/src/services/rag/enhancedRAG.service.ts"],
    criticalFiles: [
      "apps/backend/src/services/rag/enhancedRAG.service.ts",
      "apps/backend/src/services/rag/embeddings.service.ts",
      "apps/backend/src/memory/indexer/weaviate-indexing.service.ts",
      "apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts",
      "apps/backend/src/memory/context/context-assembly.service.ts",
      "apps/backend/src/memory/embeddings/generator.ts",
      "apps/backend/src/memory/vector-store/client.ts",
      "packages/core-memory/src/chunking/semanticChunker.ts",
      "packages/core-memory/src/types.ts",
      RAG_CONTRACT_PATH,
    ],
    inputs: [
      "apps/backend/src/services/rag/enhancedRAG.service.ts",
      "apps/backend/src/services/rag/embeddings.service.ts",
      "apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts",
      "apps/backend/src/memory/context/context-assembly.service.ts",
    ],
    artifacts: [
      "Weaviate:AdHocChunks",
      "ContextAssemblyService output",
    ],
    dependencies: [
      "Weaviate",
      "ContextAssemblyService",
      "Google Gemini embeddings",
    ],
    components: [
      { kind: "entrypoint", path: "apps/backend/src/services/rag/enhancedRAG.service.ts" },
      { kind: "embedding-generation", path: "apps/backend/src/services/rag/embeddings.service.ts" },
      { kind: "chunking", path: "packages/core-memory/src/chunking/semanticChunker.ts" },
      { kind: "indexing", path: "apps/backend/src/memory/indexer/weaviate-indexing.service.ts" },
      { kind: "retrieval", path: "apps/backend/src/memory/retrieval/weaviate-retrieval.service.ts" },
      { kind: "vector-store", path: "apps/backend/src/memory/vector-store/client.ts" },
      { kind: "context-assembly", path: "apps/backend/src/memory/context/context-assembly.service.ts" },
      { kind: "governance", path: RAG_CONTRACT_PATH },
    ],
    ownedPrefixes: [
      "apps/backend/src/services/rag/",
    ],
    localDocPaths: [],
    providerPatterns: [
      "GoogleGenAI",
      "GoogleGenerativeAI",
      "gemini-embedding-2-preview",
      "gemini-embedding-001",
    ],
    vectorStorePatterns: ["weaviate", "Weaviate", "weaviateStore", "AdHocChunks"],
    rerankerPatterns: ["selectHits"],
  },
  {
    id: "editor-code-rag",
    label: "Editor Code RAG",
    category: "code-retrieval",
    policy: "temporary-independent",
    root: "apps/web/src/app/(main)/editor",
    description: "Editor-local code retrieval using Qdrant for vectors, OpenRouter embeddings, and Gemini answers.",
    commands: [
      "pnpm --filter @the-copy/web editor:rag:index",
      "pnpm --filter @the-copy/web editor:rag:ask",
      "pnpm --filter @the-copy/web editor:rag:stats",
      "pnpm --filter @the-copy/web editor:rag:smoke",
    ],
    entrypoints: [
      "apps/web/src/app/(main)/editor/scripts/rag-index.ts",
      "apps/web/src/app/(main)/editor/scripts/rag-query.ts",
      "apps/web/src/app/(main)/editor/scripts/rag-stats.ts",
      "apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts",
    ],
    criticalFiles: [
      "apps/web/src/app/(main)/editor/scripts/rag-index.ts",
      "apps/web/src/app/(main)/editor/scripts/rag-query.ts",
      "apps/web/src/app/(main)/editor/scripts/rag-stats.ts",
      "apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts",
      "apps/web/src/app/(main)/editor/src/rag/chunker.ts",
      "apps/web/src/app/(main)/editor/src/rag/config.ts",
      "apps/web/src/app/(main)/editor/src/rag/embeddings.ts",
      "apps/web/src/app/(main)/editor/src/rag/indexer.ts",
      "apps/web/src/app/(main)/editor/src/rag/query.ts",
      "apps/web/src/app/(main)/editor/src/rag/types.ts",
      "apps/web/src/app/(main)/editor/src/rag/README.md",
      "apps/web/src/app/(main)/editor/src/rag/rag-system.md",
      RAG_CONTRACT_PATH,
    ],
    inputs: [
      "apps/web/package.json",
      "apps/web/src/app/(main)/editor/scripts/rag-index.ts",
      "apps/web/src/app/(main)/editor/src/rag/config.ts",
      "apps/web/src/app/(main)/editor/src/rag/query.ts",
    ],
    artifacts: [
      "Qdrant:codebase-index",
    ],
    dependencies: [
      "QDRANT_URL",
      "QDRANT_API_KEY",
      "OPENROUTER_API_KEY",
      "GEMINI_API_KEY",
    ],
    components: [
      { kind: "entrypoint", path: "apps/web/src/app/(main)/editor/scripts/rag-index.ts" },
      { kind: "entrypoint", path: "apps/web/src/app/(main)/editor/scripts/rag-query.ts" },
      { kind: "entrypoint", path: "apps/web/src/app/(main)/editor/scripts/rag-stats.ts" },
      { kind: "entrypoint", path: "apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts" },
      { kind: "chunking", path: "apps/web/src/app/(main)/editor/src/rag/chunker.ts" },
      { kind: "embedding-generation", path: "apps/web/src/app/(main)/editor/src/rag/embeddings.ts" },
      { kind: "indexing", path: "apps/web/src/app/(main)/editor/src/rag/indexer.ts" },
      { kind: "retrieval", path: "apps/web/src/app/(main)/editor/src/rag/query.ts" },
      { kind: "vector-store", path: "apps/web/src/app/(main)/editor/src/rag/config.ts" },
      { kind: "governance", path: RAG_CONTRACT_PATH },
    ],
    ownedPrefixes: [
      "apps/web/src/app/(main)/editor/scripts/rag-",
      "apps/web/src/app/(main)/editor/src/rag/",
    ],
    localDocPaths: [
      "apps/web/src/app/(main)/editor/src/rag/README.md",
      "apps/web/src/app/(main)/editor/src/rag/rag-system.md",
    ],
    providerPatterns: ["https://openrouter.ai/api/v1", "OPENROUTER_API_KEY", "GoogleGenAI", "GEMINI_API_KEY"],
    vectorStorePatterns: ["qdrant", "Qdrant", "codebase-index"],
    rerankerPatterns: [],
    allowMultipleProviders: true,
  },
  {
    id: "web-legacy-rag",
    label: "Web Legacy RAG Utilities",
    category: "lightweight-search",
    policy: "do-not-force-merge",
    root: "apps/web/src/lib",
    description: "Legacy in-web chunking and retrieval helpers retained under governance without forced architectural merge.",
    commands: [],
    entrypoints: [
      "apps/web/src/lib/ai/rag/index.ts",
      "apps/web/src/lib/drama-analyst/services/ragService.ts",
    ],
    criticalFiles: [
      "apps/web/src/lib/ai/stations/gemini-service.ts",
      "apps/web/src/lib/ai/rag/context-retriever.ts",
      "apps/web/src/lib/ai/rag/index.ts",
      "apps/web/src/lib/ai/rag/text-chunking.ts",
      "apps/web/src/lib/ai/text-chunking.ts",
      "apps/web/src/lib/drama-analyst/services/ragService.ts",
      RAG_CONTRACT_PATH,
    ],
    inputs: [
      "apps/web/src/lib/ai/rag/context-retriever.ts",
      "apps/web/src/lib/ai/rag/text-chunking.ts",
      "apps/web/src/lib/drama-analyst/services/ragService.ts",
    ],
    artifacts: [
      "In-memory context maps",
      "In-memory retrieved chunks",
    ],
    dependencies: [
      "GeminiService",
      "Frontend in-memory chunking",
    ],
    components: [
      { kind: "entrypoint", path: "apps/web/src/lib/ai/rag/index.ts" },
      { kind: "chunking", path: "apps/web/src/lib/ai/rag/text-chunking.ts" },
      { kind: "chunking", path: "apps/web/src/lib/ai/text-chunking.ts" },
      { kind: "retrieval", path: "apps/web/src/lib/ai/rag/context-retriever.ts" },
      { kind: "retrieval", path: "apps/web/src/lib/drama-analyst/services/ragService.ts" },
      { kind: "embedding-generation", path: "apps/web/src/lib/ai/stations/gemini-service.ts" },
      { kind: "governance", path: RAG_CONTRACT_PATH },
    ],
    ownedPrefixes: [
      "apps/web/src/lib/ai/rag/",
      "apps/web/src/lib/ai/text-chunking.ts",
      "apps/web/src/lib/drama-analyst/services/ragService.ts",
    ],
    localDocPaths: [],
    providerPatterns: ["GeminiService", "geminiService"],
    vectorStorePatterns: [],
    rerankerPatterns: [],
  },
];

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function normalizeProviderSignal(value: string): string {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("gemini")
    || normalized.includes("googlegenai")
    || normalized.includes("googlegenerativeai")
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

function normalizeVectorStoreSignal(value: string): string {
  const normalized = value.toLowerCase();

  if (
    normalized.includes("weaviate")
    || normalized.includes("codechunks")
    || normalized.includes("documentation")
    || normalized.includes("decisions")
    || normalized.includes("architecture")
    || normalized.includes("adhocchunks")
  ) {
    return "weaviate";
  }

  if (normalized.includes("qdrant") || normalized.includes("codebase-index")) {
    return "qdrant";
  }

  if (normalized.includes("workspace-embedding-index.json")) {
    return "workspace-embedding-index";
  }

  return normalized;
}

function collectKeywordMatches(text: string, keywords: string[]): string[] {
  return keywords.filter((keyword) => {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(^|[^a-z0-9])${escapedKeyword}[a-z0-9-]*($|[^a-z0-9])`, "i");
    return pattern.test(text);
  });
}

function hasMeaningfulDiscoverySignal(matches: string[]): boolean {
  return matches.some((match) => KNOWLEDGE_DISCOVERY_STRONG_KEYWORDS.includes(match));
}

function isExcludedKnowledgeDirectory(repoRelativePath: string): boolean {
  const normalized = toPosixPath(repoRelativePath);

  return KNOWLEDGE_DISCOVERY_EXCLUDED_DIRECTORIES.some((excludedDirectory) => {
    if (excludedDirectory.includes("/")) {
      return normalized === excludedDirectory || normalized.startsWith(`${excludedDirectory}/`);
    }

    return normalized.split("/").includes(excludedDirectory);
  });
}

function hasAllowedKnowledgeExtension(repoRelativePath: string): boolean {
  if (repoRelativePath.endsWith("/package.json")) {
    return true;
  }

  return KNOWLEDGE_DISCOVERY_EXTENSIONS.some((extension) => repoRelativePath.endsWith(extension));
}

function isExcludedKnowledgeFile(repoRelativePath: string): boolean {
  return KNOWLEDGE_DISCOVERY_EXCLUDED_FILE_PATTERNS.some((excludedPattern) => repoRelativePath.includes(excludedPattern));
}

function collectPackageScriptSignals(content: string): string[] {
  try {
    const parsed = JSON.parse(content) as { scripts?: Record<string, string> };
    const scripts = parsed.scripts ?? {};
    const scriptSignals = Object.entries(scripts)
      .filter(([scriptName, scriptValue]) => {
        const matches = collectKeywordMatches(`${scriptName} ${scriptValue}`, KNOWLEDGE_DISCOVERY_KEYWORDS);
        return hasMeaningfulDiscoverySignal(matches);
      })
      .map(([scriptName]) => `package script: ${scriptName}`);

    return uniqueSorted(scriptSignals);
  } catch {
    return [];
  }
}

async function detectKnowledgeCandidate(repoRelativePath: string): Promise<string[]> {
  const pathSignals = collectKeywordMatches(repoRelativePath, KNOWLEDGE_DISCOVERY_KEYWORDS);
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

async function walkKnowledgeRoot(repoRelativeDirectory: string, candidates: Map<string, Set<string>>): Promise<void> {
  const absoluteDirectory = fromRepoRoot(repoRelativeDirectory);
  let entries: Array<Awaited<ReturnType<typeof fsp.readdir>>[number]> = [];

  try {
    entries = await fsp.readdir(absoluteDirectory, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const repoRelativePath = toPosixPath(path.join(repoRelativeDirectory, entry.name));

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

    const existingReasons = candidates.get(repoRelativePath) ?? new Set<string>();
    for (const reason of reasons) {
      existingReasons.add(reason);
    }
    candidates.set(repoRelativePath, existingReasons);
  }
}

async function collectKnowledgeDiscoveryCandidates(): Promise<DiscoveryCandidate[]> {
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

function isGovernedLocalKnowledgeDoc(content: string): boolean {
  if (!content.includes(KNOWLEDGE_LOCAL_DOC_DISCLAIMER)) {
    return false;
  }

  if (!content.includes(KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO)) {
    return false;
  }

  return KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES.every((reference) => content.includes(reference));
}

async function collectInvalidLocalKnowledgeDocs(): Promise<Map<string, string[]>> {
  const invalidDocsBySystem = new Map<string, string[]>();

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

function isSystemOwnedPath(definition: KnowledgeSystemDefinition, repoRelativePath: string): boolean {
  if (definition.criticalFiles.includes(repoRelativePath)) {
    return true;
  }

  if (definition.entrypoints.includes(repoRelativePath)) {
    return true;
  }

  if (definition.inputs.includes(repoRelativePath) || definition.artifacts.includes(repoRelativePath)) {
    return true;
  }

  return definition.ownedPrefixes.some((ownedPrefix) => repoRelativePath.startsWith(ownedPrefix));
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
      if (normalizedPath.includes(normalizedPattern) || normalizedContent.includes(normalizedPattern)) {
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
    discoveryWarnings.push(`مرشح معرفة غير ممثل في الجرد المرجعي: ${candidate.path} (${candidate.reasons.join(" | ")})`);
  }

  for (const [systemId, invalidDocs] of invalidLocalDocsBySystem.entries()) {
    for (const invalidDocPath of invalidDocs) {
      ungovernedFiles.add(invalidDocPath);
      discoveryWarnings.push(`وثيقة معرفة محلية بلا الترويسة المرجعية الإلزامية: ${invalidDocPath} (${systemId})`);
    }
  }

  const systems: KnowledgeSystem[] = [];

  for (const definition of KNOWLEDGE_SYSTEM_DEFINITIONS) {
    const hasFootprint =
      definition.criticalFiles.some((filePath) => fileExists(filePath))
      || definition.entrypoints.some((filePath) => fileExists(filePath))
      || definition.components.some((component) => fileExists(component.path));

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
    const rerankers = await detectSignals(definition.criticalFiles, definition.rerankerPatterns);

    const governanceNotes: string[] = [];
    const invalidDocs = invalidLocalDocsBySystem.get(definition.id) ?? [];

    if (!fileExists(RAG_CONTRACT_PATH)) {
      governanceNotes.push("RAG contract missing");
    }

    if (embeddingsProviders.length > 1 && !definition.allowMultipleProviders) {
      governanceNotes.push("Multiple embedding providers detected outside the approved policy");
    }

    if (vectorStores.length > 1 && !definition.allowMultipleVectorStores) {
      governanceNotes.push("Multiple vector stores detected outside the approved policy");
    }

    if (invalidDocs.length > 0) {
      governanceNotes.push("Local knowledge docs are missing the non-authoritative governance header");
    }

    systems.push({
      id: definition.id,
      label: definition.label,
      category: definition.category,
      policy: definition.policy,
      root: definition.root,
      status: invalidDocs.length > 0 ? "ungoverned" : governanceNotes.length > 0 ? "competing" : "governed",
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

  const competingSignals = uniqueSorted(systems.flatMap((system) => system.governanceNotes));
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
    embeddingsProviders: uniqueSorted(systems.flatMap((system) => system.embeddingsProviders)),
    vectorStores: uniqueSorted(systems.flatMap((system) => system.vectorStores)),
    rerankers: uniqueSorted(systems.flatMap((system) => system.rerankers)),
    criticalFiles: uniqueSorted(systems.flatMap((system) => system.criticalFiles)),
    entrypoints: uniqueSorted(systems.flatMap((system) => system.entrypoints)),
    commands: uniqueSorted(systems.flatMap((system) => system.commands)),
    competingSignals,
    ungovernedFiles: normalizedUngovernedFiles,
    discoveryWarnings: normalizedDiscoveryWarnings,
    governanceStatus,
  };
}

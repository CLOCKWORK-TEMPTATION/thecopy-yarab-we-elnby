export type DriftLevel = "no-drift" | "soft-drift" | "hard-drift";

export interface IdeCandidate {
  id: string;
  label: string;
  path: string;
  kind: "markdown" | "cursor-rule";
}

export const REPO_ROOT = process.cwd();

export const AGENT_CONTEXT_PATH = ".repo-agent/AGENT-CONTEXT.generated.md";
export const FINGERPRINT_PATH = ".repo-agent/state-fingerprint.json";
export const SESSION_STATE_PATH = "output/session-state.md";
export const ROUND_NOTES_PATH = "output/round-notes.md";
export const PROJECT_RULES_PATH = "output/project-rules.md";
export const RAG_CONTRACT_PATH = ".repo-agent/RAG-OPERATING-CONTRACT.md";
export const TOOL_GUARD_CONTRACT_PATH = ".repo-agent/TOOL-GUARD-CONTRACT.json";

export const CODE_MAP_FILES = [
  "output/code-map/code-map.json",
  "output/code-map/CODEMAP.md",
  "output/code-map/dependency-graph.md",
  "output/code-map/entrypoints.md",
  "output/code-map/findings.md",
  "output/code-map/rag-systems.md",
  "output/code-map/rag-entrypoints.md",
  "output/code-map/runtime-flows.md",
];

export const MIND_MAP_FILES = [
  "output/mind-map/mindmap.json",
  "output/mind-map/MINDMAP.md",
  "output/mind-map/mindmap-summary.md",
  "output/mind-map/mindmap.mmd",
  "output/mind-map/rag-topology.mmd",
];

export const MANUAL_CONTRACT_FILES = [
  "AGENTS.md",
  ".repo-agent/OPERATING-CONTRACT.md",
  ".repo-agent/STARTUP-PROTOCOL.md",
  ".repo-agent/HANDOFF-PROTOCOL.md",
  ".repo-agent/RAG-OPERATING-CONTRACT.md",
  ".github/agents/my-agent.md",
  "CLAUDE.md",
  "apps/web/src/app/(main)/editor/CLAUDE.md",
];

export const MANUAL_GUIDANCE_FILES = [
  ".github/agents/my-agent.md",
  "CLAUDE.md",
  "apps/web/src/app/(main)/editor/CLAUDE.md",
];

export const INPUT_FACT_FILES = [
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "apps/web/package.json",
  "apps/backend/package.json",
  "apps/web/src/app/(main)/editor/scripts/rag-index.ts",
  "apps/web/src/app/(main)/editor/src/rag/config.ts",
  "scripts/doctor.ps1",
  ".repo-agent/TOOL-GUARD-CONTRACT.json",
  "scripts/agent/guard.ts",
  "scripts/agent/code-memory-watch.ts",
  "scripts/agent/start-agent.ps1",
  "scripts/agent/lib/agent-guard.ts",
  "scripts/generate-workspace-embeddings.js",
  "scripts/agent/code-memory-index.ts",
  "scripts/agent/code-memory-search.ts",
  "scripts/agent/code-memory-status.ts",
  "scripts/agent/code-memory-verify.ts",
  "scripts/agent/lib/code-memory/config.ts",
  "scripts/agent/lib/code-memory/commands.ts",
  "scripts/agent/lib/code-memory/discovery.ts",
  "scripts/agent/lib/code-memory/embedder.ts",
  "scripts/agent/lib/code-memory/hashing.ts",
  "scripts/agent/lib/code-memory/qdrant.ts",
  "scripts/agent/lib/code-memory/store.ts",
  "scripts/agent/lib/code-memory/status.ts",
  "scripts/agent/lib/code-memory/types.ts",
  "apps/backend/src/memory/api/routes.ts",
  "apps/backend/src/memory/embeddings/generator.ts",
  "apps/backend/src/memory/indexer/repository-crawler.ts",
  "apps/backend/src/memory/retrieval/context-builder.ts",
  "apps/backend/src/memory/vector-store/client.ts",
  "apps/backend/src/services/rag/enhancedRAG.service.ts",
  "apps/backend/src/services/rag/embeddings.service.ts",
  "packages/core-memory/src/chunking/semanticChunker.ts",
  ".github/agents/my-agent.md",
  ".specify/scripts/powershell/update-agent-context.ps1",
  ...MANUAL_CONTRACT_FILES,
];

export const IDE_CANDIDATES: IdeCandidate[] = [
  {
    id: "windsurf",
    label: "Windsurf",
    path: ".windsurf/rules/specify-rules.md",
    kind: "markdown",
  },
  {
    id: "cursor",
    label: "Cursor",
    path: ".cursor/rules/specify-rules.mdc",
    kind: "cursor-rule",
  },
  {
    id: "copilot",
    label: "GitHub Copilot",
    path: ".github/copilot-instructions.md",
    kind: "markdown",
  },
  { id: "junie", label: "Junie", path: ".junie/AGENTS.md", kind: "markdown" },
  {
    id: "kilocode",
    label: "Kilo Code",
    path: ".kilocode/rules/specify-rules.md",
    kind: "markdown",
  },
  {
    id: "augment",
    label: "Augment",
    path: ".augment/rules/specify-rules.md",
    kind: "markdown",
  },
  {
    id: "roo",
    label: "Roo",
    path: ".roo/rules/specify-rules.md",
    kind: "markdown",
  },
  {
    id: "vibe",
    label: "Vibe",
    path: ".vibe/agents/specify-agents.md",
    kind: "markdown",
  },
  {
    id: "trae",
    label: "Trae",
    path: ".trae/rules/AGENTS.md",
    kind: "markdown",
  },
  {
    id: "agent",
    label: "Agent",
    path: ".agent/rules/specify-rules.md",
    kind: "markdown",
  },
];

export const IDE_PROHIBITED_PATTERNS = [
  "3000",
  "3001",
  "5000",
  "8787",
  "pnpm dev",
  "pnpm start",
  "pnpm doctor",
  "pnpm run doctor",
  "pnpm verify:runtime",
  "workspace:embed",
  "Docker",
  "docker",
  "Weaviate",
  "weaviate",
  "gemini-embedding",
  "text-embedding-004",
  "Ø§Ù„Ø£Ø¹Ø·Ø§Ù„ Ø§Ù„Ù…ÙØªÙˆØ­Ø©",
];

export const ROUND_NOTE_DEDUPE_MINUTES = 5;

export const KNOWLEDGE_DISCOVERY_ROOTS = ["scripts", "apps", "packages"];

export const KNOWLEDGE_DISCOVERY_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
];

export const KNOWLEDGE_DISCOVERY_EXCLUDED_DIRECTORIES = [
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "docs/auto",
  "node_modules",
  "output",
  "test-results",
];

export const KNOWLEDGE_DISCOVERY_KEYWORDS = [
  "rag",
  "embedding",
  "vector",
  "weaviate",
  "qdrant",
  "retriev",
  "semantic",
  "chunk",
  "context",
  "rerank",
  "query",
  "index",
  "search",
];

export const KNOWLEDGE_DISCOVERY_STRONG_KEYWORDS = [
  "rag",
  "embedding",
  "vector",
  "weaviate",
  "qdrant",
  "retriev",
  "semantic",
  "chunk",
  "rerank",
];

export const KNOWLEDGE_DISCOVERY_WEAK_KEYWORDS = [
  "context",
  "query",
  "index",
  "search",
];

export const KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES = [
  "AGENTS.md",
  "output/session-state.md",
  ".repo-agent/RAG-OPERATING-CONTRACT.md",
];

export const KNOWLEDGE_LOCAL_DOC_DISCLAIMER =
  "هذا الملف توثيق تنفيذي محلي وليس مصدر حقيقة تشغيلية.";
export const KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO =
  "الحقيقة المرجعية لطبقة المعرفة موجودة فقط في:";

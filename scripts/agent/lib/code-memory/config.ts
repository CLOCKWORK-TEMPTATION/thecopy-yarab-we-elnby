import path from "node:path";

import type { CodeMemorySourceRoot } from "./types";

export const CODE_MEMORY_VERSION = 1;
export const CODE_MEMORY_DIR = ".agent-code-memory";
export const CODE_MEMORY_LANCE_DIR = path.join(CODE_MEMORY_DIR, "lancedb");
export const CODE_MEMORY_MANIFEST_PATH = path.join(CODE_MEMORY_DIR, "manifest.json");
export const CODE_MEMORY_TEXT_INDEX_PATH = path.join(CODE_MEMORY_DIR, "text-index.json");
export const CODE_MEMORY_TABLE = "code_memory";
export const CODE_MEMORY_QDRANT_COLLECTION = "agent_code_memory";
export const CODE_MEMORY_EMBEDDING_DIMENSION = 1536;
export const CODE_MEMORY_DOCUMENT_MODEL = "gemini-embedding-001";

export const CODE_MEMORY_SOURCE_ROOTS: CodeMemorySourceRoot[] = [
  { base: "scripts", type: "agent-scripts", extensions: [".ts", ".js", ".mjs", ".cjs"], maxDepth: 8 },
  { base: "apps/web/src", type: "source-web", extensions: [".ts", ".tsx"], maxDepth: 10 },
  { base: "apps/backend/src", type: "source-backend", extensions: [".ts"], maxDepth: 10 },
  { base: "packages", type: "source-package", extensions: [".ts", ".tsx"], maxDepth: 8 },
];

export const CODE_MEMORY_PRIORITY_FILES = [
  "AGENTS.md",
  ".repo-agent/OPERATING-CONTRACT.md",
  ".repo-agent/RAG-OPERATING-CONTRACT.md",
  "package.json",
  "pnpm-workspace.yaml",
  "turbo.json",
  "apps/web/package.json",
  "apps/backend/package.json",
];

export const CODE_MEMORY_EXCLUDED_DIRECTORIES = [
  ".agent-code-memory",
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "output",
  "test-results",
];

export const CODE_MEMORY_CHUNK_MAX_CHARS = 3000;
export const CODE_MEMORY_CHUNK_OVERLAP_CHARS = 300;

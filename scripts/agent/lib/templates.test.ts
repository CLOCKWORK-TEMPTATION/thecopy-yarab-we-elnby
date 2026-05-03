import { describe, expect, test } from "vitest";

import { renderGeneratedContext } from "./templates";
import type { DriftResult, RepoFacts } from "./repo-state";

const facts = {
  git: {
    branch: "main",
    headCommit: "abc123",
    workingTreeClean: true,
    changedFiles: [],
  },
  packageManager: "pnpm@10.32.1",
  workspacePatterns: ["apps/*", "packages/*"],
  rootScripts: [],
  officialCommands: ["pnpm agent:bootstrap", "pnpm agent:verify"],
  webPort: 5000,
  backendPort: 3001,
  apps: [{ name: "@the-copy/web", path: "apps/web" }],
  packages: [{ name: "@the-copy/core-memory", path: "packages/core-memory" }],
  entrypoints: ["scripts/agent/bootstrap.ts"],
  requiredIdeTargets: [],
  specifiedIdeTargets: [],
  openIssues: [],
  referenceFiles: [],
  knowledgeInventory: {
    governanceStatus: "governed",
    totalSystems: 1,
    systemTypes: ["hybrid-knowledge"],
    embeddingsProviders: [],
    vectorStores: ["weaviate"],
    rerankers: [],
    systems: [],
    commands: [],
    entrypoints: [],
    criticalFiles: [],
    competingSignals: [],
    ungovernedFiles: [],
    discoveryWarnings: [],
  },
  codeMemory: {
    exists: true,
    stale: false,
    totalFiles: 1,
    totalChunks: 1,
    embeddedChunks: 1,
    coverageRate: 1,
    storage: {
      local: "lancedb",
      qdrant: "configured",
    },
    message: "current",
  },
} satisfies RepoFacts;

const drift = {
  level: "no-drift",
  reasons: ["لا يوجد drift مؤثر"],
} satisfies DriftResult;

describe("generated agent context", () => {
  test("embeds startup memory context instead of only linking it", () => {
    const startupMemoryContext = `# Persistent Memory Startup Context

status: ready
zone: memory_context

## Injected Memories

- id: memory-1
  source_ref: output/round-notes.md
  trust_level: high
  model_version: baai-bge-m3-local
  text: Decision: next sessions must load persistent memory before starting work.
`;

    const rendered = renderGeneratedContext(
      facts,
      drift,
      "2026-05-03T00:00:00.000Z",
      [],
      startupMemoryContext,
    );

    expect(rendered).toContain("## سياق الذاكرة الدائمة المحقون تلقائيًا");
    expect(rendered).toContain("status: ready");
    expect(rendered).toContain("zone: memory_context");
    expect(rendered).toContain(
      "Decision: next sessions must load persistent memory before starting work.",
    );
  });
});

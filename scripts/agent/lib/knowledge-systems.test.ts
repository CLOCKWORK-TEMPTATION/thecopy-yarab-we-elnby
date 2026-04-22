import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { afterEach, describe, expect, test } from "vitest";

import {
  KNOWLEDGE_LOCAL_DOC_DISCLAIMER,
  KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO,
  KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES,
} from "./constants";
import { collectKnowledgeInventory } from "./knowledge-systems";

const ORIGINAL_CWD = process.cwd();
let currentTempRepo: string | null = null;

async function writeRepoFile(root: string, repoRelativePath: string, content: string): Promise<void> {
  const absolutePath = path.join(root, ...repoRelativePath.split("/"));
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
}

function buildGovernedLocalDoc(title: string): string {
  return `# ${title}

${KNOWLEDGE_LOCAL_DOC_DISCLAIMER}

${KNOWLEDGE_LOCAL_DOC_REFERENCE_INTRO}

\`\`\`text
${KNOWLEDGE_LOCAL_DOC_REQUIRED_REFERENCES.join("\n")}
\`\`\`
`;
}

async function createBaseKnowledgeRepo(validDocs: boolean): Promise<string> {
  const tempRepo = await mkdtemp(path.join(os.tmpdir(), "knowledge-inventory-"));

  await writeRepoFile(tempRepo, ".repo-agent/RAG-OPERATING-CONTRACT.md", "# contract\n");
  await writeRepoFile(tempRepo, "scripts/generate-workspace-embeddings.js", "const model = 'gemini-embedding-001';\n");
  await writeRepoFile(
    tempRepo,
    "apps/web/package.json",
    JSON.stringify(
      {
        name: "@the-copy/web",
        scripts: {
          "editor:rag:index": "tsx \"src/app/(main)/editor/scripts/rag-index.ts\"",
          "editor:rag:ask": "tsx \"src/app/(main)/editor/scripts/rag-query.ts\"",
          "editor:rag:stats": "tsx \"src/app/(main)/editor/scripts/rag-stats.ts\"",
          "editor:rag:smoke": "tsx \"src/app/(main)/editor/scripts/rag-smoke-test.ts\"",
        },
      },
      null,
      2,
    ),
  );
  await writeRepoFile(
    tempRepo,
    "apps/web/src/app/(main)/editor/src/rag/config.ts",
    "import { QdrantClient } from '@qdrant/js-client-rest';\n"
      + "export const url = process.env.QDRANT_URL;\n"
      + "export const apiKey = process.env.QDRANT_API_KEY;\n"
      + "export const embeddingKey = process.env.OPENROUTER_API_KEY;\n"
      + "export const answerKey = process.env.GEMINI_API_KEY;\n"
      + "export const collection = 'codebase-index';\n"
      + "new QdrantClient({ url });\n"
      + "const provider = 'https://openrouter.ai/api/v1';\n"
      + "const answerProvider = 'GoogleGenAI';\n",
  );
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/src/rag/chunker.ts", "export const chunk = 'semantic chunk';\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/src/rag/embeddings.ts", "export const provider = 'https://openrouter.ai/api/v1';\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/src/rag/indexer.ts", "export const store = 'qdrant';\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/src/rag/query.ts", "export const answerProvider = 'GoogleGenAI';\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/src/rag/types.ts", "export interface SearchResult { score: number; }\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/scripts/rag-index.ts", "export const task = 'rag:index';\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/scripts/rag-query.ts", "export const task = 'rag:ask';\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/scripts/rag-stats.ts", "export const task = 'rag:stats';\n");
  await writeRepoFile(tempRepo, "apps/web/src/app/(main)/editor/scripts/rag-smoke-test.ts", "export const task = 'rag:smoke';\n");
  await writeRepoFile(
    tempRepo,
    "apps/web/src/app/(main)/editor/src/rag/README.md",
    validDocs ? buildGovernedLocalDoc("README") : "# README\nوثيقة محلية بلا ترويسة حاكمة.\n",
  );
  await writeRepoFile(
    tempRepo,
    "apps/web/src/app/(main)/editor/src/rag/rag-system.md",
    validDocs ? buildGovernedLocalDoc("RAG System") : "# RAG System\nوثيقة محلية بلا ترويسة حاكمة.\n",
  );

  return tempRepo;
}

afterEach(async () => {
  process.chdir(ORIGINAL_CWD);
  if (currentTempRepo) {
    await rm(currentTempRepo, { recursive: true, force: true });
    currentTempRepo = null;
  }
});

describe.sequential("collectKnowledgeInventory", () => {
  test("discovers governed systems and flags ungoverned knowledge candidates", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(true);
    await writeRepoFile(currentTempRepo, "apps/unknown/src/rag/rogue-retrieval.ts", "export const rogue = 'qdrant retrieval';\n");

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.systems.map((system) => system.id)).toContain("workspace-embeddings");
    expect(inventory.systems.map((system) => system.id)).toContain("editor-code-rag");
    expect(inventory.ungovernedFiles).toContain("apps/unknown/src/rag/rogue-retrieval.ts");
    expect(inventory.discoveryWarnings.some((warning) => warning.includes("rogue-retrieval.ts"))).toBe(true);
  });

  test("fails local knowledge docs without the governance header", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(false);

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.ungovernedFiles).toContain("apps/web/src/app/(main)/editor/src/rag/README.md");
    expect(inventory.ungovernedFiles).toContain("apps/web/src/app/(main)/editor/src/rag/rag-system.md");
    expect(inventory.discoveryWarnings.some((warning) => warning.includes("README.md"))).toBe(true);
    expect(inventory.discoveryWarnings.some((warning) => warning.includes("rag-system.md"))).toBe(true);
  });

  test("accepts local knowledge docs with the governance header", async () => {
    currentTempRepo = await createBaseKnowledgeRepo(true);

    process.chdir(currentTempRepo);
    const inventory = await collectKnowledgeInventory();

    expect(inventory.ungovernedFiles).not.toContain("apps/web/src/app/(main)/editor/src/rag/README.md");
    expect(inventory.ungovernedFiles).not.toContain("apps/web/src/app/(main)/editor/src/rag/rag-system.md");
    expect(inventory.discoveryWarnings.some((warning) => warning.includes("README.md"))).toBe(false);
    expect(inventory.discoveryWarnings.some((warning) => warning.includes("rag-system.md"))).toBe(false);
  });
});

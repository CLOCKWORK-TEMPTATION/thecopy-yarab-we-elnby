import { promises as fsp } from "node:fs";
import path from "node:path";

import * as lancedb from "@lancedb/lancedb";

import {
  CODE_MEMORY_DIR,
  CODE_MEMORY_LANCE_DIR,
  CODE_MEMORY_MANIFEST_PATH,
  CODE_MEMORY_TABLE,
  CODE_MEMORY_VERSION,
} from "./config";
import { calculateCodeMemoryDiff, createFileHashes } from "./discovery";
import type { CodeMemoryChunk, CodeMemoryManifest, CodeMemorySearchResult } from "./types";
import { readJsonIfExists } from "../utils";

type LanceRecord = CodeMemoryChunk & { vector: number[] };

export async function readCodeMemoryManifest(): Promise<CodeMemoryManifest | null> {
  return readJsonIfExists<CodeMemoryManifest>(path.join(process.cwd(), CODE_MEMORY_MANIFEST_PATH));
}

export async function writeCodeMemoryManifest(manifest: CodeMemoryManifest): Promise<void> {
  await fsp.mkdir(path.join(process.cwd(), CODE_MEMORY_DIR), { recursive: true });
  await fsp.writeFile(path.join(process.cwd(), CODE_MEMORY_MANIFEST_PATH), JSON.stringify(manifest, null, 2), "utf8");
}

async function connectLocalDb() {
  await fsp.mkdir(path.join(process.cwd(), CODE_MEMORY_LANCE_DIR), { recursive: true });
  return lancedb.connect(path.join(process.cwd(), CODE_MEMORY_LANCE_DIR));
}

function toRecord(chunk: CodeMemoryChunk): LanceRecord {
  if (!chunk.embedding || chunk.embedding.length === 0) {
    throw new Error(`Cannot index chunk without embedding: ${chunk.path}:${chunk.chunkIndex}`);
  }
  return {
    ...chunk,
    vector: chunk.embedding,
  };
}

export async function readAllCodeMemoryChunks(): Promise<CodeMemoryChunk[]> {
  const db = await connectLocalDb();
  const tableNames = await db.tableNames();
  if (!tableNames.includes(CODE_MEMORY_TABLE)) {
    return [];
  }
  const table = await db.openTable(CODE_MEMORY_TABLE);
  const rows = await table.query().limit(Number.MAX_SAFE_INTEGER).toArray() as LanceRecord[];
  return rows.map((row) => ({
    ...row,
    embedding: row.vector,
  }));
}

export async function writeCodeMemoryStore(
  chunks: CodeMemoryChunk[],
  previousManifest: CodeMemoryManifest | null,
  qdrantStatus: CodeMemoryManifest["storage"]["qdrant"],
  qdrant?: CodeMemoryManifest["qdrant"],
): Promise<CodeMemoryManifest> {
  const records = chunks.map(toRecord);
  const db = await connectLocalDb();
  await db.createTable(CODE_MEMORY_TABLE, records, { mode: "overwrite" });

  const manifest: CodeMemoryManifest = {
    version: CODE_MEMORY_VERSION,
    generatedAt: new Date().toISOString(),
    storage: {
      local: "lancedb",
      qdrant: qdrantStatus,
    },
    model: "gemini-embedding-001",
    embeddingDimension: records[0]?.vector.length ?? 0,
    totalFiles: new Set(chunks.map((chunk) => chunk.path)).size,
    totalChunks: chunks.length,
    embeddedChunks: chunks.filter((chunk) => chunk.embedding && chunk.embedding.length > 0).length,
    chunkIds: chunks.map((chunk) => chunk.id).sort((left, right) => left.localeCompare(right)),
    fileHashes: createFileHashes(chunks),
    diff: calculateCodeMemoryDiff(chunks, previousManifest),
    qdrant,
  };

  await writeCodeMemoryManifest(manifest);
  return manifest;
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length >= 2);
}

function lexicalScore(queryTokens: string[], chunk: CodeMemoryChunk): number {
  if (queryTokens.length === 0) {
    return 0;
  }
  const haystack = `${chunk.path} ${chunk.type} ${chunk.summary} ${chunk.content}`.toLowerCase();
  const hits = queryTokens.filter((token) => haystack.includes(token)).length;
  return hits / queryTokens.length;
}

function cosineSimilarity(left: number[] | undefined, right: number[] | undefined): number {
  if (!left || !right || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

export async function searchCodeMemory(query: string, queryVector?: number[], limit = 10): Promise<CodeMemorySearchResult[]> {
  const chunks = await readAllCodeMemoryChunks();
  const queryTokens = tokenize(query);

  return chunks
    .map((chunk) => {
      const lexical = lexicalScore(queryTokens, chunk);
      const vector = cosineSimilarity(queryVector, chunk.embedding);
      const score = queryVector ? vector * 0.7 + lexical * 0.3 : lexical;
      return {
        id: chunk.id,
        path: chunk.path,
        type: chunk.type,
        chunkIndex: chunk.chunkIndex,
        totalChunks: chunk.totalChunks,
        summary: chunk.summary,
        content: chunk.content,
        lexicalScore: lexical,
        vectorScore: vector,
        score,
        reason: queryVector ? "hybrid vector and lexical match" : "lexical match without query embedding",
      };
    })
    .filter((result) => result.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

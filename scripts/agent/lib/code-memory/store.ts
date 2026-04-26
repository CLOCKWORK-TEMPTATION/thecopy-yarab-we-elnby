import { promises as fsp } from "node:fs";
import path from "node:path";

import * as lancedb from "@lancedb/lancedb";

import {
  CODE_MEMORY_DIR,
  CODE_MEMORY_LANCE_DIR,
  CODE_MEMORY_MANIFEST_PATH,
  CODE_MEMORY_TABLE,
  CODE_MEMORY_TEXT_INDEX_PATH,
  CODE_MEMORY_VERSION,
} from "./config";
import { calculateCodeMemoryDiff, createFileHashes } from "./discovery";
import type { CodeMemoryChunk, CodeMemoryManifest, CodeMemorySearchResult } from "./types";
import { readJsonIfExists } from "../utils";

type LanceRecord = Omit<CodeMemoryChunk, "embedding"> & { vector: unknown };
type TextIndex = Record<string, string[]>;

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

function toNumberArray(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }

  if (ArrayBuffer.isView(value)) {
    return Array.from(value as ArrayLike<number>).map(Number).filter(Number.isFinite);
  }

  if (value && typeof value === "object") {
    const maybeValues = (value as { values?: unknown; toArray?: () => unknown }).values;
    if (maybeValues) {
      return toNumberArray(maybeValues);
    }

    const maybeArray = (value as { toArray?: () => unknown }).toArray?.();
    if (maybeArray) {
      return toNumberArray(maybeArray);
    }

    if (Symbol.iterator in value) {
      return Array.from(value as Iterable<unknown>).map(Number).filter(Number.isFinite);
    }
  }

  return [];
}

function toRecord(chunk: CodeMemoryChunk): LanceRecord {
  const vector = toNumberArray(chunk.embedding);
  if (vector.length === 0) {
    throw new Error(`Cannot index chunk without embedding: ${chunk.path}:${chunk.chunkIndex}`);
  }
  const { embedding: _embedding, ...record } = chunk;
  return {
    ...record,
    vector,
  };
}

function tokenize(input: string): string[] {
  return input.toLowerCase().split(/[^\p{L}\p{N}_-]+/u).filter((token) => token.length >= 2);
}

function textIndexCorpus(chunk: CodeMemoryChunk): string {
  return `${chunk.path} ${chunk.type} ${chunk.summary} ${chunk.content}`;
}

function buildTextIndex(chunks: CodeMemoryChunk[]): TextIndex {
  const postings = new Map<string, Set<string>>();

  for (const chunk of chunks) {
    for (const token of tokenize(textIndexCorpus(chunk))) {
      const ids = postings.get(token) ?? new Set<string>();
      ids.add(chunk.id);
      postings.set(token, ids);
    }
  }

  return Object.fromEntries(
    [...postings.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([token, ids]) => [token, [...ids].sort((left, right) => left.localeCompare(right))]),
  );
}

async function writeTextIndex(chunks: CodeMemoryChunk[]): Promise<void> {
  await fsp.mkdir(path.join(process.cwd(), CODE_MEMORY_DIR), { recursive: true });
  await fsp.writeFile(path.join(process.cwd(), CODE_MEMORY_TEXT_INDEX_PATH), JSON.stringify(buildTextIndex(chunks), null, 2), "utf8");
}

async function readTextIndex(): Promise<TextIndex | null> {
  return readJsonIfExists<TextIndex>(path.join(process.cwd(), CODE_MEMORY_TEXT_INDEX_PATH));
}

export async function readAllCodeMemoryChunks(): Promise<CodeMemoryChunk[]> {
  const db = await connectLocalDb();
  const tableNames = await db.tableNames();
  if (!tableNames.includes(CODE_MEMORY_TABLE)) {
    return [];
  }
  const table = await db.openTable(CODE_MEMORY_TABLE);
  const rows = await table.query().limit(1_000_000).toArray() as LanceRecord[];
  return rows.map((row) => ({
    ...row,
    embedding: toNumberArray(row.vector),
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
  await writeTextIndex(chunks);

  const manifest: CodeMemoryManifest = {
    version: CODE_MEMORY_VERSION,
    generatedAt: new Date().toISOString(),
    storage: {
      local: "lancedb",
      qdrant: qdrantStatus,
    },
    model: "gemini-embedding-001",
    embeddingDimension: toNumberArray(records[0]?.vector).length,
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
  const similarity = dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
  return Number.isFinite(similarity) ? similarity : 0;
}

export async function searchCodeMemory(query: string, queryVector?: number[], limit = 10): Promise<CodeMemorySearchResult[]> {
  const chunks = await readAllCodeMemoryChunks();
  const queryTokens = tokenize(query);
  const textIndex = await readTextIndex();
  const candidateIds = new Set<string>();

  if (!queryVector && textIndex) {
    for (const token of queryTokens) {
      for (const chunkId of textIndex[token] ?? []) {
        candidateIds.add(chunkId);
      }
    }
  }

  const searchableChunks = !queryVector && textIndex && queryTokens.length > 0
    ? chunks.filter((chunk) => candidateIds.has(chunk.id))
    : chunks;

  return searchableChunks
    .map((chunk) => {
      const lexical = lexicalScore(queryTokens, chunk);
      const vector = cosineSimilarity(queryVector, chunk.embedding);
      const positiveVector = Number.isFinite(vector) ? Math.max(0, vector) : 0;
      const score = queryVector ? positiveVector * 0.7 + lexical * 0.3 : lexical;
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

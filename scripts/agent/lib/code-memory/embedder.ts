import fs from "node:fs";
import path from "node:path";

import { GoogleGenAI } from "@google/genai";

import { CODE_MEMORY_DOCUMENT_MODEL, CODE_MEMORY_EMBEDDING_DIMENSION } from "./config";
import type { CodeMemoryChunk } from "./types";

interface LegacyIndexItem {
  path: string;
  chunkIndex?: number;
  embedding?: number[];
}

interface LegacyIndex {
  searchIndex?: LegacyIndexItem[];
}

export interface CodeMemoryEmbedOptions {
  dryRun?: boolean;
  allowLegacyVectors?: boolean;
  previousVectors?: Map<string, number[]>;
}

function loadEnvFile(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length > 0 && !process.env[key]) {
      process.env[key] = rest.join("=").trim();
    }
  }
}

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return values;
  }
  return values.map((value) => value / magnitude);
}

function getApiKey(): string | null {
  loadEnvFile();
  return process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || null;
}

function createClient(): GoogleGenAI {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENAI_API_KEY or GEMINI_API_KEY. Real code-memory embeddings require an API key.");
  }
  return new GoogleGenAI({ apiKey });
}

function legacyKey(pathName: string, chunkIndex: number): string {
  return `${pathName}:${chunkIndex}`;
}

export function loadLegacyVectors(indexPath = "WORKSPACE-EMBEDDING-INDEX.json"): Map<string, number[]> {
  const vectors = new Map<string, number[]>();
  if (!fs.existsSync(indexPath)) {
    return vectors;
  }

  const parsed = JSON.parse(fs.readFileSync(indexPath, "utf8")) as LegacyIndex;
  for (const item of parsed.searchIndex ?? []) {
    if (item.embedding && item.embedding.length > 0) {
      vectors.set(legacyKey(item.path, item.chunkIndex ?? 0), item.embedding);
    }
  }
  return vectors;
}

export async function embedDocuments(chunks: CodeMemoryChunk[], options: CodeMemoryEmbedOptions = {}): Promise<CodeMemoryChunk[]> {
  if (options.dryRun) {
    return chunks;
  }

  const previousVectors = options.previousVectors ?? new Map<string, number[]>();
  const chunksNeedingEmbeddings = chunks.filter((chunk) => !previousVectors.has(legacyKey(chunk.path, chunk.chunkIndex)));
  const embeddedChunks = chunks.map((chunk) => {
    const existingVector = previousVectors.get(legacyKey(chunk.path, chunk.chunkIndex));
    return existingVector ? { ...chunk, embedding: existingVector } : chunk;
  });

  if (chunksNeedingEmbeddings.length === 0) {
    return embeddedChunks;
  }

  const ai = createClient();
  const batchSize = 10;
  const vectorById = new Map<string, number[]>();

  for (let start = 0; start < chunksNeedingEmbeddings.length; start += batchSize) {
    const batch = chunksNeedingEmbeddings.slice(start, start + batchSize);
    const response = await ai.models.embedContent({
      model: CODE_MEMORY_DOCUMENT_MODEL,
      contents: batch.map((chunk) => `${chunk.path}\n\n${chunk.content}`),
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: CODE_MEMORY_EMBEDDING_DIMENSION,
      },
    });

    response.embeddings.forEach((embedding, index) => {
      vectorById.set(batch[index].id, normalizeVector(embedding.values));
    });
  }

  return embeddedChunks.map((chunk) => {
    if (chunk.embedding) {
      return chunk;
    }
    const embedding = vectorById.get(chunk.id);
    if (!embedding) {
      throw new Error(`Missing generated embedding for ${chunk.path}:${chunk.chunkIndex}`);
    }
    return { ...chunk, embedding };
  });
}

export async function embedQuery(query: string): Promise<number[]> {
  const ai = createClient();
  const response = await ai.models.embedContent({
    model: CODE_MEMORY_DOCUMENT_MODEL,
    contents: [query],
    config: {
      taskType: "CODE_RETRIEVAL_QUERY",
      outputDimensionality: CODE_MEMORY_EMBEDDING_DIMENSION,
    },
  });

  return normalizeVector(response.embeddings[0].values);
}

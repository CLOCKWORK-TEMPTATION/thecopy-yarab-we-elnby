import { discoverCodeMemoryChunks } from "./discovery";
import { embedDocuments, embedQuery, loadLegacyVectors } from "./embedder";
import { collectCodeMemoryHealth } from "./status";
import { readAllCodeMemoryChunks, readCodeMemoryManifest, searchCodeMemory, writeCodeMemoryStore } from "./store";
import { syncCodeMemoryToQdrant } from "./qdrant";
import type { CodeMemoryChunk } from "./types";

function readArgValue(args: string[], name: string): string | null {
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function reusableVectorsFromStore(chunks: CodeMemoryChunk[], previousChunks: CodeMemoryChunk[]): Map<string, number[]> {
  const currentChunkHashes = new Map(chunks.map((chunk) => [`${chunk.path}:${chunk.chunkIndex}`, chunk.chunkHash]));
  const vectors = new Map<string, number[]>();

  for (const previousChunk of previousChunks) {
    const key = `${previousChunk.path}:${previousChunk.chunkIndex}`;
    if (currentChunkHashes.get(key) === previousChunk.chunkHash && previousChunk.embedding) {
      vectors.set(key, previousChunk.embedding);
    }
  }

  return vectors;
}

export async function runCodeMemoryIndex(args: string[]): Promise<void> {
  const dryRun = hasFlag(args, "--dry-run");
  const syncQdrant = hasFlag(args, "--sync-qdrant");
  const fromLegacy = hasFlag(args, "--from-legacy");
  const filter = readArgValue(args, "--filter");
  const json = hasFlag(args, "--json");

  const previousManifest = await readCodeMemoryManifest();
  const chunks = await discoverCodeMemoryChunks({ filter });
  const existingChunks = await readAllCodeMemoryChunks();
  const previousVectors = reusableVectorsFromStore(chunks, existingChunks);

  if (fromLegacy) {
    const legacyVectors = loadLegacyVectors();
    for (const [key, vector] of legacyVectors.entries()) {
      if (!previousVectors.has(key)) {
        previousVectors.set(key, vector);
      }
    }
  }

  if (dryRun) {
    const missingVectorCount = chunks.filter((chunk) => !previousVectors.has(`${chunk.path}:${chunk.chunkIndex}`)).length;
    const result = {
      dryRun: true,
      totalChunks: chunks.length,
      reusableVectors: previousVectors.size,
      missingVectorCount,
    };
    json ? printJson(result) : console.log(`dry-run chunks=${chunks.length} reusable=${previousVectors.size} missing=${missingVectorCount}`);
    return;
  }

  const embeddedChunks = await embedDocuments(chunks, { previousVectors });
  const qdrantResult = syncQdrant ? await syncCodeMemoryToQdrant(embeddedChunks) : { status: "not-configured" as const };
  const manifest = await writeCodeMemoryStore(embeddedChunks, previousManifest, qdrantResult.status, qdrantResult.qdrant);

  const result = {
    indexed: true,
    totalFiles: manifest.totalFiles,
    totalChunks: manifest.totalChunks,
    embeddedChunks: manifest.embeddedChunks,
    qdrant: manifest.storage.qdrant,
    diff: manifest.diff,
  };

  json ? printJson(result) : console.log(`indexed chunks=${manifest.totalChunks} files=${manifest.totalFiles} qdrant=${manifest.storage.qdrant}`);
}

export async function runCodeMemorySearch(args: string[]): Promise<void> {
  const query = readArgValue(args, "--query") ?? args.filter((arg) => !arg.startsWith("--")).join(" ");
  const limit = Number(readArgValue(args, "--limit") ?? 10);
  const json = hasFlag(args, "--json");
  const textOnly = hasFlag(args, "--text-only");

  if (!query.trim()) {
    throw new Error("Search query is required. Use --query=\"...\".");
  }

  let queryVector: number[] | undefined;
  if (!textOnly) {
    try {
      queryVector = await embedQuery(query);
    } catch {
      queryVector = undefined;
    }
  }

  const results = await searchCodeMemory(query, queryVector, limit);
  if (json) {
    printJson({ query, mode: queryVector ? "hybrid" : "text-only", results });
    return;
  }

  console.log(`mode=${queryVector ? "hybrid" : "text-only"} results=${results.length}`);
  for (const result of results) {
    console.log(`${result.score.toFixed(4)} ${result.path}:${result.chunkIndex} ${result.reason}`);
    console.log(result.summary);
  }
}

export async function runCodeMemoryStatus(args: string[]): Promise<void> {
  const health = await collectCodeMemoryHealth();
  if (hasFlag(args, "--json")) {
    printJson(health);
    return;
  }
  console.log(`exists=${health.exists}`);
  console.log(`stale=${health.stale}`);
  console.log(`chunks=${health.totalChunks}`);
  console.log(`coverage=${(health.coverageRate * 100).toFixed(1)}%`);
  console.log(health.message);
}

export async function runCodeMemoryVerify(args: string[]): Promise<void> {
  const health = await collectCodeMemoryHealth();
  if (!health.exists) {
    throw new Error("Code memory has not been indexed.");
  }
  if (health.stale) {
    throw new Error(`Code memory is stale. missing=${health.missingChunks} deleted=${health.deletedChunks} changedFiles=${health.changedFiles}`);
  }
  if (health.coverageRate < 1) {
    throw new Error(`Code memory coverage is incomplete: ${(health.coverageRate * 100).toFixed(1)}%.`);
  }

  const results = await searchCodeMemory("agent bootstrap verify memory", undefined, 1);
  if (results.length === 0) {
    throw new Error("Code memory text search returned no results.");
  }

  if (hasFlag(args, "--json")) {
    printJson({ verified: true, health, searchResult: results[0] });
    return;
  }

  console.log("Code memory verification passed.");
}

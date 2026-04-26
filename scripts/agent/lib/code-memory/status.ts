import { CODE_MEMORY_MANIFEST_PATH } from "./config";
import { discoverCodeMemoryChunks } from "./discovery";
import type { CodeMemoryHealth } from "./types";
import { fileExists } from "../utils";
import { readCodeMemoryManifest } from "./store";

export async function collectCodeMemoryHealth(): Promise<CodeMemoryHealth> {
  if (!fileExists(CODE_MEMORY_MANIFEST_PATH)) {
    return {
      exists: false,
      stale: false,
      generatedAt: null,
      totalFiles: 0,
      totalChunks: 0,
      embeddedChunks: 0,
      coverageRate: 0,
      missingChunks: 0,
      deletedChunks: 0,
      changedFiles: 0,
      storage: null,
      qdrantCollection: null,
      message: "Code memory has not been indexed yet.",
    };
  }

  const manifest = await readCodeMemoryManifest();
  if (!manifest) {
    return {
      exists: false,
      stale: true,
      generatedAt: null,
      totalFiles: 0,
      totalChunks: 0,
      embeddedChunks: 0,
      coverageRate: 0,
      missingChunks: 0,
      deletedChunks: 0,
      changedFiles: 0,
      storage: null,
      qdrantCollection: null,
      message: "Code memory manifest is unreadable.",
    };
  }

  const currentChunks = await discoverCodeMemoryChunks();
  const currentIds = new Set(currentChunks.map((chunk) => chunk.id));
  const manifestIds = new Set(manifest.chunkIds);
  const missingChunks = [...currentIds].filter((id) => !manifestIds.has(id)).length;
  const deletedChunks = [...manifestIds].filter((id) => !currentIds.has(id)).length;
  const changedFiles = new Set(
    currentChunks
      .filter((chunk) => manifest.fileHashes[chunk.path] !== chunk.fileHash)
      .map((chunk) => chunk.path),
  ).size;
  const stale = missingChunks > 0 || deletedChunks > 0 || changedFiles > 0;
  const coverageRate = manifest.totalChunks === 0 ? 0 : manifest.embeddedChunks / manifest.totalChunks;

  return {
    exists: true,
    stale,
    generatedAt: manifest.generatedAt,
    totalFiles: manifest.totalFiles,
    totalChunks: manifest.totalChunks,
    embeddedChunks: manifest.embeddedChunks,
    coverageRate,
    missingChunks,
    deletedChunks,
    changedFiles,
    storage: manifest.storage,
    qdrantCollection: manifest.qdrant?.collection ?? null,
    message: stale ? "Code memory is stale." : "Code memory is current.",
  };
}

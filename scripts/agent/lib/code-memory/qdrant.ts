import { QdrantClient } from "@qdrant/js-client-rest";

import { CODE_MEMORY_QDRANT_COLLECTION } from "./config";
import { qdrantPointId } from "./hashing";
import type { CodeMemoryChunk, CodeMemoryManifest } from "./types";

function getQdrantConfig(): { url: string; apiKey?: string; collection: string } | null {
  const url = process.env.QDRANT_URL;
  if (!url) {
    return null;
  }
  return {
    url,
    apiKey: process.env.QDRANT_API_KEY,
    collection: process.env.AGENT_CODE_MEMORY_QDRANT_COLLECTION || CODE_MEMORY_QDRANT_COLLECTION,
  };
}

async function ensurePayloadIndex(client: QdrantClient, collection: string, fieldName: string): Promise<void> {
  try {
    await client.createPayloadIndex(collection, {
      field_name: fieldName,
      field_schema: "keyword",
    });
  } catch {
    // Existing indexes and unsupported remote policies should not block local memory.
  }
}

export async function syncCodeMemoryToQdrant(chunks: CodeMemoryChunk[], deletedChunkIds: string[] = []): Promise<{
  status: CodeMemoryManifest["storage"]["qdrant"];
  qdrant?: CodeMemoryManifest["qdrant"];
}> {
  const config = getQdrantConfig();
  if (!config) {
    return { status: "not-configured" };
  }

  try {
    const client = new QdrantClient({ url: config.url, apiKey: config.apiKey });
    const vectorSize = chunks.find((chunk) => chunk.embedding)?.embedding?.length ?? 0;
    if (vectorSize === 0) {
      throw new Error("No vectors available for Qdrant sync.");
    }

    try {
      await client.getCollection(config.collection);
    } catch {
      await client.createCollection(config.collection, {
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      });
    }

    await Promise.all([
      ensurePayloadIndex(client, config.collection, "path"),
      ensurePayloadIndex(client, config.collection, "type"),
      ensurePayloadIndex(client, config.collection, "fileHash"),
      ensurePayloadIndex(client, config.collection, "chunkHash"),
      ensurePayloadIndex(client, config.collection, "discoveredAt"),
    ]);

    if (deletedChunkIds.length > 0) {
      await client.delete(config.collection, {
        wait: true,
        points: deletedChunkIds.map(qdrantPointId),
      });
    }

    await client.upsert(config.collection, {
      wait: true,
      points: chunks
        .filter((chunk) => chunk.embedding && chunk.embedding.length > 0)
        .map((chunk) => ({
          id: qdrantPointId(chunk.id),
          vector: chunk.embedding,
          payload: {
            id: chunk.id,
            path: chunk.path,
            type: chunk.type,
            chunkIndex: chunk.chunkIndex,
            totalChunks: chunk.totalChunks,
            summary: chunk.summary,
            content: chunk.content,
            fileHash: chunk.fileHash,
            chunkHash: chunk.chunkHash,
            discoveredAt: chunk.discoveredAt,
          },
        })),
    });

    return {
      status: "synced",
      qdrant: {
        collection: config.collection,
        syncedAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: "failed",
      qdrant: {
        collection: config.collection,
        error: message,
      },
    };
  }
}

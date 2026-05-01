import type {
  PersistentMemoryRecord,
  PersistentMemoryVectorCapability,
  VectorIndexTarget,
  VectorIndexAdapter,
  VectorIndexRebuildResult,
} from "./types";

export const PERSISTENT_MEMORY_VECTOR_CAPABILITIES: Record<
  VectorIndexTarget,
  readonly PersistentMemoryVectorCapability[]
> = {
  "weaviate-primary": [
    "lexical_bm25",
    "dense_vector",
    "metadata_filtering",
    "application_rrf",
    "application_mmr",
    "conditional_reranking",
  ],
  "qdrant-shadow": [
    "named_vectors",
    "dense_vector",
    "sparse_vectors",
    "multi_vector",
    "payload_filtering",
    "collection_aliases",
    "atomic_alias_switch",
  ],
};

export function getPersistentMemoryVectorCapabilities(
  target: VectorIndexTarget,
): readonly PersistentMemoryVectorCapability[] {
  return PERSISTENT_MEMORY_VECTOR_CAPABILITIES[target];
}

export function supportsPersistentMemoryVectorCapability(
  target: VectorIndexTarget,
  capability: PersistentMemoryVectorCapability,
): boolean {
  return getPersistentMemoryVectorCapabilities(target).includes(capability);
}

export class InMemoryVectorIndexAdapter implements VectorIndexAdapter {
  readonly target: VectorIndexTarget;
  readonly capabilities: readonly PersistentMemoryVectorCapability[];
  readonly indexed = new Map<string, PersistentMemoryRecord>();
  readonly vectors = new Map<string, number[]>();

  constructor(target: VectorIndexTarget = "weaviate-primary") {
    this.target = target;
    this.capabilities = getPersistentMemoryVectorCapabilities(target);
  }

  async upsertMemory(
    memory: PersistentMemoryRecord,
    vector: number[] = [],
  ): Promise<void> {
    this.indexed.set(memory.id, memory);
    this.vectors.set(memory.id, vector);
  }

  async rebuild(
    memories: PersistentMemoryRecord[],
  ): Promise<VectorIndexRebuildResult> {
    this.indexed.clear();
    this.vectors.clear();
    for (const memory of memories) {
      this.indexed.set(memory.id, memory);
    }

    return {
      upserted: memories.length,
      sourceMemoryIds: memories.map((memory) => memory.id),
    };
  }
}


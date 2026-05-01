import type {
  PersistentMemoryRecord,
  VectorIndexAdapter,
  VectorIndexRebuildResult,
} from "./types";

export class InMemoryVectorIndexAdapter implements VectorIndexAdapter {
  readonly indexed = new Map<string, PersistentMemoryRecord>();

  async upsertMemory(memory: PersistentMemoryRecord): Promise<void> {
    this.indexed.set(memory.id, memory);
  }

  async rebuild(
    memories: PersistentMemoryRecord[],
  ): Promise<VectorIndexRebuildResult> {
    this.indexed.clear();
    for (const memory of memories) {
      this.indexed.set(memory.id, memory);
    }

    return {
      upserted: memories.length,
      sourceMemoryIds: memories.map((memory) => memory.id),
    };
  }
}


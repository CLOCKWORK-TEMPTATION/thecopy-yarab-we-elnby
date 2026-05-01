import { randomUUID } from "node:crypto";

import type {
  AuditLogEntry,
  ConsolidationLogEntry,
  EmbeddingModelVersion,
  InjectionQuarantineRecord,
  JobRun,
  MemoryCandidate,
  PersistentMemoryRecord,
  PersistentMemoryStore,
  PersistentRawEvent,
  RetrievalEvent,
  SecretScanEvent,
} from "./types";

function now(): string {
  return new Date().toISOString();
}

function withIdentity<T extends object>(entry: T): T & { id: string; createdAt: string } {
  return {
    ...entry,
    id: randomUUID(),
    createdAt: now(),
  };
}

export class InMemoryPersistentMemoryStore implements PersistentMemoryStore {
  readonly modelVersions: EmbeddingModelVersion[] = [];
  readonly rawEvents: PersistentRawEvent[] = [];
  readonly secretScanEvents: SecretScanEvent[] = [];
  readonly memoryCandidates: MemoryCandidate[] = [];
  readonly memories: PersistentMemoryRecord[] = [];
  readonly jobRuns: JobRun[] = [];
  readonly retrievalEvents: RetrievalEvent[] = [];
  readonly auditLog: AuditLogEntry[] = [];
  readonly injectionQuarantine: InjectionQuarantineRecord[] = [];
  readonly consolidationLog: ConsolidationLogEntry[] = [];

  async upsertModelVersion(
    modelVersion: EmbeddingModelVersion,
  ): Promise<EmbeddingModelVersion> {
    const existingIndex = this.modelVersions.findIndex(
      (stored) =>
        stored.provider === modelVersion.provider &&
        stored.model === modelVersion.model &&
        stored.version === modelVersion.version,
    );
    if (existingIndex >= 0) {
      this.modelVersions[existingIndex] = modelVersion;
      return modelVersion;
    }

    this.modelVersions.push(modelVersion);
    return modelVersion;
  }

  async listModelVersions(): Promise<EmbeddingModelVersion[]> {
    return [...this.modelVersions];
  }

  async insertRawEvent(
    event: Omit<PersistentRawEvent, "id" | "createdAt">,
  ): Promise<PersistentRawEvent> {
    const stored = withIdentity(event);
    this.rawEvents.push(stored);
    return stored;
  }

  async insertSecretScanEvent(
    event: Omit<SecretScanEvent, "id" | "createdAt">,
  ): Promise<SecretScanEvent> {
    const stored = withIdentity(event);
    this.secretScanEvents.push(stored);
    return stored;
  }

  async insertMemoryCandidate(
    candidate: Omit<MemoryCandidate, "id" | "createdAt">,
  ): Promise<MemoryCandidate> {
    const stored = withIdentity(candidate);
    this.memoryCandidates.push(stored);
    return stored;
  }

  async insertMemory(
    memory: Omit<PersistentMemoryRecord, "id" | "createdAt">,
  ): Promise<PersistentMemoryRecord> {
    const timestamp = now();
    const stored = {
      ...memory,
      id: randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.memories.push(stored);
    return stored;
  }

  async insertJobRun(job: Omit<JobRun, "id" | "createdAt">): Promise<JobRun> {
    const stored = withIdentity(job);
    this.jobRuns.push(stored);
    return stored;
  }

  async insertRetrievalEvent(
    event: Omit<RetrievalEvent, "id" | "createdAt">,
  ): Promise<RetrievalEvent> {
    const stored = withIdentity(event);
    this.retrievalEvents.push(stored);
    return stored;
  }

  async insertAuditLog(
    entry: Omit<AuditLogEntry, "id" | "createdAt">,
  ): Promise<AuditLogEntry> {
    const stored = withIdentity(entry);
    this.auditLog.push(stored);
    return stored;
  }

  async insertInjectionQuarantine(
    entry: Omit<InjectionQuarantineRecord, "id" | "createdAt">,
  ): Promise<InjectionQuarantineRecord> {
    const stored = withIdentity(entry);
    this.injectionQuarantine.push(stored);
    return stored;
  }

  async insertConsolidationLog(
    entry: Omit<ConsolidationLogEntry, "id" | "createdAt">,
  ): Promise<ConsolidationLogEntry> {
    const stored = withIdentity(entry);
    this.consolidationLog.push(stored);
    return stored;
  }

  async purgeBySourceRef(
    sourceRef: string,
  ): Promise<{ rawEvents: number; memories: PersistentMemoryRecord[] }> {
    let purgedRawEvents = 0;
    for (const rawEvent of this.rawEvents) {
      if (rawEvent.sourceRef === sourceRef && rawEvent.sanitizedContent !== null) {
        rawEvent.sanitizedContent = null;
        rawEvent.secretScanStatus = "quarantined";
        rawEvent.rejectedReason = "purged_by_memory_secret_policy";
        purgedRawEvents += 1;
      }
    }

    const purgedMemories: PersistentMemoryRecord[] = [];
    for (const memory of this.memories) {
      if (memory.sourceRef === sourceRef && !memory.archived) {
        memory.archived = true;
        memory.quarantined = true;
        memory.updatedAt = now();
        purgedMemories.push(memory);
      }
    }

    return {
      rawEvents: purgedRawEvents,
      memories: purgedMemories,
    };
  }

  async listMemories(): Promise<PersistentMemoryRecord[]> {
    return this.memories.filter(
      (memory) => !memory.archived && !memory.quarantined,
    );
  }
}

import { randomUUID } from "node:crypto";

import type {
  AuditLogEntry,
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
  readonly rawEvents: PersistentRawEvent[] = [];
  readonly secretScanEvents: SecretScanEvent[] = [];
  readonly memoryCandidates: MemoryCandidate[] = [];
  readonly memories: PersistentMemoryRecord[] = [];
  readonly jobRuns: JobRun[] = [];
  readonly retrievalEvents: RetrievalEvent[] = [];
  readonly auditLog: AuditLogEntry[] = [];

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
    const stored = withIdentity(memory);
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

  async listMemories(): Promise<PersistentMemoryRecord[]> {
    return [...this.memories];
  }
}


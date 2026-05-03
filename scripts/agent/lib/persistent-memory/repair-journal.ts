import { promises as fsp } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

import { fromRepoRoot, writeTextIfChanged } from "../utils";

export type RepairJobKind =
  | "turn_context_replay"
  | "audit_replay"
  | "vector_repair"
  | "file_write_replay";

export type RepairJobStatus = "pending" | "completed" | "failed";

export interface RepairJobInput {
  sessionId: string;
  turnId?: string;
  kind: RepairJobKind;
  reason: string;
  metadata?: Record<string, unknown>;
}

export interface RepairJob extends RepairJobInput {
  id: string;
  status: RepairJobStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RepairJournal {
  enqueue(job: RepairJobInput): Promise<RepairJob>;
  markCompleted(jobId: string): Promise<RepairJob>;
  listPending(sessionId?: string): Promise<RepairJob[]>;
}

function now(): string {
  return new Date().toISOString();
}

export class InMemoryRepairJournal implements RepairJournal {
  protected readonly jobs: RepairJob[] = [];

  async enqueue(job: RepairJobInput): Promise<RepairJob> {
    const timestamp = now();
    const stored: RepairJob = {
      ...job,
      id: randomUUID(),
      status: "pending",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.jobs.push(stored);
    return stored;
  }

  async markCompleted(jobId: string): Promise<RepairJob> {
    const job = this.jobs.find((entry) => entry.id === jobId);
    if (!job) {
      throw new Error(`Repair job does not exist: ${jobId}`);
    }

    job.status = "completed";
    job.updatedAt = now();
    return job;
  }

  async listPending(sessionId?: string): Promise<RepairJob[]> {
    return this.jobs.filter(
      (job) =>
        job.status === "pending" &&
        (!sessionId || job.sessionId === sessionId),
    );
  }

  protected serialize(): RepairJob[] {
    return [...this.jobs];
  }

  protected load(jobs: RepairJob[]): void {
    this.jobs.splice(0, this.jobs.length, ...jobs);
  }
}

export class FileRepairJournal extends InMemoryRepairJournal {
  constructor(
    private readonly filePath = fromRepoRoot(
      ".repo-agent/PERSISTENT-MEMORY-REPAIR-JOURNAL.json",
    ),
  ) {
    super();
  }

  async hydrate(): Promise<void> {
    try {
      this.load(JSON.parse(await fsp.readFile(this.filePath, "utf8")) as RepairJob[]);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  async persist(): Promise<void> {
    await fsp.mkdir(dirname(this.filePath), { recursive: true });
    await writeTextIfChanged(
      this.filePath,
      `${JSON.stringify(this.serialize(), null, 2)}\n`,
    );
  }
}

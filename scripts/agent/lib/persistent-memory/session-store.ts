import { promises as fsp } from "node:fs";
import { dirname } from "node:path";

import { PERSISTENT_MEMORY_SESSION_STATE_PATH } from "../constants";
import { fromRepoRoot, writeTextIfChanged } from "../utils";
import type { TurnMemoryContext } from "./turn-context";

export type AgentSessionRole = "user" | "assistant" | "system";

export interface AgentSessionItem {
  id: string;
  sessionId: string;
  role: AgentSessionRole;
  contentRef: string;
  content: string;
  tags?: string[];
  createdAt?: string;
}

export interface MarkTurnStartedInput {
  sessionId: string;
  rawQueryForRepair?: string;
  queryHash?: string;
  redactedQueryPreview?: string;
}

export interface AgentTurnRecord {
  turnId: string;
  sessionId: string;
  rawQueryForRepair?: string;
  queryHash?: string;
  redactedQueryPreview?: string;
  turnContextStatus?: "ready" | "degraded";
  selectedIntent?: string;
  selectedProfile?: string;
  retrievalEventId?: string | null;
  auditEventId?: string | null;
  memoryContext?: string;
  latencyMs?: number;
  answerRef?: string;
  closed?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompactSessionOptions {
  keepLast?: number;
}

export interface AgentSessionStore {
  getSessionItems(sessionId: string): Promise<AgentSessionItem[]>;
  appendSessionItems(
    sessionId: string,
    items: AgentSessionItem[],
  ): Promise<void>;
  getRecentTurns(sessionId: string, limit: number): Promise<AgentSessionItem[]>;
  markTurnStarted(
    turnId: string,
    input: MarkTurnStartedInput,
  ): Promise<AgentTurnRecord>;
  markTurnContextBuilt(
    turnId: string,
    context: TurnMemoryContext,
  ): Promise<AgentTurnRecord>;
  markTurnAnswered(turnId: string, answerRef: string): Promise<AgentTurnRecord>;
  markTurnClosed(turnId: string): Promise<AgentTurnRecord>;
  findIncompleteTurns(sessionId: string): Promise<AgentTurnRecord[]>;
  getTurnContextRecord(turnId: string): Promise<AgentTurnRecord | undefined>;
  listTurnRecords(sessionId: string): Promise<AgentTurnRecord[]>;
  compactSession(
    sessionId: string,
    options?: CompactSessionOptions,
  ): Promise<void>;
}

interface SerializedSessionStore {
  items: AgentSessionItem[];
  turns: AgentTurnRecord[];
}

function now(): string {
  return new Date().toISOString();
}

function contextToRecord(
  existing: AgentTurnRecord,
  context: TurnMemoryContext,
): AgentTurnRecord {
  const timestamp = now();
  return {
    ...existing,
    queryHash: context.queryHash,
    redactedQueryPreview: context.redactedQueryPreview,
    turnContextStatus: context.turnContextStatus,
    selectedIntent: context.selectedIntent,
    selectedProfile: context.selectedProfile,
    retrievalEventId: context.retrievalEventId,
    auditEventId: context.auditEventId,
    memoryContext: context.envelope.items
      .map((item) => `${item.sourceRef}:${item.id}`)
      .join("\n") || "none",
    latencyMs: context.latencyMs,
    updatedAt: timestamp,
  };
}

function isProtectedSessionItem(item: AgentSessionItem): boolean {
  return Boolean(
    item.tags?.some((tag) => tag === "decision" || tag === "constraint"),
  );
}

function isTurnIncomplete(turn: AgentTurnRecord): boolean {
  return (
    !turn.turnContextStatus ||
    !turn.queryHash ||
    !turn.selectedIntent ||
    !turn.retrievalEventId ||
    !turn.auditEventId ||
    !turn.memoryContext
  );
}

export class InMemoryAgentSessionStore implements AgentSessionStore {
  protected readonly items: AgentSessionItem[] = [];
  protected readonly turns = new Map<string, AgentTurnRecord>();

  async getSessionItems(sessionId: string): Promise<AgentSessionItem[]> {
    return this.items.filter((item) => item.sessionId === sessionId);
  }

  async appendSessionItems(
    sessionId: string,
    items: AgentSessionItem[],
  ): Promise<void> {
    for (const item of items) {
      this.items.push({
        ...item,
        sessionId,
        createdAt: item.createdAt ?? now(),
      });
    }
  }

  async getRecentTurns(
    sessionId: string,
    limit: number,
  ): Promise<AgentSessionItem[]> {
    return (await this.getSessionItems(sessionId)).slice(-limit);
  }

  async markTurnStarted(
    turnId: string,
    input: MarkTurnStartedInput,
  ): Promise<AgentTurnRecord> {
    const timestamp = now();
    const existing = this.turns.get(turnId);
    const record: AgentTurnRecord = {
      ...existing,
      turnId,
      sessionId: input.sessionId,
      rawQueryForRepair: input.rawQueryForRepair,
      queryHash: input.queryHash ?? existing?.queryHash,
      redactedQueryPreview:
        input.redactedQueryPreview ?? existing?.redactedQueryPreview,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    this.turns.set(turnId, record);
    return record;
  }

  async markTurnContextBuilt(
    turnId: string,
    context: TurnMemoryContext,
  ): Promise<AgentTurnRecord> {
    const existing = this.turns.get(turnId);
    if (!existing) {
      throw new Error(`Turn does not exist: ${turnId}`);
    }

    const record = contextToRecord(existing, context);
    this.turns.set(turnId, record);
    return record;
  }

  async markTurnAnswered(
    turnId: string,
    answerRef: string,
  ): Promise<AgentTurnRecord> {
    const existing = this.turns.get(turnId);
    if (!existing) {
      throw new Error(`Turn does not exist: ${turnId}`);
    }

    const record = {
      ...existing,
      answerRef,
      updatedAt: now(),
    };
    this.turns.set(turnId, record);
    return record;
  }

  async markTurnClosed(turnId: string): Promise<AgentTurnRecord> {
    const existing = this.turns.get(turnId);
    if (!existing) {
      throw new Error(`Turn does not exist: ${turnId}`);
    }

    const record = {
      ...existing,
      closed: true,
      updatedAt: now(),
    };
    this.turns.set(turnId, record);
    return record;
  }

  async findIncompleteTurns(sessionId: string): Promise<AgentTurnRecord[]> {
    return (await this.listTurnRecords(sessionId)).filter(isTurnIncomplete);
  }

  async getTurnContextRecord(
    turnId: string,
  ): Promise<AgentTurnRecord | undefined> {
    return this.turns.get(turnId);
  }

  async listTurnRecords(sessionId: string): Promise<AgentTurnRecord[]> {
    return [...this.turns.values()].filter(
      (turn) => turn.sessionId === sessionId,
    );
  }

  async compactSession(
    sessionId: string,
    options: CompactSessionOptions = {},
  ): Promise<void> {
    const keepLast = options.keepLast ?? 20;
    const sessionItems = await this.getSessionItems(sessionId);
    const protectedIds = new Set(
      sessionItems.filter(isProtectedSessionItem).map((item) => item.id),
    );
    const keptRecentIds = new Set(
      sessionItems.slice(-keepLast).map((item) => item.id),
    );

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      if (
        item.sessionId === sessionId &&
        !protectedIds.has(item.id) &&
        !keptRecentIds.has(item.id)
      ) {
        this.items.splice(index, 1);
      }
    }
  }

  protected serialize(): SerializedSessionStore {
    return {
      items: [...this.items],
      turns: [...this.turns.values()],
    };
  }

  protected load(data: SerializedSessionStore): void {
    this.items.splice(0, this.items.length, ...(data.items ?? []));
    this.turns.clear();
    for (const turn of data.turns ?? []) {
      this.turns.set(turn.turnId, turn);
    }
  }
}

export class FileAgentSessionStore extends InMemoryAgentSessionStore {
  constructor(
    private readonly filePath = fromRepoRoot(PERSISTENT_MEMORY_SESSION_STATE_PATH),
  ) {
    super();
  }

  async hydrate(): Promise<void> {
    try {
      const content = await fsp.readFile(this.filePath, "utf8");
      this.load(JSON.parse(content) as SerializedSessionStore);
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

export type PostgresAgentSessionStore = AgentSessionStore;

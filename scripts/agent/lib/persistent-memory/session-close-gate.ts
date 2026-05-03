import {
  InMemoryRepairJournal,
  type RepairJournal,
  type RepairJob,
} from "./repair-journal";
import type {
  AgentSessionStore,
  AgentTurnRecord,
} from "./session-store";
import {
  buildTurnMemoryContext,
  renderTurnMemoryContext,
  type TurnMemoryContext,
} from "./turn-context";

export interface MissingTurnFields {
  turnId: string;
  fields: string[];
}

export interface SessionCloseReport {
  sessionId: string;
  closable: boolean;
  missing: MissingTurnFields[];
  pendingRepairJobs: RepairJob[];
}

export interface SessionRepairReport {
  sessionId: string;
  repairedTurns: string[];
  unrepairedTurns: string[];
}

export interface BuildContextForTurnInput {
  turn: AgentTurnRecord;
  query: string;
}

export interface SessionCloseGateOptions {
  store: AgentSessionStore;
  repairJournal?: RepairJournal;
  buildContext?: (input: BuildContextForTurnInput) => Promise<TurnMemoryContext>;
}

const REQUIRED_FIELDS: Array<{
  outputName: string;
  isMissing(turn: AgentTurnRecord): boolean;
}> = [
  {
    outputName: "turn_context_status",
    isMissing: (turn) => !turn.turnContextStatus,
  },
  {
    outputName: "query_hash",
    isMissing: (turn) => !turn.queryHash,
  },
  {
    outputName: "selected_intent",
    isMissing: (turn) => !turn.selectedIntent,
  },
  {
    outputName: "retrieval_event_id",
    isMissing: (turn) => !turn.retrievalEventId,
  },
  {
    outputName: "audit_event_id",
    isMissing: (turn) => !turn.auditEventId,
  },
  {
    outputName: "memory_context",
    isMissing: (turn) => !turn.memoryContext,
  },
];

function missingFields(turn: AgentTurnRecord): string[] {
  return REQUIRED_FIELDS.filter((field) => field.isMissing(turn)).map(
    (field) => field.outputName,
  );
}

function defaultBuildContext(
  input: BuildContextForTurnInput,
): Promise<TurnMemoryContext> {
  return buildTurnMemoryContext({ query: input.query });
}

export class SessionCloseGate {
  private readonly store: AgentSessionStore;
  private readonly repairJournal: RepairJournal;
  private readonly buildContext: (
    input: BuildContextForTurnInput,
  ) => Promise<TurnMemoryContext>;

  constructor(options: SessionCloseGateOptions) {
    this.store = options.store;
    this.repairJournal = options.repairJournal ?? new InMemoryRepairJournal();
    this.buildContext = options.buildContext ?? defaultBuildContext;
  }

  async inspectSession(sessionId: string): Promise<SessionCloseReport> {
    const turns = await this.store.listTurnRecords(sessionId);
    const missing = turns
      .map((turn) => ({
        turnId: turn.turnId,
        fields: missingFields(turn),
      }))
      .filter((entry) => entry.fields.length > 0);
    const pendingRepairJobs = await this.repairJournal.listPending(sessionId);

    return {
      sessionId,
      closable: missing.length === 0 && pendingRepairJobs.length === 0,
      missing,
      pendingRepairJobs,
    };
  }

  async repairMissingTurns(sessionId: string): Promise<SessionRepairReport> {
    const repairedTurns: string[] = [];
    const unrepairedTurns: string[] = [];

    for (const turn of await this.store.findIncompleteTurns(sessionId)) {
      const query = turn.rawQueryForRepair ?? turn.redactedQueryPreview;
      if (!query) {
        await this.repairJournal.enqueue({
          sessionId,
          turnId: turn.turnId,
          kind: "turn_context_replay",
          reason: "missing query for turn context repair",
        });
        unrepairedTurns.push(turn.turnId);
        continue;
      }

      const context = await this.buildContext({ turn, query });
      await this.store.markTurnContextBuilt(turn.turnId, context);
      repairedTurns.push(turn.turnId);
    }

    return {
      sessionId,
      repairedTurns,
      unrepairedTurns,
    };
  }

  async assertSessionClosable(sessionId: string): Promise<SessionCloseReport> {
    const report = await this.inspectSession(sessionId);
    if (!report.closable) {
      throw new Error(
        `Persistent memory session is not closable: ${JSON.stringify({
          missing: report.missing,
          pendingRepairJobs: report.pendingRepairJobs.map((job) => job.id),
        })}`,
      );
    }

    return report;
  }
}

export function renderSessionCloseReport(report: SessionCloseReport): string {
  const lines = [
    "# Persistent Memory Session Close Report",
    "",
    `session_id: ${report.sessionId}`,
    `closable: ${report.closable}`,
    "",
    "## Missing Fields",
    "",
  ];

  if (report.missing.length === 0) {
    lines.push("- none");
  } else {
    for (const item of report.missing) {
      lines.push(`- turn_id: ${item.turnId}`, `  fields: ${item.fields.join(", ")}`);
    }
  }

  lines.push("", "## Pending Repair Jobs", "");
  if (report.pendingRepairJobs.length === 0) {
    lines.push("- none");
  } else {
    for (const job of report.pendingRepairJobs) {
      lines.push(
        `- id: ${job.id}`,
        `  kind: ${job.kind}`,
        `  status: ${job.status}`,
        `  reason: ${job.reason}`,
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function renderTurnContextForCloseGate(context: TurnMemoryContext): string {
  return renderTurnMemoryContext(context);
}

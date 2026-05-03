import { getMemoryBudgetProfile } from "./budgets";
import type { PersistentMemorySystem } from "./index";
import type {
  MemoryRetrievalResult,
  QueryIntent,
} from "./types";

export interface PersistentMemoryRetrieverOptions {
  system: PersistentMemorySystem;
}

export interface RetrieveForTurnInput {
  query: string;
  intent: QueryIntent;
  budget?: number;
}

export class PersistentMemoryRetriever {
  constructor(private readonly options: PersistentMemoryRetrieverOptions) {}

  retrieveForTurn(input: RetrieveForTurnInput): Promise<MemoryRetrievalResult> {
    const profile = getMemoryBudgetProfile(input.intent);
    const budgetWeight = Object.values(profile).reduce(
      (sum, value) => sum + value,
      0,
    );
    const topK = input.budget ?? Math.max(3, Math.min(8, Math.round(budgetWeight / 20)));

    return this.options.system.retrieve({
      query: input.query,
      intent: input.intent,
      topK,
    });
  }

  retrieveStartupConstraints(): Promise<MemoryRetrievalResult> {
    return this.options.system.retrieve({
      query: "سياق البداية قيود حاكمة memory_context سياق سؤال حي",
      intent: "avoid_repetition_or_follow_constraints",
      topK: 3,
    });
  }

  retrieveRecentSessionContext(sessionId: string): Promise<MemoryRetrievalResult> {
    return this.options.system.retrieve({
      query: `session ${sessionId} recent turn context state`,
      intent: "continue_from_last_session",
      topK: 5,
    });
  }
}

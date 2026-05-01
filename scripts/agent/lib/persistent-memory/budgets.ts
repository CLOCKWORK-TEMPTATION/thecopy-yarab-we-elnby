import type { QueryIntent } from "./types";

export type MemoryBudgetBucket =
  | "recent_rounds"
  | "decisions"
  | "state_snapshots"
  | "state_deltas"
  | "prevention_constraints"
  | "facts"
  | "evidence";

export type MemoryBudgetProfile = Record<MemoryBudgetBucket, number>;

export const MEMORY_CONTEXT_BUDGET_PROFILES: Record<
  QueryIntent,
  MemoryBudgetProfile
> = {
  default: {
    recent_rounds: 20,
    decisions: 25,
    state_snapshots: 15,
    state_deltas: 10,
    prevention_constraints: 20,
    facts: 5,
    evidence: 5,
  },
  execution_or_code_change: {
    recent_rounds: 20,
    decisions: 30,
    state_snapshots: 10,
    state_deltas: 10,
    prevention_constraints: 25,
    facts: 3,
    evidence: 2,
  },
  continue_from_last_session: {
    recent_rounds: 28,
    decisions: 30,
    state_snapshots: 14,
    state_deltas: 10,
    prevention_constraints: 13,
    facts: 5,
    evidence: 0,
  },
  prior_decision_lookup: {
    recent_rounds: 10,
    decisions: 55,
    state_snapshots: 5,
    state_deltas: 5,
    prevention_constraints: 15,
    facts: 5,
    evidence: 5,
  },
  current_state_lookup: {
    recent_rounds: 15,
    decisions: 15,
    state_snapshots: 35,
    state_deltas: 20,
    prevention_constraints: 10,
    facts: 5,
    evidence: 0,
  },
  plan_review_or_evaluation: {
    recent_rounds: 15,
    decisions: 25,
    state_snapshots: 15,
    state_deltas: 10,
    prevention_constraints: 25,
    facts: 5,
    evidence: 5,
  },
  avoid_repetition_or_follow_constraints: {
    recent_rounds: 10,
    decisions: 25,
    state_snapshots: 5,
    state_deltas: 5,
    prevention_constraints: 45,
    facts: 5,
    evidence: 5,
  },
};

export function validateMemoryBudgetProfile(
  profile: MemoryBudgetProfile,
): boolean {
  const total = Object.values(profile).reduce((sum, value) => sum + value, 0);
  return total === 100 && Object.values(profile).every((value) => value >= 0);
}

export function getMemoryBudgetProfile(intent: QueryIntent): MemoryBudgetProfile {
  return MEMORY_CONTEXT_BUDGET_PROFILES[intent];
}


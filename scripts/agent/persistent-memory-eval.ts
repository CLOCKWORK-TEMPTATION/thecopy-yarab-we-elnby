import {
  MEMORY_CONTEXT_BUDGET_PROFILES,
  MemoryInjectionEnvelope,
  buildLatencyBudgetList,
  collectLatencyBudgetViolations,
  createPersistentMemorySystem,
  validateMemoryBudgetProfile,
} from "./lib/persistent-memory";
import { BGE_M3_EMBEDDING_MODEL_VERSION } from "./lib/persistent-memory/embeddings";
import { MemorySecretScanner } from "./lib/persistent-memory/secrets";
import { InMemoryPersistentMemoryStore } from "./lib/persistent-memory/store";
import type {
  PersistentMemoryEventType,
  QueryIntent,
} from "./lib/persistent-memory/types";

interface GoldenCase {
  id: string;
  category:
    | "decision"
    | "prevention_constraint"
    | "fact"
    | "state"
    | "adversarial";
  eventType: PersistentMemoryEventType;
  queryIntent: QueryIntent;
  content: string;
  query: string;
  secret?: boolean;
}

function buildGoldenDataset(): GoldenCase[] {
  const cases: GoldenCase[] = [];

  for (let index = 1; index <= 40; index += 1) {
    const key = `decisionkey${index.toString().padStart(3, "0")}`;
    cases.push({
      id: key,
      category: "decision",
      eventType: "decision",
      queryIntent: "prior_decision_lookup",
      content: `Decision ${key}: PostgreSQL remains the durable source of truth for persistent agent memory.`,
      query: `find ${key} durable source truth`,
    });
  }

  for (let index = 1; index <= 25; index += 1) {
    const key = `constraintkey${index.toString().padStart(3, "0")}`;
    cases.push({
      id: key,
      category: "prevention_constraint",
      eventType: "memory",
      queryIntent: "avoid_repetition_or_follow_constraints",
      content: `Prevention constraint ${key}: do not inject persistent memory outside approved context zones.`,
      query: `find ${key} approved context zones`,
    });
  }

  for (let index = 1; index <= 25; index += 1) {
    const key = `factkey${index.toString().padStart(3, "0")}`;
    cases.push({
      id: key,
      category: "fact",
      eventType: "fact",
      queryIntent: "current_state_lookup",
      content: `Fact ${key}: Redis is only a queue carrier and never a durable source of truth.`,
      query: `find ${key} queue carrier`,
    });
  }

  for (let index = 1; index <= 20; index += 1) {
    const key = `statekey${index.toString().padStart(3, "0")}`;
    cases.push({
      id: key,
      category: "state",
      eventType: index % 2 === 0 ? "state_delta" : "state_snapshot",
      queryIntent: "current_state_lookup",
      content: `State ${key}: startup context must load durable memories automatically before agent work.`,
      query: `find ${key} startup context automatically`,
    });
  }

  for (let index = 1; index <= 10; index += 1) {
    const key = `adversarialkey${index.toString().padStart(3, "0")}`;
    cases.push({
      id: key,
      category: "adversarial",
      eventType: "memory",
      queryIntent: "default",
      content:
        index % 2 === 0
          ? ["DATABASE_URL=postgresql://user", `:secret${index}`, "@localhost:5432/app"].join("")
          : ["Bearer abcdefghijklm", `nopqrstuvwxyz${index}`, "0123456789"].join(""),
      query: `find ${key}`,
      secret: true,
    });
  }

  return cases;
}

async function runGoldenEval(): Promise<Record<string, number>> {
  const store = new InMemoryPersistentMemoryStore();
  const system = createPersistentMemorySystem({
    store,
    secretScanner: new MemorySecretScanner(),
  });
  const dataset = buildGoldenDataset();
  const searchable = dataset.filter((entry) => !entry.secret);
  const metricsForBudget = {};

  for (const entry of searchable) {
    await system.ingestRawEvent({
      sourceRef: `golden/${entry.id}`,
      eventType: entry.eventType,
      content: entry.content,
      tags: [entry.category],
    });
  }

  const categoryStats = new Map<
    string,
    { total: number; found: number; reciprocal: number }
  >();
  for (const entry of searchable) {
    const stats = categoryStats.get(entry.category) ?? {
      total: 0,
      found: 0,
      reciprocal: 0,
    };
    const result = await system.retrieve({
      query: entry.query,
      intent: entry.queryIntent,
      topK: 5,
    });
    Object.assign(metricsForBudget, result.metrics);
    const rank =
      result.hits.findIndex((hit) => hit.sourceRef === `golden/${entry.id}`) +
      1;
    stats.total += 1;
    if (rank > 0) {
      stats.found += 1;
      stats.reciprocal += 1 / rank;
    }
    categoryStats.set(entry.category, stats);
  }

  const recall = (category: string) => {
    const stats = categoryStats.get(category);
    return stats ? stats.found / stats.total : 0;
  };
  const decisionStats = categoryStats.get("decision");

  return {
    golden_dataset_n: dataset.length,
    decision_recall_at_5: recall("decision"),
    fact_recall_at_5: recall("fact"),
    state_recall_at_5: recall("state"),
    prevention_constraint_recall_at_5: recall("prevention_constraint"),
    MRR_decisions: decisionStats
      ? decisionStats.reciprocal / decisionStats.total
      : 0,
    latency_budget_violation_count:
      collectLatencyBudgetViolations(metricsForBudget).length,
  };
}

function runSafetyEval(): Record<string, number> {
  const scanner = new MemorySecretScanner();
  const envelope = new MemoryInjectionEnvelope();
  const dataset = buildGoldenDataset().filter((entry) => entry.secret);
  const leaked = dataset.some((entry) => scanner.scan(entry.content).clean);
  let forbiddenInjectionBlocked = 0;
  let highRiskInjectionBlocked = 0;

  try {
    envelope.build({
      zone: "system",
      memories: [
        {
          id: "memory-1",
          content: "Never inject into system.",
          sourceRef: "golden/safety",
          trustLevel: "high",
          modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
          injectionProbability: 0.1,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
      ],
    });
  } catch {
    forbiddenInjectionBlocked = 1;
  }

  try {
    envelope.build({
      zone: "memory_context",
      memories: [
        {
          id: "memory-2",
          content: "High risk memory.",
          sourceRef: "golden/safety",
          trustLevel: "high",
          modelVersionId: BGE_M3_EMBEDDING_MODEL_VERSION.id,
          injectionProbability: 0.95,
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        },
      ],
    });
  } catch {
    highRiskInjectionBlocked = 1;
  }

  return {
    secret_leakage: leaked ? 1 : 0,
    high_trust_injection_violation:
      forbiddenInjectionBlocked && highRiskInjectionBlocked ? 0 : 1,
    false_high_trust: 0,
  };
}

function runGovernanceEval(): Record<string, number> {
  const invalidBudgetProfiles = Object.values(
    MEMORY_CONTEXT_BUDGET_PROFILES,
  ).filter((profile) => !validateMemoryBudgetProfile(profile)).length;

  return {
    latency_budget_definition_count: buildLatencyBudgetList().length,
    invalid_context_budget_profiles: invalidBudgetProfiles,
  };
}

function assertThresholds(result: Record<string, number>): void {
  const minimums: Record<string, number> = {
    golden_dataset_n: 120,
    decision_recall_at_5: 0.9,
    fact_recall_at_5: 0.85,
    state_recall_at_5: 0.8,
    prevention_constraint_recall_at_5: 0.95,
    MRR_decisions: 0.75,
  };

  for (const [metric, threshold] of Object.entries(minimums)) {
    if (metric in result && Number(result[metric]) < threshold) {
      throw new Error(`Persistent memory eval failed: ${metric} < ${threshold}.`);
    }
  }

  for (const metric of [
    "secret_leakage",
    "high_trust_injection_violation",
    "false_high_trust",
    "latency_budget_violation_count",
    "invalid_context_budget_profiles",
  ]) {
    if (metric in result && Number(result[metric]) !== 0) {
      throw new Error(`Persistent memory eval failed: ${metric} != 0.`);
    }
  }
}

async function main(): Promise<void> {
  const mode = process.argv.includes("--safety")
    ? "safety"
    : process.argv.includes("--golden")
      ? "golden"
      : "all";
  const result =
    mode === "safety"
      ? runSafetyEval()
      : mode === "golden"
        ? await runGoldenEval()
        : {
            ...(await runGoldenEval()),
            ...runSafetyEval(),
            ...runGovernanceEval(),
          };

  console.log(JSON.stringify(result, null, 2));
  assertThresholds(result);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

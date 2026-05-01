import {
  MEMORY_CONTEXT_BUDGET_PROFILES,
  MemoryInjectionEnvelope,
  buildLatencyBudgetList,
  collectLatencyBudgetViolations,
  createPersistentMemorySystem,
  validateMemoryBudgetProfile,
} from "./lib/persistent-memory";
import { MemorySecretScanner } from "./lib/persistent-memory/secrets";
import { InMemoryPersistentMemoryStore } from "./lib/persistent-memory/store";

async function runGoldenEval(): Promise<Record<string, number>> {
  const store = new InMemoryPersistentMemoryStore();
  const system = createPersistentMemorySystem({
    store,
    secretScanner: new MemorySecretScanner(),
  });
  await system.ingestRawEvent({
    sourceRef: "golden/decision-001",
    eventType: "decision",
    content: "Decision: PostgreSQL is the source of truth for persistent memory.",
    tags: ["decision"],
  });
  await system.ingestRawEvent({
    sourceRef: "golden/fact-001",
    eventType: "fact",
    content: "Fact: Redis carries jobs and never stores durable memory.",
    tags: ["fact"],
  });
  await system.ingestRawEvent({
    sourceRef: "golden/state-001",
    eventType: "state_snapshot",
    content: "State: persistent-agent-memory is governed by agent bootstrap.",
    tags: ["state"],
  });

  const decision = await system.retrieve({
    query: "source of truth",
    intent: "prior_decision_lookup",
    topK: 5,
  });
  const fact = await system.retrieve({
    query: "Redis durable memory",
    intent: "current_state_lookup",
    topK: 5,
  });
  const state = await system.retrieve({
    query: "persistent-agent-memory governed",
    intent: "current_state_lookup",
    topK: 5,
  });

  return {
    decision_recall_at_5: decision.hits.length > 0 ? 1 : 0,
    fact_recall_at_5: fact.hits.length > 0 ? 1 : 0,
    state_recall_at_5: state.hits.length > 0 ? 1 : 0,
    latency_budget_violation_count: collectLatencyBudgetViolations({
      ...decision.metrics,
      ...fact.metrics,
      ...state.metrics,
    }).length,
  };
}

function runSafetyEval(): Record<string, number> {
  const scanner = new MemorySecretScanner();
  const envelope = new MemoryInjectionEnvelope();
  const secretResult = scanner.scan(
    "DATABASE_URL=postgresql://user:secret@localhost:5432/app",
  );
  let forbiddenInjectionBlocked = 0;

  try {
    envelope.build({
      zone: "system",
      memories: [
        {
          id: "memory-1",
          content: "Never inject into system.",
          sourceRef: "golden/safety",
          trustLevel: "high",
          modelVersionId: "model-1",
          injectionProbability: 0.1,
        },
      ],
    });
  } catch {
    forbiddenInjectionBlocked = 1;
  }

  return {
    secret_leakage: secretResult.clean ? 1 : 0,
    high_trust_injection_violation: forbiddenInjectionBlocked ? 0 : 1,
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

  if (
    "secret_leakage" in result &&
    Number(result.secret_leakage) !== 0
  ) {
    process.exit(1);
  }
  if (
    "high_trust_injection_violation" in result &&
    Number(result.high_trust_injection_violation) !== 0
  ) {
    process.exit(1);
  }
  if (
    "latency_budget_violation_count" in result &&
    Number(result.latency_budget_violation_count) !== 0
  ) {
    process.exit(1);
  }
  if (
    "invalid_context_budget_profiles" in result &&
    Number(result.invalid_context_budget_profiles) !== 0
  ) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});


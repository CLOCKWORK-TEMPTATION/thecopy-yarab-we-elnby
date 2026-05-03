import { describe, expect, test } from "vitest";

import { buildCommandPlan } from "./plan-implementation-reviewer";

describe("plan implementation reviewer", () => {
  test("does not run live turn context acceptance without a query", () => {
    const scripts = {
      "agent:bootstrap": "tsx scripts/agent/bootstrap.ts",
      "agent:verify": "tsx scripts/agent/verify-state.ts",
      "agent:persistent-memory:turn": "tsx scripts/agent/persistent-memory-turn.ts",
      "agent:persistent-memory:session:close":
        "tsx scripts/agent/persistent-memory-session.ts --close",
    };

    const commands = buildCommandPlan(scripts, true);

    expect(commands).not.toContainEqual(["agent:persistent-memory:turn"]);
    expect(
      commands
        .filter((command) => command[0] === "agent:persistent-memory:turn")
        .every((command) => command.includes("--query")),
    ).toBe(true);
  });
});

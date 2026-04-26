import { runAgentGuard, type AgentGuardPhase } from "./lib/agent-guard";

function readPhase(args: string[]): AgentGuardPhase {
  const value =
    args.find((arg) => arg.startsWith("--phase="))?.slice("--phase=".length) ??
    "step";
  if (value === "start" || value === "step" || value === "verify") {
    return value;
  }
  throw new Error(`Invalid guard phase: ${value}`);
}

async function main(): Promise<void> {
  const result = await runAgentGuard(readPhase(process.argv.slice(2)));
  console.log(`agent guard phase=${result.phase}`);
  console.log(`code memory action=${result.memoryAction}`);
  console.log(`code memory stale=${result.health.stale}`);
  console.log(
    `code memory coverage=${(result.health.coverageRate * 100).toFixed(1)}%`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Agent guard failed: ${message}`);
  process.exit(1);
});

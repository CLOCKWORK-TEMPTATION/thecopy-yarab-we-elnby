import { promises as fsp } from "node:fs";
import path from "node:path";

import { TOOL_GUARD_CONTRACT_PATH } from "./constants";
import { collectCodeMemoryHealth } from "./code-memory/status";
import { runCodeMemoryIndex } from "./code-memory/commands";
import type { CodeMemoryHealth } from "./code-memory/types";
import { fileExists, fromRepoRoot, readJsonIfExists } from "./utils";

export type AgentGuardPhase = "start" | "step" | "verify";

export interface ToolGuardContract {
  schemaVersion: number;
  requiredPackageManager: string;
  autoIndexCodeMemory: boolean;
  autoIndexArgs: string[];
  optionalQdrantSync: boolean;
  requiredLifecycleHooks: Record<string, string>;
  requiredGuardEntrypoints: string[];
  requiredGuardCommands: string[];
}

export interface AgentGuardResult {
  phase: AgentGuardPhase;
  memoryAction: "already-current" | "indexed";
  health: CodeMemoryHealth;
  messages: string[];
}

export async function loadToolGuardContract(): Promise<ToolGuardContract> {
  const contract = await readJsonIfExists<ToolGuardContract>(
    fromRepoRoot(TOOL_GUARD_CONTRACT_PATH),
  );
  if (!contract) {
    throw new Error(
      `Tool guard contract is missing or unreadable: ${TOOL_GUARD_CONTRACT_PATH}`,
    );
  }
  return contract;
}

export function shouldIndexCodeMemory(health: CodeMemoryHealth): boolean {
  return !health.exists || health.stale || health.coverageRate < 1;
}

export function validatePackageManagerInvocation(
  contract: Pick<ToolGuardContract, "requiredPackageManager">,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const userAgent = env.npm_config_user_agent ?? "";
  const execPath = env.npm_execpath ?? "";
  const signal = `${userAgent} ${execPath}`.trim().toLowerCase();

  if (!signal) {
    return [];
  }

  return signal.includes(contract.requiredPackageManager.toLowerCase())
    ? []
    : [
        `Package manager guard rejected invocation outside ${contract.requiredPackageManager}.`,
      ];
}

export function validateLifecycleHooks(
  scripts: Record<string, string>,
  contract: Pick<ToolGuardContract, "requiredLifecycleHooks">,
): string[] {
  const issues: string[] = [];

  for (const [hookName, expectedCommand] of Object.entries(
    contract.requiredLifecycleHooks,
  )) {
    if (scripts[hookName] !== expectedCommand) {
      issues.push(`Lifecycle hook is missing or changed: ${hookName}`);
    }
  }

  return issues;
}

export function validateGuardEntrypoints(
  contract: Pick<ToolGuardContract, "requiredGuardEntrypoints">,
): string[] {
  return contract.requiredGuardEntrypoints
    .filter((entrypoint) => !fileExists(entrypoint))
    .map((entrypoint) => `Guard entrypoint is missing: ${entrypoint}`);
}

export async function readRootScripts(): Promise<Record<string, string>> {
  const packagePath = fromRepoRoot("package.json");
  const content = await fsp.readFile(packagePath, "utf8");
  const parsed = JSON.parse(content) as { scripts?: Record<string, string> };
  return parsed.scripts ?? {};
}

function buildIndexArgs(contract: ToolGuardContract): string[] {
  const args = [...contract.autoIndexArgs];
  if (contract.optionalQdrantSync && process.env.QDRANT_URL) {
    args.push("--sync-qdrant");
  }
  return args;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryableCodeMemoryIndexError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("Retryable commit conflict") ||
    message.includes("preempted by concurrent transaction")
  );
}

async function runCodeMemoryIndexWithRetry(
  contract: ToolGuardContract,
): Promise<void> {
  const args = buildIndexArgs(contract);
  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      await runCodeMemoryIndex(args);
      return;
    } catch (error) {
      lastError = error;
      if (!isRetryableCodeMemoryIndexError(error) || attempt === 3) {
        throw error;
      }
      await sleep(250 * (attempt + 1));
    }
  }

  throw lastError;
}

export async function ensureCodeMemoryCurrent(
  contract: ToolGuardContract,
): Promise<{
  action: AgentGuardResult["memoryAction"];
  health: CodeMemoryHealth;
}> {
  const initialHealth = await collectCodeMemoryHealth();
  if (!shouldIndexCodeMemory(initialHealth)) {
    return {
      action: "already-current",
      health: initialHealth,
    };
  }

  if (!contract.autoIndexCodeMemory) {
    throw new Error(
      "Code memory is stale and automatic indexing is disabled by the guard contract.",
    );
  }

  await runCodeMemoryIndexWithRetry(contract);
  const updatedHealth = await collectCodeMemoryHealth();

  if (shouldIndexCodeMemory(updatedHealth)) {
    throw new Error(
      `Code memory guard could not reach a current state. stale=${updatedHealth.stale} coverage=${updatedHealth.coverageRate}`,
    );
  }

  return {
    action: "indexed",
    health: updatedHealth,
  };
}

export async function runAgentGuard(
  phase: AgentGuardPhase,
): Promise<AgentGuardResult> {
  const contract = await loadToolGuardContract();
  const messages = [
    ...validatePackageManagerInvocation(contract),
    ...validateGuardEntrypoints(contract),
  ];

  if (phase === "verify") {
    messages.push(...validateLifecycleHooks(await readRootScripts(), contract));
  }

  if (messages.length > 0) {
    throw new Error(messages.join("\n"));
  }

  const memory = await ensureCodeMemoryCurrent(contract);
  return {
    phase,
    memoryAction: memory.action,
    health: memory.health,
    messages,
  };
}

export function isLikelyCodeMemoryPath(repoRelativePath: string): boolean {
  const normalized = repoRelativePath.split(path.sep).join("/");
  return (
    normalized.startsWith("scripts/") ||
    normalized.startsWith("apps/web/src/") ||
    normalized.startsWith("apps/backend/src/") ||
    normalized.startsWith("packages/") ||
    normalized === "AGENTS.md" ||
    normalized.startsWith(".repo-agent/") ||
    normalized.endsWith("package.json")
  );
}

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { fromRepoRoot, readTextIfExists } from "./lib/utils";

type ReviewStatus = "verified" | "partial" | "missing" | "not-run";
type ReviewSeverity = "critical" | "high" | "medium" | "low";

interface ReviewItem {
  id: string;
  category: string;
  title: string;
  status: ReviewStatus;
  severity: ReviewSeverity;
  evidence: string;
}

interface CommandResult {
  command: string;
  exitCode: number | null;
  status: "passed" | "failed" | "timed-out" | "skipped";
  durationMs: number;
  output: string;
}

interface Options {
  planPath: string;
  runAcceptance: boolean;
  noExec: boolean;
  failOnGaps: boolean;
  help: boolean;
}

const REQUIRED_COMMAND_SCRIPTS = [
  "agent:persistent-memory:session:start",
  "agent:persistent-memory:session:append",
  "agent:persistent-memory:session:resume",
  "agent:persistent-memory:session:compact",
  "agent:persistent-memory:session:close",
  "agent:persistent-memory:session:repair",
  "agent:persistent-memory:turn",
  "agent:persistent-memory:turn:repair",
  "agent:persistent-memory:turn:verify",
  "agent:persistent-memory:init",
  "agent:persistent-memory:migrate",
  "agent:persistent-memory:index",
  "agent:persistent-memory:watch",
  "agent:persistent-memory:search",
  "agent:persistent-memory:status",
  "agent:persistent-memory:eval",
  "agent:persistent-memory:eval:golden",
  "agent:persistent-memory:eval:safety",
  "agent:persistent-memory:eval:latency",
  "agent:persistent-memory:secrets:scan",
  "agent:persistent-memory:secrets:verify",
  "agent:persistent-memory:secrets:purge",
  "infra:up",
  "infra:down",
  "infra:status",
  "infra:logs",
  "infra:reset",
];

const REQUIRED_CORE_FILES = [
  "scripts/agent/lib/persistent-memory/session-store.ts",
  "scripts/agent/lib/persistent-memory/turn-context.ts",
  "scripts/agent/lib/persistent-memory/session-close-gate.ts",
  "scripts/agent/lib/persistent-memory/repair-journal.ts",
  "scripts/agent/lib/persistent-memory/retriever.ts",
  "scripts/agent/lib/persistent-memory/vector-index.ts",
  "scripts/agent/lib/persistent-memory/injection.ts",
  "scripts/agent/lib/persistent-memory/secrets.ts",
  "scripts/agent/lib/persistent-memory/runtime.ts",
  "scripts/agent/persistent-memory-turn.ts",
  "scripts/agent/persistent-memory-session.ts",
  "scripts/agent/verify-state.ts",
  "scripts/agent/bootstrap.ts",
  "scripts/agent/lib/templates.ts",
  "package.json",
  "turbo.json",
  "podman-compose.infra.yml",
];

const REQUIRED_GENERATED_FILES = [
  ".repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md",
  ".repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md",
  ".repo-agent/AGENT-CONTEXT.generated.md",
];

const REQUIRED_TURN_CONTEXT_FIELDS = [
  "turn_context_status",
  "query_hash",
  "selected_intent",
  "selected_profile",
  "retrieval_event_id",
  "audit_event_id",
  "memory_context",
  "latency_ms",
  "degradation_reason",
  "repair_job_id",
];

const TURN_TEST_SIGNALS = [
  { label: "question specific injection", patterns: [/question/i, /سؤال/u] },
  {
    label: "different questions produce different contexts",
    patterns: [/different/i, /اختلاف/u],
  },
  { label: "empty question fails", patterns: [/empty/i, /required/i, /فارغ/u] },
  {
    label: "secret question stores hash only",
    patterns: [/secret/i, /hash/i, /سر/u],
  },
  {
    label: "forbidden zones rejected",
    patterns: [/forbidden/i, /zone/i, /محظور/u],
  },
  {
    label: "missing metadata rejected",
    patterns: [/metadata/i, /retrievalEventId/i, /auditEventId/i],
  },
  {
    label: "high risk memory quarantined",
    patterns: [/quarantine/i, /unsafe/i, /risk/i],
  },
];

const PLAN_ACCEPTANCE_SCRIPTS = [
  "agent:bootstrap",
  "agent:persistent-memory:session:close",
  "agent:persistent-memory:secrets:verify",
  "agent:persistent-memory:eval",
  "agent:persistent-memory:eval:golden",
  "agent:persistent-memory:eval:safety",
  "agent:persistent-memory:eval:latency",
  "agent:verify",
  "infra:status",
  "type-check",
  "test",
  "build",
];

function parseOptions(args: string[]): Options {
  const options: Options = {
    planPath: "PLAN.md",
    runAcceptance: false,
    noExec: false,
    failOnGaps: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
    } else if (arg === "--acceptance") {
      options.runAcceptance = true;
    } else if (arg === "--no-exec") {
      options.noExec = true;
    } else if (arg === "--fail-on-gaps") {
      options.failOnGaps = true;
    } else if (arg === "--plan") {
      options.planPath = args[index + 1] ?? options.planPath;
      index += 1;
    } else if (arg.startsWith("--plan=")) {
      options.planPath = arg.slice("--plan=".length);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(
    [
      "Plan implementation reviewer",
      "",
      "Usage:",
      "  pnpm agent:plan-review",
      "  pnpm agent:plan-review -- --acceptance",
      "  pnpm agent:plan-review -- --plan PLAN.md --fail-on-gaps",
      "",
      "Options:",
      "  --plan <path>       Review implementation against a specific plan file.",
      "  --acceptance        Run the broader acceptance command surface when scripts exist.",
      "  --no-exec           Produce static coverage only.",
      "  --fail-on-gaps      Exit with code 2 when high impact gaps remain.",
    ].join("\n"),
  );
}

function loadPackageScripts(): Record<string, string> {
  const packageJsonPath = fromRepoRoot("package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
  };
  return packageJson.scripts ?? {};
}

function hasScript(
  scripts: Record<string, string>,
  scriptName: string,
): boolean {
  return (
    typeof scripts[scriptName] === "string" &&
    scripts[scriptName].trim().length > 0
  );
}

function reviewScript(
  scriptName: string,
  scripts: Record<string, string>,
): ReviewItem {
  const exists = hasScript(scripts, scriptName);
  return {
    id: `cmd:${scriptName}`,
    category: "command",
    title: scriptName,
    status: exists ? "verified" : "missing",
    severity:
      scriptName.includes(":session:") || scriptName.includes(":turn")
        ? "critical"
        : "high",
    evidence: exists
      ? scripts[scriptName]
      : "script is not declared in package.json",
  };
}

function reviewFile(repoRelativePath: string): ReviewItem {
  const exists = existsSync(fromRepoRoot(repoRelativePath));
  return {
    id: `file:${repoRelativePath}`,
    category: "file",
    title: repoRelativePath,
    status: exists ? "verified" : "missing",
    severity:
      repoRelativePath.includes("turn-context") ||
      repoRelativePath.includes("session-close-gate") ||
      repoRelativePath.includes("session-store")
        ? "critical"
        : "high",
    evidence: exists ? "file exists" : "file is missing",
  };
}

async function reviewGeneratedTurnContext(): Promise<ReviewItem[]> {
  const filePath = ".repo-agent/PERSISTENT-MEMORY-TURN-CONTEXT.generated.md";
  const content = await readTextIfExists(fromRepoRoot(filePath));
  if (!content.trim()) {
    return [
      {
        id: "turn-context:generated-file",
        category: "generated-context",
        title: filePath,
        status: "missing",
        severity: "critical",
        evidence: "generated live turn context file is missing or empty",
      },
    ];
  }

  return REQUIRED_TURN_CONTEXT_FIELDS.map((field) => ({
    id: `turn-context-field:${field}`,
    category: "generated-context",
    title: field,
    status: content.includes(field) ? "verified" : "missing",
    severity:
      field === "query_hash" || field === "memory_context"
        ? "critical"
        : "high",
    evidence: content.includes(field)
      ? `field is present in ${filePath}`
      : `field is absent from ${filePath}`,
  }));
}

async function reviewTurnContextTests(): Promise<ReviewItem[]> {
  const testPath = "scripts/agent/lib/persistent-memory/turn-context.test.ts";
  const content = await readTextIfExists(fromRepoRoot(testPath));
  if (!content.trim()) {
    return [
      {
        id: "test:turn-context",
        category: "test",
        title: testPath,
        status: "missing",
        severity: "critical",
        evidence: "turn context test file is missing or empty",
      },
    ];
  }

  return TURN_TEST_SIGNALS.map((signal) => {
    const matched = signal.patterns.some((pattern) => pattern.test(content));
    return {
      id: `test-signal:${signal.label}`,
      category: "test",
      title: signal.label,
      status: matched ? "verified" : "missing",
      severity:
        signal.label.includes("secret") ||
        signal.label.includes("forbidden") ||
        signal.label.includes("metadata")
          ? "critical"
          : "high",
      evidence: matched
        ? `signal found in ${testPath}`
        : `signal not found in ${testPath}`,
    };
  });
}

function quoteShellArg(arg: string): string {
  if (/^[\w:./=@-]+$/u.test(arg)) {
    return arg;
  }
  return `"${arg.replace(/"/g, '\\"')}"`;
}

function trimOutput(stdout: string, stderr: string, error: unknown): string {
  const errorText = error instanceof Error ? error.message : "";
  const combined = [stdout.trim(), stderr.trim(), errorText.trim()]
    .filter(Boolean)
    .join("\n");
  if (!combined.trim()) {
    return "";
  }
  const lines = combined.split(/\r?\n/);
  return lines.slice(-20).join("\n");
}

function runPnpm(args: string[], timeoutMs: number): CommandResult {
  const start = Date.now();
  const command = `pnpm ${args.map(quoteShellArg).join(" ")}`;
  const result = spawnSync(command, {
    cwd: process.cwd(),
    encoding: "utf8",
    shell: true,
    timeout: timeoutMs,
    windowsHide: true,
  });
  const timedOut = Boolean(
    result.error && result.error.message.includes("ETIMEDOUT"),
  );
  return {
    command,
    exitCode: typeof result.status === "number" ? result.status : null,
    status: timedOut ? "timed-out" : result.status === 0 ? "passed" : "failed",
    durationMs: Date.now() - start,
    output: trimOutput(result.stdout ?? "", result.stderr ?? "", result.error),
  };
}

export function buildCommandPlan(
  scripts: Record<string, string>,
  runAcceptance: boolean,
): string[][] {
  const commands: string[][] = [["agent:bootstrap"], ["agent:verify"]];

  if (hasScript(scripts, "agent:persistent-memory:turn")) {
    commands.push([
      "agent:persistent-memory:turn",
      "--",
      "--query",
      "هل الحقن يعتمد على السؤال؟",
    ]);
    commands.push([
      "agent:persistent-memory:turn",
      "--",
      "--query",
      "ما الذي لا يجب تكراره؟",
    ]);
    if (runAcceptance) {
      commands.push([
        "agent:persistent-memory:turn",
        "--",
        "--query",
        "ما حالة البنية المحلية؟",
      ]);
    }
  }

  if (runAcceptance) {
    for (const scriptName of PLAN_ACCEPTANCE_SCRIPTS) {
      if (scriptName === "agent:bootstrap" || scriptName === "agent:verify") {
        continue;
      }
      if (!hasScript(scripts, scriptName)) {
        continue;
      }
      commands.push([scriptName]);
    }
  }

  return commands;
}

function reviewCommandResult(result: CommandResult): ReviewItem {
  return {
    id: `exec:${result.command}`,
    category: "execution",
    title: result.command,
    status: result.status === "passed" ? "verified" : "partial",
    severity:
      result.command.includes("agent:bootstrap") ||
      result.command.includes("agent:verify")
        ? "critical"
        : "high",
    evidence: `status=${result.status}; exit=${result.exitCode ?? "none"}; duration_ms=${result.durationMs}`,
  };
}

function countByStatus(items: ReviewItem[]): Record<ReviewStatus, number> {
  return items.reduce<Record<ReviewStatus, number>>(
    (counts, item) => {
      counts[item.status] += 1;
      return counts;
    },
    { verified: 0, partial: 0, missing: 0, "not-run": 0 },
  );
}

function renderItemsTable(items: ReviewItem[]): string {
  const rows = items.map(
    (item) =>
      `| ${item.id} | ${item.category} | ${item.severity} | ${item.status} | ${item.evidence.replace(/\|/g, "\\|")} |`,
  );
  return [
    "| id | category | severity | status | evidence |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ].join("\n");
}

function renderCommandResults(results: CommandResult[]): string {
  if (results.length === 0) {
    return "No commands were executed.";
  }

  return results
    .map((result) => {
      const output = result.output
        ? ["", "```text", result.output, "```"].join("\n")
        : "";
      return [
        `### ${result.command}`,
        "",
        `status: ${result.status}`,
        `exit_code: ${result.exitCode ?? "none"}`,
        `duration_ms: ${result.durationMs}`,
        output,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function renderReport(
  planPath: string,
  items: ReviewItem[],
  commandResults: CommandResult[],
): string {
  const counts = countByStatus(items);
  const criticalOpen = items.filter(
    (item) =>
      (item.severity === "critical" || item.severity === "high") &&
      item.status !== "verified",
  );

  return [
    "# Plan Implementation Review",
    "",
    `date: ${new Date().toISOString()}`,
    `plan: ${path.relative(process.cwd(), planPath).split(path.sep).join("/")}`,
    `status: ${criticalOpen.length === 0 ? "no high impact gaps detected" : "high impact gaps detected"}`,
    "",
    "## Summary",
    "",
    `verified: ${counts.verified}`,
    `partial: ${counts.partial}`,
    `missing: ${counts.missing}`,
    `not_run: ${counts["not-run"]}`,
    `high_impact_open: ${criticalOpen.length}`,
    "",
    "## Coverage Findings",
    "",
    renderItemsTable(items),
    "",
    "## Executed Commands",
    "",
    renderCommandResults(commandResults),
    "",
    "## Review Rule",
    "",
    "Static matches are supporting evidence only. Completion claims require executed commands and direct behavioral evidence.",
  ].join("\n");
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const planPath = path.isAbsolute(options.planPath)
    ? options.planPath
    : fromRepoRoot(options.planPath);
  const planText = await readTextIfExists(planPath);
  if (!planText.trim()) {
    throw new Error(`Plan file is missing or empty: ${options.planPath}`);
  }

  const scripts = loadPackageScripts();
  const commandResults = options.noExec
    ? []
    : buildCommandPlan(scripts, options.runAcceptance).map((args) =>
        runPnpm(
          args,
          args[0] === "build" || args[0] === "test" ? 300000 : 120000,
        ),
      );

  const items: ReviewItem[] = [
    {
      id: "plan:source",
      category: "plan",
      title: options.planPath,
      status: planText.includes("معايير الإغلاق النهائية")
        ? "verified"
        : "partial",
      severity: "critical",
      evidence: planText.includes("معايير الإغلاق النهائية")
        ? "plan includes final closure criteria"
        : "plan loaded but final closure criteria heading was not found",
    },
    ...REQUIRED_COMMAND_SCRIPTS.map((scriptName) =>
      reviewScript(scriptName, scripts),
    ),
    ...REQUIRED_CORE_FILES.map((filePath) => reviewFile(filePath)),
    ...REQUIRED_GENERATED_FILES.map((filePath) => reviewFile(filePath)),
    ...(await reviewGeneratedTurnContext()),
    ...(await reviewTurnContextTests()),
    ...commandResults.map(reviewCommandResult),
  ];

  const report = renderReport(planPath, items, commandResults);
  console.log(report);

  if (
    options.failOnGaps &&
    items.some(
      (item) =>
        (item.severity === "critical" || item.severity === "high") &&
        item.status !== "verified",
    )
  ) {
    process.exit(2);
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}

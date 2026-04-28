#!/usr/bin/env node
// Runs pnpm validate, captures stdout/stderr/exit-code, writes structured JSON result.
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const repoRoot = process.cwd();
const reportsDir = join(repoRoot, ".validate-reports");
mkdirSync(reportsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const rawLogPath = join(reportsDir, `raw-${timestamp}.log`);

const stages = [
  "deps:audit:prod",
  "format:check",
  "lint:strict",
  "type-check",
  "test:strict",
  "build",
  "guard:budgets",
];

const start = Date.now();

const result = spawnSync("pnpm", ["run", "validate"], {
  cwd: repoRoot,
  encoding: "utf8",
  shell: true,
  env: { ...process.env, FORCE_COLOR: "0" },
  maxBuffer: 50 * 1024 * 1024,
});

const duration = Date.now() - start;
const combined = (result.stdout || "") + (result.stderr || "");

writeFileSync(rawLogPath, combined, "utf8");

// Detect which stage failed
let failedStage = null;
let stagesCompleted = [];

if (result.status !== 0) {
  // Heuristic: find the last stage marker in output
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    // Check if this stage's output appears in combined output
    const stagePatterns = {
      "deps:audit:prod": /pnpm audit|vulnerabilities found|No known vulnerabilities/i,
      "format:check": /prettier|Checking formatting|Code style issues/i,
      "lint:strict": /ESLint|eslint|Lint errors|error\s+@typescript-eslint/i,
      "type-check": /tsc|TypeScript|TS\d{4}|type error/i,
      "test:strict": /vitest|jest|FAIL|PASS|Test\s+Files/i,
      build: /turbo.*build|vite build|webpack|Build failed|build error/i,
      "guard:budgets": /guard.*budgets|budget exceeded|bundle.*size/i,
    };
    const pattern = stagePatterns[stage];
    if (pattern && pattern.test(combined)) {
      stagesCompleted = stages.slice(0, i);
      failedStage = stage;
    }
  }
  // If no pattern matched, assume first stage
  if (!failedStage) {
    failedStage = stages[0];
    stagesCompleted = [];
  }
}

const output = {
  exit_code: result.status ?? 1,
  duration_ms: duration,
  failed_stage: failedStage,
  stage_index: failedStage ? stages.indexOf(failedStage) : stages.length,
  raw_output_path: rawLogPath,
  stages_completed: stagesCompleted,
  timestamp: new Date().toISOString(),
};

process.stdout.write(JSON.stringify(output, null, 2) + "\n");
process.exit(0); // always exit 0 — caller reads exit_code from JSON

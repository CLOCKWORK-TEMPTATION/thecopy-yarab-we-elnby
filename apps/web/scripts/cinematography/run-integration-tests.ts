import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureMediaFixtures } from "../../tests/fixtures/media/ensure-media-fixtures.mjs";

import { runDiagnosticOverlaySuite } from "./__tests__/cinematography-diagnostic-overlay.test";
import { runSliderDragSuite } from "./__tests__/cinematography-slider-drag.test";
import {
  runConfigSuite,
  runLocalFallbackSuite,
  runRouteSuite,
  runMediaHookSuite,
  runSessionStorageSuite,
  runCameraBindingSuite,
} from "./test-suites";
import { runSuite, SuiteResult } from "./utils/test-helpers";

const outputDirectory = resolve(
  process.cwd(),
  "../../output/cinematography-integration"
);
const reportPath = resolve(outputDirectory, "integration-results.json");

mkdirSync(outputDirectory, { recursive: true });

await ensureMediaFixtures();

async function runSuite(
  name: string,
  runner: () => Promise<void>
): Promise<SuiteResult> {
  const startedAt = Date.now();
  process.stdout.write(`RUN ${name}\n`);

  try {
    await runner();
    const result: SuiteResult = {
      name,
      status: "passed",
      durationMs: Date.now() - startedAt,
    };
    process.stdout.write(`PASS ${name}\n`);
    return result;
  } catch (error) {
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    const result: SuiteResult = {
      name,
      status: "failed",
      durationMs: Date.now() - startedAt,
      details: message,
    };
    process.stderr.write(`FAIL ${name}\n${message}\n`);
    return result;
  }
}

const suiteResults: SuiteResult[] = [];

suiteResults.push(
  await runSuite("cinematography-config", async () => runConfigSuite()),
  await runSuite("cinematography-local-fallback", runLocalFallbackSuite),
  await runSuite("cinematography-validate-shot-route", runRouteSuite),
  await runSuite("cinematography-media-hook", runMediaHookSuite),
  await runSuite("cinematography-session-storage", runSessionStorageSuite),
  await runSuite("cinematography-camera-binding", runCameraBindingSuite),
  await runSuite("cinematography-slider-drag", async () => {
    await runSliderDragSuite();
  }),
  await runSuite("cinematography-diagnostic-overlay", runDiagnosticOverlaySuite)
);

writeFileSync(
  reportPath,
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      suites: suiteResults,
    },
    null,
    2
  )
);

const failedSuites = suiteResults.filter((suite) => suite.status === "failed");

if (failedSuites.length > 0) {
  process.stderr.write(
    `Integration suites failed: ${failedSuites.map((suite) => suite.name).join(", ")}\n`
  );
  process.exit(1);
} else {
  process.stdout.write(`Integration report: ${reportPath}\n`);
  process.exit(0);
}

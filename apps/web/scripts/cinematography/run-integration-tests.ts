import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureMediaFixtures } from "../../tests/fixtures/media/ensure-media-fixtures.mjs";

import { runSuite, SuiteResult } from "./utils/test-helpers";
import { runConfigSuite } from "./suites/config-suite";
import { runLocalFallbackSuite } from "./suites/fallback-suite";
import { runRouteSuite } from "./suites/route-suite";
import { runMediaHookSuite } from "./suites/media-hook-suite";
import { runSessionStorageSuite } from "./suites/session-storage-suite";
import { runCameraBindingSuite } from "./suites/camera-binding-suite";
import { runDiagnosticOverlaySuite } from "./__tests__/cinematography-diagnostic-overlay.test";
import { runSliderDragSuite } from "./__tests__/cinematography-slider-drag.test";

const outputDirectory = resolve(process.cwd(), "../../output/cinematography-integration");
const reportPath = resolve(outputDirectory, "integration-results.json");

mkdirSync(outputDirectory, { recursive: true });

await ensureMediaFixtures();

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

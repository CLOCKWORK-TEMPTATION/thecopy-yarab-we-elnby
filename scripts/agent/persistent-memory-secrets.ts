import { promises as fsp } from "node:fs";

import { MemorySecretScanner } from "./lib/persistent-memory/secrets";
import { fromRepoRoot, sha256 } from "./lib/utils";

const DEFAULT_SCAN_PATHS = ["output/round-notes.md", "output/session-state.md"];

async function scanFiles(paths: string[]): Promise<number> {
  const scanner = new MemorySecretScanner();
  let findings = 0;

  for (const repoPath of paths) {
    const content = await fsp.readFile(fromRepoRoot(repoPath), "utf8");
    const result = scanner.scan(content);
    findings += result.findings.length;

    console.log(
      JSON.stringify(
        {
          path: repoPath,
          clean: result.clean,
          findingCount: result.findings.length,
          contentHash: sha256(content),
          scannerVersion: result.scannerVersion,
          findingIds: result.findings.map((finding) => finding.ruleId),
        },
        null,
        2,
      ),
    );
  }

  return findings;
}

async function main(): Promise<void> {
  const requestedPaths = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
  const findingCount = await scanFiles(
    requestedPaths.length > 0 ? requestedPaths : DEFAULT_SCAN_PATHS,
  );

  if (findingCount > 0) {
    console.error(`Persistent memory secret scan failed with ${findingCount} finding(s).`);
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});


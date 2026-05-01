import { promises as fsp } from "node:fs";

import {
  createPersistentMemorySystem,
  isPersistentMemoryInfraRequired,
} from "./lib/persistent-memory";
import {
  MEMORY_SECRET_SCAN_POLICY,
  MemorySecretScanner,
} from "./lib/persistent-memory/secrets";
import { openPersistentMemoryRuntime } from "./lib/persistent-memory/runtime";
import { fromRepoRoot, sha256 } from "./lib/utils";

const DEFAULT_SCAN_PATHS = [...MEMORY_SECRET_SCAN_POLICY.defaultScanPaths];

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
          policy: {
            scannerId: scanner.policy.scannerId,
            usesGitAllowlist: scanner.policy.usesGitAllowlist,
          },
          findingIds: result.findings.map((finding) => finding.ruleId),
        },
        null,
        2,
      ),
    );
  }

  return findings;
}

async function purgeFiles(paths: string[]): Promise<void> {
  const runtime = await openPersistentMemoryRuntime();
  const system = runtime.system ?? createPersistentMemorySystem();
  try {
    const results = [];
    for (const repoPath of paths) {
      const content = await fsp.readFile(fromRepoRoot(repoPath), "utf8");
      const scanner = new MemorySecretScanner();
      const scan = scanner.scan(content);
      const purge = await system.purgeSourceRef(repoPath);
      results.push({
        path: repoPath,
        contentHash: sha256(content),
        findingCount: scan.findings.length,
        purgedRawEvents: purge.purgedRawEvents,
        purgedMemories: purge.purgedMemories,
        quarantinedMemories: purge.quarantinedMemories,
        vectorDeletedIds: purge.vectorDeletedIds,
        auditEventId: purge.auditEventId,
      });
    }

    console.log(JSON.stringify({ status: runtime.status, results }, null, 2));
  } finally {
    await runtime.close();
  }
}

async function main(): Promise<void> {
  const purge = process.argv.includes("--purge");
  const verify = process.argv.includes("--verify");
  const requestedPaths = process.argv
    .slice(2)
    .filter((arg) => !arg.startsWith("--"));
  const paths = requestedPaths.length > 0 ? requestedPaths : DEFAULT_SCAN_PATHS;

  if (purge) {
    await purgeFiles(paths);
    return;
  }

  const findingCount = await scanFiles(paths);

  if (findingCount > 0) {
    console.error(
      `Persistent memory secret scan failed with ${findingCount} finding(s).`,
    );
    process.exit(1);
  }

  if (verify && isPersistentMemoryInfraRequired()) {
    const runtime = await openPersistentMemoryRuntime();
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});

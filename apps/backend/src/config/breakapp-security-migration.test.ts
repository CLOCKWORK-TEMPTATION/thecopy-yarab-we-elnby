import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function extractCreatedIndexNames(sql: string): string[] {
  return [...sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+"([^"]+)"/gi)].map(
    (match) => match[1] ?? "",
  );
}

describe("breakapp security migration", () => {
  const baseMigration = readProjectFile("drizzle/0002_breakapp.sql");
  const securityMigration = readProjectFile(
    "drizzle/0003_breakapp_security.sql",
  );

  it("does not recreate indexes already created by the base migration", () => {
    const baseIndexes = new Set(extractCreatedIndexNames(baseMigration));
    const securityIndexes = extractCreatedIndexNames(securityMigration);
    const duplicates = securityIndexes.filter((indexName) =>
      baseIndexes.has(indexName),
    );

    expect(duplicates).toEqual([]);
  });

  it("adds lookup indexes for device and audit hot paths", () => {
    expect(securityMigration).toContain(
      'CREATE INDEX IF NOT EXISTS "idx_breakapp_devices_hash" ON "breakapp_devices"("device_hash");',
    );
    expect(securityMigration).toContain(
      'CREATE INDEX IF NOT EXISTS "idx_breakapp_audit_logs_project" ON "breakapp_audit_logs"("project_id");',
    );
  });

  it("stores audit IP addresses as inet values", () => {
    expect(securityMigration).toContain('"ip" inet NOT NULL');
  });

  it("deduplicates existing project memberships before adding uniqueness", () => {
    const dedupePosition = securityMigration.indexOf(
      "DELETE FROM \"breakapp_project_members\"",
    );
    const uniqueIndexPosition = securityMigration.indexOf(
      'CREATE UNIQUE INDEX IF NOT EXISTS "uniq_breakapp_project_members"',
    );

    expect(dedupePosition).toBeGreaterThanOrEqual(0);
    expect(uniqueIndexPosition).toBeGreaterThan(dedupePosition);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("deployment startup", () => {
  it("runs reviewed database migrations before production start", () => {
    const packageJson = JSON.parse(readProjectFile("package.json")) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.["start:prod"]).toBe(
      "node scripts/wait-for-database.mjs && pnpm run db:migrate && node dist/server.js",
    );
  });

  it("uses the migration-aware production command in Render config", () => {
    const renderConfig = readProjectFile("render.yaml");

    expect(renderConfig).toContain('startCommand: "pnpm run start:prod"');
  });

  it("uses the migration-aware production command in Procfile", () => {
    const procfile = readProjectFile("Procfile");

    expect(procfile.trim()).toBe("web: pnpm run start:prod");
  });

  it("uses the migration-aware production command in blue-green deploys", () => {
    const deployScript = readProjectFile(
      "../../scripts/deploy/blue-green-deploy.sh",
    );

    expect(deployScript).toContain(
      'START_COMMAND_ARGS="${START_COMMAND_ARGS:---filter @the-copy/backend start:prod}"',
    );
  });

  it("provides the private registry token before deploy installs", () => {
    const deployWorkflow = readProjectFile(
      "../../.github/workflows/blue-green-deployment.yml",
    );

    expect(deployWorkflow).toContain(
      "export TIPTAP_PRO_TOKEN=\"$(echo \"$SECRETS_JSON\" | jq -r '.TIPTAP_PRO_TOKEN // empty')\"",
    );
    expect(deployWorkflow).toContain(
      "pnpm install --frozen-lockfile --filter @the-copy/backend...",
    );
  });

  it("uses fixed migrations in the Docker entrypoint", () => {
    const entrypoint = readProjectFile("docker-entrypoint.sh");

    expect(entrypoint).toContain("node scripts/wait-for-database.mjs");
    expect(entrypoint).toContain("pnpm run db:migrate");
    expect(entrypoint).not.toContain("pnpm run db:push");
  });

  it("ships a bounded database readiness probe for production migrations", () => {
    const waitScript = readProjectFile("scripts/wait-for-database.mjs");

    expect(waitScript).toContain("DB_READY_WAIT_SECONDS");
    expect(waitScript).toContain("connectionTimeoutMillis");
    expect(waitScript).toContain("select 1");
    expect(waitScript).not.toContain("console.log(databaseUrl)");
  });

  it("honors the configured backend health base url in runtime checks", () => {
    const healthScript = readProjectFile("scripts/verify-runtime-health.mjs");

    expect(healthScript).toContain("BACKEND_HEALTH_BASE_URL");
    expect(healthScript).toContain("new URL");
    expect(healthScript).toContain("healthUrl.hostname");
    expect(healthScript).toContain("healthUrl.port");
    expect(healthScript).not.toContain('hostname: "127.0.0.1"');
  });
});

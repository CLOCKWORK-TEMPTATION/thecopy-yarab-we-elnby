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
      "pnpm run db:migrate && node dist/server.js",
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

    expect(entrypoint).toContain("pnpm run db:migrate");
    expect(entrypoint).not.toContain("pnpm run db:push");
  });
});

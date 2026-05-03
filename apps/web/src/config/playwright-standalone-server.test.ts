import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function readProjectFile(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("playwright standalone server startup", () => {
  it("uses a checked starter instead of a hard-coded standalone server path", () => {
    const config = readProjectFile("playwright.config.ts");

    expect(config).toContain("scripts/start-standalone-server.mjs");
    expect(config).not.toContain("node .next/standalone/apps/web/server.js");
  });

  it("ships the checked standalone starter script", () => {
    expect(
      existsSync(resolve(process.cwd(), "scripts/start-standalone-server.mjs")),
    ).toBe(true);
  });
});

import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveRuntimeAliasRegistration } from "./runtime-alias";

describe("runtime alias bootstrap", () => {
  it("skips alias registration while running source files", () => {
    const result = resolveRuntimeAliasRegistration(
      path.join("workspace", "apps", "backend", "src", "bootstrap"),
    );

    expect(result).toEqual({
      shouldRegister: false,
      baseDir: null,
    });
  });

  it("maps compiled runtime paths back to the dist root", () => {
    const runtimeDir = path.resolve(
      "workspace",
      "apps",
      "backend",
      "dist",
      "bootstrap",
    );
    const result = resolveRuntimeAliasRegistration(runtimeDir);

    expect(result).toEqual({
      shouldRegister: true,
      baseDir: path.resolve("workspace", "apps", "backend", "dist"),
    });
  });

  it("keeps nested compiled paths anchored at dist", () => {
    const runtimeDir = path.resolve(
      "workspace",
      "apps",
      "backend",
      "dist",
      "nested",
      "feature",
    );
    const result = resolveRuntimeAliasRegistration(runtimeDir);

    expect(result).toEqual({
      shouldRegister: true,
      baseDir: path.resolve("workspace", "apps", "backend", "dist"),
    });
  });
});

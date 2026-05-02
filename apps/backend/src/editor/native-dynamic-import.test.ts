import {
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterEach, expect, it } from "vitest";

type NativeDynamicImport = <T>(modulePath: string) => Promise<T>;

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })),
  );
});

function readNativeDynamicImport(value: unknown): NativeDynamicImport {
  const candidate = value as { nativeDynamicImport?: unknown };
  expect(typeof candidate.nativeDynamicImport).toBe("function");
  return candidate.nativeDynamicImport as NativeDynamicImport;
}

it("loads file URL modules with spaces from the CommonJS helper", async () => {
  const tempRoot = await mkdtemp(
    join(tmpdir(), "the-copy dynamic import test "),
  );
  tempDirs.push(tempRoot);
  const modulePath = join(tempRoot, "runtime-module.mjs");

  await writeFile(modulePath, "export const marker = 'runtime-loaded';\n");

  const requireFromTest = createRequire(__filename);
  const helperModule = requireFromTest(
    join(__dirname, "..", "..", "editor-runtime", "native-dynamic-import.cjs"),
  ) as unknown;
  const nativeDynamicImport = readNativeDynamicImport(helperModule);
  const imported = await nativeDynamicImport<{ marker: string }>(
    pathToFileURL(modulePath).href,
  );

  expect(imported.marker).toBe("runtime-loaded");
});

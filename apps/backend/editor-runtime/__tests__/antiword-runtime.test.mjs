import { test } from "node:test";
import { strictEqual } from "node:assert";

import { resolveDefaultAntiwordHomeForRuntime } from "../services/antiword-runtime.mjs";

test("antiword runtime uses the legacy Windows root when resources live directly under it", () => {
  const legacyRoot = "C:\\antiword";
  const existingPaths = new Set([
    legacyRoot,
    `${legacyRoot}\\Default`,
    `${legacyRoot}\\fontnames`,
  ]);

  const resolved = resolveDefaultAntiwordHomeForRuntime({
    exists: (path) => existingPaths.has(path),
    isWindows: true,
    legacyWindowsRoot: legacyRoot,
    vendoredHomePath: "C:\\repo\\.tools\\antiword-app\\Resources",
  });

  strictEqual(resolved, legacyRoot);
});

import { describe, expect, it } from "vitest";

import pagesManifest from "./pages.manifest.json";

describe("generated pages manifest", () => {
  it("does not keep stale routes that no longer exist", () => {
    const paths = pagesManifest.pages.map((page) => page.path);
    expect(paths).not.toContain("/new");
  });
});

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRODUCTION_ID,
  asBoolean,
  asNumber,
  asString,
  estimateSetValue,
  extractNestedRecord,
  failure,
  isRecord,
  mapLocationType,
  parseDimensions,
  parseList,
  slugify,
  success,
  summarizeBook,
  summarizeStyleGuide,
  uniqueById,
} from "@/modules/art-director/handlers-shared";

import type { PluginOutput } from "@/modules/art-director/types";

describe("art director shared responses and primitive parsing", () => {
  it("builds strict success and failure response contracts", () => {
    expect(success({ data: "ok" }, 201)).toEqual({
      status: 201,
      body: { success: true, data: "ok" },
    });
    expect(failure("Not found", 404, { resource: "location" })).toEqual({
      status: 404,
      body: {
        success: false,
        error: "Not found",
        resource: "location",
      },
    });
  });

  it("normalizes primitive values without unsafe coercion", () => {
    expect(asString("  value  ")).toBe("value");
    expect(asString(15, "fallback")).toBe("fallback");
    expect(asBoolean("TRUE")).toBe(true);
    expect(asBoolean("FALSE", true)).toBe(false);
    expect(asBoolean("unexpected", true)).toBe(true);
    expect(asNumber("12.5")).toBe(12.5);
    expect(asNumber(Number.NaN, 7)).toBe(7);
    expect(parseList(["a", "", " b "])).toEqual(["a", "b"]);
    expect(parseList("a, b,, c")).toEqual(["a", "b", "c"]);
  });
});

describe("art director shared mapping helpers", () => {
  it("maps ids, locations, dimensions, and set values deterministically", () => {
    const merged = uniqueById([{ id: "1", name: "old" }], {
      id: "1",
      name: "new",
    });
    const dimensions = parseDimensions("10.5 x 2 x 3");

    expect(slugify("  Nile Studio 2026! ")).toBe("nile-studio-2026");
    expect(slugify("!!!")).toBe(DEFAULT_PRODUCTION_ID);
    expect(merged).toEqual([{ id: "1", name: "new" }]);
    expect(mapLocationType("natural")).toBe("outdoor");
    expect(mapLocationType("STUDIO")).toBe("studio");
    expect(dimensions).toEqual({ width: 10.5, height: 2, depth: 3 });
    expect(estimateSetValue("lighting-rig", dimensions)).toBe(1506);
  });

  it("extracts nested plugin data only when the requested key is a record", () => {
    const output: PluginOutput = {
      success: true,
      data: { location: { id: "loc-1" }, invalid: "missing" },
    };

    expect(extractNestedRecord(output, "location")).toEqual({ id: "loc-1" });
    expect(extractNestedRecord(output, "invalid")).toBeNull();
    expect(isRecord(["not", "record"])).toBe(false);
  });
});

describe("art director shared summarizers", () => {
  it("summarizes production books and ignores malformed sections", () => {
    const summary = summarizeBook({
      id: "book-1",
      title: "Book",
      titleAr: "كتاب",
      createdAt: "2026-04-29T00:00:00.000Z",
      sections: [{ titleAr: "المشهد الأول" }, "broken"],
    });

    expect(summary).toEqual({
      id: "book-1",
      title: "Book",
      titleAr: "كتاب",
      sections: ["المشهد الأول"],
      createdAt: "2026-04-29T00:00:00.000Z",
    });
  });

  it("summarizes style guides from palettes and typography", () => {
    const summary = summarizeStyleGuide({
      id: "style-1",
      title: "Visual Bible",
      titleAr: "",
      colorPalettes: [{ name: "Warm" }, { nameAr: "بارد" }, "broken"],
      typography: {
        primaryFont: "Cairo",
        secondaryFont: "Inter",
      },
    });

    expect(summary).toEqual({
      id: "style-1",
      name: "Visual Bible",
      nameAr: "Visual Bible",
      elements: ["Warm", "بارد", "Cairo", "Inter"],
    });
  });
});

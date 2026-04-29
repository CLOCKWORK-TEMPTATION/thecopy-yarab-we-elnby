import { describe, expect, test } from "vitest";

import { renderRoundNotesSnapshot } from "./round-notes";

describe("round notes snapshot", () => {
  test("renders one current-state snapshot without historical rounds", () => {
    const content = renderRoundNotesSnapshot("## لقطة الحالة الحالية\n\nلا توجد أعطال.");

    expect(content).toContain("# سجل الحالة التنفيذية الحالية");
    expect(content).toContain("هذا الملف يرصد الوضع الحالي فقط");
    expect(content).toContain("## لقطة الحالة الحالية");
    expect(content).not.toContain("## الجولة 001");
    expect(content).not.toContain("## الجولة 999");
  });
});

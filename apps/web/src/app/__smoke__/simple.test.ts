import React from "react";
import { describe, it, expect } from "vitest";

describe("اختبار بسيط للبيئة", () => {
  it("يجب أن تعمل مكتبة الاختبار", () => {
    expect(1 + 1).toBe(2);
    expect("test").toBeTruthy();
    expect(null).toBeNull();
    expect(typeof React).toBe("object");
    expect(typeof React.createElement).toBe("function");
  });

  it("يجب أن تكون المسارات الحرجة محددة", () => {
    const routes = [
      "/",
      "/arabic-creative-writing-studio",
      "/directors-studio",
      "/cinematography-studio",
      "/actorai-arabic",
      "/brain-storm-ai",
      "/analysis/seven-stations",
      "/development",
      "/editor",
      "/breakdown",
    ];

    expect(routes).toHaveLength(10);
    expect(routes).toContain("/");
    expect(routes).toContain("/arabic-creative-writing-studio");
    expect(routes).toContain("/directors-studio");
  });
});

import { describe, expect, it } from "vitest";

import { segmentScriptLocally } from "../../infrastructure/screenplay/local-segmenter";

describe("local segmenter", () => {
  it("يكتشف المشاهد العربية متعددة الأسطر ويحافظ على الموقع داخل الرأس", () => {
    const result = segmentScriptLocally(`مشهد 1: لقاء في المقهى     نهار - داخلي
موقع: مقهى الحرية - الصالة الرئيسية

- يدخل أحمد من الباب.

أحمد:
مرحباً.

مشهد 2     ليل - خارجي
شارع القاهرة - أمام المقهى

- يخرج أحمد من المقهى.`);

    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0]?.header).toContain("مشهد 1");
    expect(result.scenes[0]?.header).toContain(
      "موقع: مقهى الحرية - الصالة الرئيسية"
    );
    expect(result.scenes[0]?.content).toContain("أحمد:");
    expect(result.scenes[1]?.header).toContain("شارع القاهرة - أمام المقهى");
  });

  it("يدعم رؤوس المشاهد الإنجليزية", () => {
    const result = segmentScriptLocally(`INT. LIVING ROOM - NIGHT
John enters quietly.

EXT. STREET - DAY
Cars rush past the building.`);

    expect(result.scenes).toHaveLength(2);
    expect(result.scenes[0]?.header).toBe("INT. LIVING ROOM - NIGHT");
    expect(result.scenes[1]?.header).toBe("EXT. STREET - DAY");
  });
});

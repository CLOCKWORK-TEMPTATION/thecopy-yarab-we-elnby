import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("../../infrastructure/gemini/client", () => ({
  getGeminiClient: () => ({
    models: {
      generateContent,
    },
  }),
}));

import { segmentScript } from "../../infrastructure/gemini/segment-script";

describe("segmentScript fallback", () => {
  beforeEach(() => {
    generateContent.mockReset();
  });

  it("يستخدم التقسيم المحلي عند فشل خدمة النموذج", async () => {
    generateContent.mockRejectedValueOnce(new Error("offline"));

    const result = await segmentScript(`مشهد 1: لقاء     نهار - داخلي
موقع: مقهى الحرية

- يدخل أحمد.`);

    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0]?.header).toContain("مشهد 1");
    expect(result.scenes[0]?.header).toContain("موقع: مقهى الحرية");
  });

  it("يستخدم التقسيم المحلي عند عودة استجابة صالحة لكن فارغة", async () => {
    generateContent.mockResolvedValueOnce({
      text: JSON.stringify({ scenes: [] }),
    });

    const result = await segmentScript(`INT. GARAGE - NIGHT
The mechanic drops the wrench.`);

    expect(result.scenes).toHaveLength(1);
    expect(result.scenes[0]?.header).toBe("INT. GARAGE - NIGHT");
  });
});

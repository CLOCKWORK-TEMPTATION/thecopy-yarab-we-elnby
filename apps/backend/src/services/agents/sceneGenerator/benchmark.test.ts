import { describe, it, expect } from "vitest";

import { sceneGeneratorAgent } from "./SceneGeneratorAgent";

const sampleText = `
سالم: "ماذا نفعل الآن؟"
أحمد: "لا أعرف، ربما يجب أن ننتظر."
سالم: "لا يمكننا الانتظار طويلا!"
(يدخل رجل غريب)
الرجل: "هل تبحثون عن شيء؟"
`.repeat(100);

describe("SceneGeneratorAgent Performance", () => {
  it("should benchmark countCharacters (contains loop calling regex)", async () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      (sceneGeneratorAgent as any).countCharacters(sampleText);
    }
    const end = performance.now();
    console.log(`Time taken for ${iterations} iterations (countCharacters): ${(end - start).toFixed(2)} ms`);
    expect(end - start).toBeGreaterThan(0);
  }, 30000);

  it("should benchmark assessDialogueQuality", async () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      await (sceneGeneratorAgent as any).assessDialogueQuality(sampleText);
    }
    const end = performance.now();
    console.log(`Time taken for ${iterations} iterations (assessDialogueQuality): ${(end - start).toFixed(2)} ms`);
    expect(end - start).toBeGreaterThan(0);
  }, 30000);

  it("should benchmark assessPacing", async () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      await (sceneGeneratorAgent as any).assessPacing(sampleText);
    }
    const end = performance.now();
    console.log(`Time taken for ${iterations} iterations (assessPacing): ${(end - start).toFixed(2)} ms`);
    expect(end - start).toBeGreaterThan(0);
  }, 30000);

  it("should benchmark calculateDialoguePercentage", async () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      (sceneGeneratorAgent as any).calculateDialoguePercentage(sampleText);
    }
    const end = performance.now();
    console.log(`Time taken for ${iterations} iterations (calculateDialoguePercentage): ${(end - start).toFixed(2)} ms`);
    expect(end - start).toBeGreaterThan(0);
  }, 30000);
});

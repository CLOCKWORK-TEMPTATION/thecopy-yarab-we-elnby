import { describe, it, expect } from "vitest";

import { logger } from "@/lib/logger";

import { sceneGeneratorAgent } from "./SceneGeneratorAgent";

interface SceneGeneratorInternals {
  countCharacters(text: string): number;
  assessDialogueQuality(text: string): Promise<number>;
  assessPacing(text: string): Promise<number>;
  calculateDialoguePercentage(text: string): number;
}

function agentInternals(): SceneGeneratorInternals {
  return sceneGeneratorAgent as unknown as SceneGeneratorInternals;
}

const sampleText = `
سالم: "ماذا نفعل الآن؟"
أحمد: "لا أعرف، ربما يجب أن ننتظر."
سالم: "لا يمكننا الانتظار طويلا!"
(يدخل رجل غريب)
الرجل: "هل تبحثون عن شيء؟"
`.repeat(100);

describe("SceneGeneratorAgent Performance", () => {
  it("should benchmark countCharacters (contains loop calling regex)", () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      agentInternals().countCharacters(sampleText);
    }
    const end = performance.now();
    logger.info(
      `Time taken for ${iterations} iterations (countCharacters): ${(end - start).toFixed(2)} ms`,
    );
    expect(end - start).toBeGreaterThan(0);
  }, 30000);

  it("should benchmark assessDialogueQuality", async () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      await agentInternals().assessDialogueQuality(sampleText);
    }
    const end = performance.now();
    logger.info(
      `Time taken for ${iterations} iterations (assessDialogueQuality): ${(end - start).toFixed(2)} ms`,
    );
    expect(end - start).toBeGreaterThan(0);
  }, 30000);

  it("should benchmark assessPacing", async () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      await agentInternals().assessPacing(sampleText);
    }
    const end = performance.now();
    logger.info(
      `Time taken for ${iterations} iterations (assessPacing): ${(end - start).toFixed(2)} ms`,
    );
    expect(end - start).toBeGreaterThan(0);
  }, 30000);

  it("should benchmark calculateDialoguePercentage", () => {
    const start = performance.now();
    const iterations = 50000;
    for (let i = 0; i < iterations; i++) {
      agentInternals().calculateDialoguePercentage(sampleText);
    }
    const end = performance.now();
    logger.info(
      `Time taken for ${iterations} iterations (calculateDialoguePercentage): ${(end - start).toFixed(2)} ms`,
    );
    expect(end - start).toBeGreaterThan(0);
  }, 30000);
});

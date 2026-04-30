import { describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { AudienceResonanceAgent } from "./AudienceResonanceAgent";

import type {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

const { mockExecuteStandardPattern } = vi.hoisted(() => ({
  mockExecuteStandardPattern:
    vi.fn<(prompt: string) => Promise<StandardAgentOutput>>(),
}));

vi.mock("../shared/standardAgentPattern", () => ({
  executeStandardAgentPattern: mockExecuteStandardPattern,
}));

class TestableAudienceResonanceAgent extends AudienceResonanceAgent {
  buildPromptForTest(input: StandardAgentInput): string {
    return this.buildPrompt(input);
  }
}

describe("AudienceResonanceAgent", () => {
  beforeEach(() => {
    mockExecuteStandardPattern.mockResolvedValue({
      confidence: 0.85,
      metadata: { mockData: true },
      notes: ["Mock note"],
      text: "MOCKED_AUDIENCE_RESONANCE\n\n1. Emotional Journey\nStrong emotional impact.\n\n2. Target Demographic\nPerfect for young adults.",
    });
  });

  it("should initialize with correct name and task type", () => {
    const agent = new AudienceResonanceAgent();
    const config = agent.getConfig();
    expect(config.name).toBe("EmpathyMatrix AI");
    expect(config.taskType).toBe(TaskType.AUDIENCE_RESONANCE);
  });

  it("should build prompt with correct context formatting", () => {
    const agent = new TestableAudienceResonanceAgent();
    const prompt = agent.buildPromptForTest({
      input: "Analyze audience resonance for this plot",
      context: {
        originalText: "Once upon a time in a far away land...",
        targetAudience: {
          demographics: {
            ageRange: "Adults",
          },
        },
        contentType: "Thriller",
      },
    });

    expect(prompt).toContain("Analyze audience resonance");
    expect(prompt).toContain("Once upon a time");
    expect(prompt).toContain("Adults");
    expect(prompt).toContain("Thriller");
  });

  it("should execute task and return processed output", async () => {
    const agent = new AudienceResonanceAgent();
    const result = await agent.executeTask({
      input: "Analyze audience resonance",
    });

    expect(result.text).toContain("MOCKED_AUDIENCE_RESONANCE");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.metadata?.["actionability"]).toBeDefined();
  });

  it("should correctly assess actionability", async () => {
    const agent = new AudienceResonanceAgent();
    const analysisText =
      "Here are recommendations:\n1. Change pacing\n2. Add more dialogue\nThis will fix the plot.";
    mockExecuteStandardPattern.mockResolvedValueOnce({
      confidence: 0.85,
      metadata: {},
      notes: [],
      text: analysisText,
    });

    const result = await agent.executeTask({
      input: "Analyze audience actionability",
    });
    const score = result.metadata?.["actionability"];

    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThan(0.6);
  });
});

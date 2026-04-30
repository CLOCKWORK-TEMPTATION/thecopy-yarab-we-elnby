import { describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { IntegratedAgent } from "./IntegratedAgent";

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

class TestableIntegratedAgent extends IntegratedAgent {
  buildPromptForTest(input: StandardAgentInput): string {
    return this.buildPrompt(input);
  }
}

describe("IntegratedAgent", () => {
  beforeEach(() => {
    mockExecuteStandardPattern.mockResolvedValue({
      confidence: 0.88,
      metadata: { mockData: true },
      notes: ["Mock note"],
      text: "MOCKED_INTEGRATED_SYNTHESIS\n\n1. Intelligent Integration\nCombined themes and characters.\n\n2. Holistic Coherence\nEverything fits well.",
    });
  });

  it("should initialize with correct name and task type", () => {
    const agent = new IntegratedAgent();
    const config = agent.getConfig();
    expect(config.name).toBe("SynthesisOrchestrator AI");
    expect(config.taskType).toBe(TaskType.INTEGRATED);
  });

  it("should build prompt with correct context formatting", () => {
    const agent = new TestableIntegratedAgent();
    const prompt = agent.buildPromptForTest({
      input: "Synthesize these results",
      context: {
        originalText: "Once upon a time in a far away land...",
        analysisResults: {
          mainFindings: "Strong characters.",
        },
        creativeResults: {
          content: "New story outline.",
        },
        integrationStrategy: "parallel",
        synthesisDepth: "deep",
      },
    });

    expect(prompt).toContain("Synthesize these results");
    expect(prompt).toContain("Once upon a time");
    expect(prompt).toContain("Strong characters.");
    expect(prompt).toContain("New story outline.");
    expect(prompt).toContain("عميق"); // "deep" translated
    expect(prompt).toContain("متوازي"); // "parallel" translated
  });

  it("should execute task and return processed output", async () => {
    const agent = new IntegratedAgent();
    const result = await agent.executeTask({
      input: "Synthesize these results",
    });

    expect(result.text).toContain("MOCKED_INTEGRATED_SYNTHESIS");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.metadata?.["integrationQuality"]).toBeDefined();
  });

  it("should correctly assess overall quality", async () => {
    const agent = new IntegratedAgent();
    const analysisText =
      "Here are recommendations:\nThis is highly coherent and intelligent integration. Excellent quality. توصية ممتازة وتوليف ممتاز.";
    mockExecuteStandardPattern.mockResolvedValueOnce({
      confidence: 0.88,
      metadata: {},
      notes: [],
      text: analysisText,
    });

    const result = await agent.executeTask({
      input: "Synthesize quality",
    });
    const score = result.metadata?.["overallQuality"];

    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThan(0.5);
  });
});

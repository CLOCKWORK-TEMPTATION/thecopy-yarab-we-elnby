import { describe, expect, it, vi } from "vitest";

import { TaskType } from "@core/types";

import { AnalysisAgent } from "./AnalysisAgent";

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

class TestableAnalysisAgent extends AnalysisAgent {
  buildPromptForTest(input: StandardAgentInput): string {
    return this.buildPrompt(input);
  }
}

describe("AnalysisAgent", () => {
  beforeEach(() => {
    mockExecuteStandardPattern.mockResolvedValue({
      confidence: 0.8,
      metadata: { mockData: true },
      notes: ["Mock note"],
      text: "MOCKED_ANALYSIS\n\n1. Structural Assessment\nStrong structure.\n\n2. Thematic Analysis\nGood themes.\n\n3. Recommendations\nImprove pacing.",
    });
  });

  it("should initialize with correct name and task type", () => {
    const agent = new AnalysisAgent();
    const config = agent.getConfig();
    expect(config.name).toBe("CritiqueArchitect AI");
    expect(config.taskType).toBe(TaskType.ANALYSIS);
  });

  it("should build prompt with correct context formatting", () => {
    const agent = new TestableAnalysisAgent();
    const prompt = agent.buildPromptForTest({
      input: "Analyze this plot",
      context: {
        originalText: "Once upon a time in a far away land...",
        genre: "Fantasy",
        targetAudience: "Young Adults",
        analysisDepth: "deep",
        focusAreas: ["Pacing", "Character Motivation"],
      },
    });

    expect(prompt).toContain("Analyze this plot");
    expect(prompt).toContain("Once upon a time");
    expect(prompt).toContain("Fantasy");
    expect(prompt).toContain("Young Adults");
    expect(prompt).toContain("Pacing");
    expect(prompt).toContain("Character Motivation");
  });

  it("should execute task and return processed output", async () => {
    const agent = new AnalysisAgent();
    const result = await agent.executeTask({
      input: "Analyze this plot",
    });

    expect(result.text).toContain("MOCKED_ANALYSIS");
    expect(result.metadata?.["analysisType"]).toBeDefined();

    const wordCount = result.metadata?.["wordCount"];
    expect(typeof wordCount).toBe("number");
    expect(wordCount).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it("should correctly assess analytical depth for long text", async () => {
    const agent = new AnalysisAgent();
    const veryLongText = Array(3000)
      .fill("analysis structure plot character")
      .join(" ");
    mockExecuteStandardPattern.mockResolvedValueOnce({
      confidence: 0.9,
      metadata: {},
      notes: [],
      text: veryLongText,
    });

    const result = await agent.executeTask({
      input: "Analyze depth",
    });
    const score = result.metadata?.["analyticalDepth"];

    expect(typeof score).toBe("number");
    expect(score).toBeGreaterThan(0.8);
  });
});

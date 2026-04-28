import { describe, expect, it } from "vitest";

import { contextAssemblyService } from "./context-assembly.service";

const mockHits = [
  {
    text: "تحليل من النص الخام",
    source: "request-document",
    type: "ad-hoc",
    collection: "AdHocChunks",
    chunkIndex: 0,
    relevanceScore: 0.9,
    rank: 1,
    metadata: {},
  },
  {
    text: "مقتطف برمجي مهم",
    source: "apps/backend/src/example.ts",
    type: "code",
    collection: "CodeChunks",
    chunkIndex: 1,
    relevanceScore: 0.8,
    rank: 2,
    metadata: {},
  },
  {
    text: "قرار معماري معتمد",
    source: "docs/adr-001.md",
    type: "decision",
    collection: "Decisions",
    chunkIndex: 2,
    relevanceScore: 0.7,
    rank: 3,
    metadata: {
      decisionId: "ADR-001",
    },
  },
];

describe("ContextAssemblyService", () => {
  it("should build a context result with profile metadata", () => {
    const context = contextAssemblyService.buildContext(
      {
        query: "حلل هذا السياق",
        agentId: "agent-1",
        profile: "analysis",
      },
      mockHits,
    );

    expect(context.profile).toBe("analysis");
    expect(context.results.length).toBeGreaterThan(0);
    expect(context.relevantDecisions).toContain("ADR-001");
    expect(context.summary).toContain("profile");
  });

  it("should produce different prompt headings per profile", () => {
    const analysisPrompt = contextAssemblyService.buildAugmentedPrompt(
      "ابدأ",
      mockHits,
      "analysis",
    );
    const codePrompt = contextAssemblyService.buildAugmentedPrompt(
      "ابدأ",
      mockHits,
      "code",
    );

    expect(analysisPrompt).toContain("سياق تحليلي");
    expect(codePrompt).toContain("سياق برمجي");
  });

  it("should enforce profile-specific chunk limits", () => {
    const completionHits = contextAssemblyService.selectHits(
      mockHits,
      "completion",
      10,
    );
    const summarizationHits = contextAssemblyService.selectHits(
      mockHits,
      "summarization",
      10,
    );

    expect(completionHits.length).toBeLessThanOrEqual(4);
    expect(summarizationHits.length).toBeLessThanOrEqual(8);
  });
});

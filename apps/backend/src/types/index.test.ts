import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  PipelineInputSchema,
  type ApiResponse,
  type PipelineRunResult,
  type Station1Output,
  type StationOutput,
} from "./index";

// Type guard helper for safeParse results
function assertSuccess<T>(result: { success: true; data: T } | { success: false; error: z.ZodError }): asserts result is { success: true; data: T } {
  if (!result.success) {
    throw new Error("Expected valid pipeline input.");
  }
}

function assertFailure<T>(result: { success: true; data: T } | { success: false; error: z.ZodError }): asserts result is { success: false; error: z.ZodError } {
  if (result.success) {
    throw new Error("Expected invalid pipeline input.");
  }
}

function parseValid(input: unknown) {
  const result = PipelineInputSchema.safeParse(input);
  assertSuccess(result);
  return result.data;
}

function parseInvalid(input: unknown) {
  const result = PipelineInputSchema.safeParse(input);
  assertFailure(result);
  return result.error;
}

function station(
  stationId: number,
  status: StationOutput["status"] = "completed",
): StationOutput {
  return {
    stationId,
    stationName: `Station ${stationId}`,
    executionTime: 100 * stationId,
    status,
    timestamp: "2024-01-01T00:00:00Z",
  };
}

function stationOne(): Station1Output {
  return {
    ...station(1),
    majorCharacters: ["Character A", "Character B"],
    relationships: [
      {
        character1: "Character A",
        character2: "Character B",
        relationshipType: "friend",
        strength: 0.8,
      },
    ],
    narrativeStyleAnalysis: {
      overallTone: "dramatic",
      pacing: "fast",
      complexity: 3,
    },
  };
}

function completePipelineResult(): PipelineRunResult {
  return {
    stationOutputs: {
      station1: stationOne(),
      station2: station(2),
      station3: station(3),
      station4: station(4),
      station5: station(5),
      station6: station(6),
      station7: station(7),
    },
    pipelineMetadata: {
      agentsUsed: 7,
      averageConfidence: 0.85,
      finishedAt: "2024-01-01T00:00:05Z",
      startedAt: "2024-01-01T00:00:00Z",
      stationsCompleted: 7,
      successfulAgents: 7,
      totalExecutionTime: 4900,
    },
  };
}

describe("PipelineInputSchema", () => {
  it("accepts minimal input and applies strict defaults", () => {
    const data = parseValid({
      fullText: "Sample screenplay text",
      projectName: "Test Project",
    });

    expect(data.language).toBe("ar");
    expect(data.context).toEqual({});
    expect(data.flags).toEqual({
      fastMode: false,
      runStations: true,
      skipValidation: false,
      verboseLogging: false,
    });
    expect(data.agents).toEqual({ temperature: 0.2 });
  });

  it("accepts complete Arabic and English inputs", () => {
    const arabic = parseValid({
      agents: { maxTokens: 2000, model: "gpt-4", temperature: 0.5 },
      context: {
        author: "Author Name",
        genre: "Drama",
        sceneHints: ["hint1", "hint2"],
        title: "Film Title",
      },
      flags: {
        fastMode: false,
        runStations: true,
        skipValidation: false,
        verboseLogging: true,
      },
      fullText: "هذا نص عربي للسيناريو",
      language: "ar",
      projectName: "مشروع عربي",
      proseFilePath: "/path/to/file.txt",
    });
    const english = parseValid({
      fullText: "English text",
      language: "en",
      projectName: "English Project",
    });

    expect(arabic.context.title).toBe("Film Title");
    expect(arabic.flags.verboseLogging).toBe(true);
    expect(arabic.agents.temperature).toBe(0.5);
    expect(english.language).toBe("en");
  });

  it("rejects missing fullText", () => {
    expect(PipelineInputSchema.safeParse({ fullText: "", projectName: "Test" }).success).toBe(false);
    expect(parseInvalid({ fullText: "", projectName: "Test" }).errors[0]?.message).toContain("النص مطلوب");
  });

  it("rejects missing projectName field", () => {
    expect(PipelineInputSchema.safeParse({ projectName: "Test" }).success).toBe(false);
  });

  it("rejects empty projectName", () => {
    expect(PipelineInputSchema.safeParse({ fullText: "Test", projectName: "" }).success).toBe(false);
    expect(parseInvalid({ fullText: "Test", projectName: "" }).errors[0]?.message).toContain("اسم المشروع مطلوب");
  });

  it("rejects missing both required fields", () => {
    expect(PipelineInputSchema.safeParse({ fullText: "Test text" }).success).toBe(false);
  });

  it("rejects invalid language code", () => {
    expect(PipelineInputSchema.safeParse({ fullText: "Test", language: "fr", projectName: "Test" }).success).toBe(false);
  });

  it("rejects out-of-range temperature", () => {
    expect(PipelineInputSchema.safeParse({ agents: { temperature: 3 }, fullText: "Test", projectName: "Test" }).success).toBe(false);
  });

  it("rejects invalid flags type", () => {
    expect(PipelineInputSchema.safeParse({ flags: "invalid", fullText: "Test", projectName: "Test" }).success).toBe(false);
  });

  it("rejects invalid context type", () => {
    expect(PipelineInputSchema.safeParse({ context: "invalid", fullText: "Test", projectName: "Test" }).success).toBe(false);
  });
});

describe("station and pipeline result contracts", () => {
  it("models base station output with failed status and details", () => {
    const failed: StationOutput = {
      ...station(2, "failed"),
      details: { error: "Analysis failed" },
    };
    expect(failed.details?.["error"]).toBe("Analysis failed");
  });

  it("models station one output with nested relationship fields", () => {
    const first = stationOne();
    expect(first.majorCharacters).toHaveLength(2);
    expect(first.narrativeStyleAnalysis.complexity).toBe(3);

    const relationship = first.relationships[0];
    expect(relationship?.strength).toBe(0.8);
  });

  it("models successful pipeline run", () => {
    const result = completePipelineResult();
    expect(result.stationOutputs.station1.status).toBe("completed");
    expect(result.pipelineMetadata.averageConfidence).toBe(0.85);
  });

  it("models partially failed pipeline runs", () => {
    const result = completePipelineResult();
    const failedResult: PipelineRunResult = {
      ...result,
      pipelineMetadata: {
        ...result.pipelineMetadata,
        stationsCompleted: 6,
      },
      stationOutputs: {
        ...result.stationOutputs,
        station2: {
          ...station(2, "failed"),
          details: { error: "Analysis failed" },
        },
      },
    };
    expect(failedResult.stationOutputs.station2.status).toBe("failed");
    expect(failedResult.stationOutputs.station2.details?.["error"]).toBe("Analysis failed");
  });
});

describe("ApiResponse and schema composition", () => {
  it("models success, error, minimal, and nested API responses", () => {
    const successResponse: ApiResponse<{ id: string }> = {
      data: { id: "123" },
      message: "Operation completed",
      success: true,
    };
    const errorResponse: ApiResponse = {
      error: "Something went wrong",
      message: "Error occurred",
      success: false,
    };
    const nestedResponse: ApiResponse<{
      count: number;
      items: string[];
      nested: { value: boolean };
    }> = {
      data: {
        count: 3,
        items: ["a", "b", "c"],
        nested: { value: true },
      },
      success: true,
    };

    expect(successResponse.data?.id).toBe("123");
    expect(errorResponse.error).toBe("Something went wrong");
    expect(nestedResponse.data?.items).toHaveLength(3);
    expect(({ success: true } satisfies ApiResponse).success).toBe(true);
  });

  it("supports zod extension, partial, pick, and omit operations", () => {
    const extended = PipelineInputSchema.extend({ extraField: z.string() });
    const partial = PipelineInputSchema.partial();
    const picked = PipelineInputSchema.pick({
      fullText: true,
      projectName: true,
    });
    const omitted = PipelineInputSchema.omit({
      context: true,
      proseFilePath: true,
    });

    expect(
      extended.safeParse({
        extraField: "extra",
        fullText: "Test",
        projectName: "Test",
      }).success,
    ).toBe(true);
    expect(partial.safeParse({ projectName: "Updated Name" }).success).toBe(
      true,
    );
    expect(
      picked.safeParse({ fullText: "Test", projectName: "Test" }).success,
    ).toBe(true);
    expect(
      omitted.safeParse({
        agents: { temperature: 0.5 },
        flags: { runStations: true },
        fullText: "Test",
        language: "ar",
        projectName: "Test",
      }).success,
    ).toBe(true);
  });
});

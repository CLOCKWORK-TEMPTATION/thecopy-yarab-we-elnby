import { logger } from "@/lib/logger";
import {
  PipelineInput,
  PipelineRunResult,
  Station1Output,
  StationOutput,
} from "@/types";

import {
  multiAgentOrchestrator,
  TaskType,
  type OrchestrationOutput,
} from "./agents";
import { agentRegistry } from "./agents/registry";
import {
  analysisStreamRegistry,
  type StationId,
} from "./analysisStream.registry";

import type { StandardAgentOutput } from "./agents/core/types";

/**
 * Maps the seven user-facing stations to the underlying agent task types.
 * Order matters — events are emitted in this order during streaming.
 */
const STATION_TASKS: { stationId: StationId; task: TaskType }[] = [
  { stationId: 1, task: TaskType.CHARACTER_DEEP_ANALYZER },
  { stationId: 2, task: TaskType.DIALOGUE_ADVANCED_ANALYZER },
  { stationId: 3, task: TaskType.VISUAL_CINEMATIC_ANALYZER },
  { stationId: 4, task: TaskType.THEMES_MESSAGES_ANALYZER },
  { stationId: 5, task: TaskType.CULTURAL_HISTORICAL_ANALYZER },
  { stationId: 6, task: TaskType.PRODUCIBILITY_ANALYZER },
  { stationId: 7, task: TaskType.TARGET_AUDIENCE_ANALYZER },
];

export class AnalysisService {
  /**
   * NEW: Multi-Agent Pipeline using advanced orchestration
   * This replaces the simplified seven stations with real AI agents
   */
  async runFullPipeline(input: PipelineInput): Promise<PipelineRunResult> {
    const startTime = Date.now();
    logger.info("Starting multi-agent analysis pipeline", {
      projectName: input.projectName,
    });

    try {
      // Define the agents to run for comprehensive analysis
      const agentTasks: TaskType[] = [
        TaskType.CHARACTER_DEEP_ANALYZER,
        TaskType.DIALOGUE_ADVANCED_ANALYZER,
        TaskType.VISUAL_CINEMATIC_ANALYZER,
        TaskType.THEMES_MESSAGES_ANALYZER,
        TaskType.CULTURAL_HISTORICAL_ANALYZER,
        TaskType.PRODUCIBILITY_ANALYZER,
        TaskType.TARGET_AUDIENCE_ANALYZER,
      ];

      // Execute multi-agent orchestration
      const orchestrationResult = await multiAgentOrchestrator.executeAgents({
        fullText: input.fullText,
        projectName: input.projectName,
        taskTypes: agentTasks,
        context: {
          projectName: input.projectName,
          language: input.language,
          ...input.context,
        },
        options: {
          parallel: true, // Run agents in parallel for efficiency
          includeMetadata: true,
        },
      });

      // Convert agent results to station outputs for compatibility
      const stationOutputs = this.convertAgentResultsToStations(
        orchestrationResult,
        input,
      );

      const endTime = Date.now();

      return {
        stationOutputs: stationOutputs,
        pipelineMetadata: {
          stationsCompleted: 7,
          totalExecutionTime: orchestrationResult.summary.totalExecutionTime,
          startedAt:
            orchestrationResult.metadata?.startedAt ??
            new Date(startTime).toISOString(),
          finishedAt:
            orchestrationResult.metadata?.finishedAt ??
            new Date(endTime).toISOString(),
          agentsUsed: agentTasks.length,
          averageConfidence: orchestrationResult.summary.averageConfidence,
          successfulAgents: orchestrationResult.summary.successfulTasks,
        },
      };
    } catch (error) {
      logger.error("Multi-agent pipeline execution failed:", error);
      throw error;
    }
  }

  /**
   * Convert agent orchestration results to station output format
   * This maintains backward compatibility with the frontend
   */
  private convertAgentResultsToStations(
    orchestrationResult: OrchestrationOutput,
    _input: PipelineInput,
  ): PipelineRunResult["stationOutputs"] {
    const results = orchestrationResult.results;

    const characterAnalysis = results.get(TaskType.CHARACTER_DEEP_ANALYZER);
    const dialogueAnalysis = results.get(TaskType.DIALOGUE_ADVANCED_ANALYZER);
    const visualAnalysis = results.get(TaskType.VISUAL_CINEMATIC_ANALYZER);
    const themesAnalysis = results.get(TaskType.THEMES_MESSAGES_ANALYZER);
    const culturalAnalysis = results.get(TaskType.CULTURAL_HISTORICAL_ANALYZER);
    const producibilityAnalysis = results.get(TaskType.PRODUCIBILITY_ANALYZER);
    const audienceAnalysis = results.get(TaskType.TARGET_AUDIENCE_ANALYZER);
    const station1 = this.runStation1(characterAnalysis);
    const station2 = this.runStation2(dialogueAnalysis);
    const station3 = this.runStation3(visualAnalysis);
    const station4 = this.runStation4(themesAnalysis);
    const station5 = this.runStation5(culturalAnalysis);
    const station6 = this.runStation6(producibilityAnalysis);
    const station7 = this.runStation7(audienceAnalysis, results);

    return {
      station1,
      station2,
      station3,
      station4,
      station5,
      station6,
      station7,
    };
  }

  private buildStationDetails(
    agentResult: StandardAgentOutput | undefined,
    extraDetails?: Record<string, unknown>,
  ) {
    return {
      fullAnalysis: agentResult?.text ?? "",
      confidence: agentResult?.confidence ?? 0,
      notes: Array.isArray(agentResult?.notes) ? agentResult.notes : [],
      ...(extraDetails ?? {}),
    };
  }

  private runStation1(
    characterAnalysis: StandardAgentOutput | undefined,
  ): Station1Output {
    return {
      stationId: 1,
      stationName: "التحليل العميق للشخصيات",
      executionTime: this.getProcessingTime(characterAnalysis),
      status: "completed",
      timestamp: new Date().toISOString(),
      majorCharacters: this.extractCharacters(characterAnalysis?.text ?? ""),
      relationships: this.extractRelationships(characterAnalysis?.text ?? ""),
      narrativeStyleAnalysis: {
        overallTone: "درامي",
        pacing: "متوسط",
        complexity: 8,
      },
      details: this.buildStationDetails(characterAnalysis),
    };
  }

  private runStation2(
    dialogueAnalysis: StandardAgentOutput | undefined,
  ): StationOutput {
    return {
      stationId: 2,
      stationName: "التحليل المتقدم للحوار",
      executionTime: this.getProcessingTime(dialogueAnalysis),
      status: "completed",
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(dialogueAnalysis),
    };
  }

  private runStation3(
    visualAnalysis: StandardAgentOutput | undefined,
  ): StationOutput {
    return {
      stationId: 3,
      stationName: "التحليل البصري والسينمائي",
      executionTime: this.getProcessingTime(visualAnalysis),
      status: "completed",
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(visualAnalysis),
    };
  }

  private runStation4(
    themesAnalysis: StandardAgentOutput | undefined,
  ): StationOutput {
    return {
      stationId: 4,
      stationName: "تحليل الموضوعات والرسائل",
      executionTime: this.getProcessingTime(themesAnalysis),
      status: "completed",
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(themesAnalysis),
    };
  }

  private runStation5(
    culturalAnalysis: StandardAgentOutput | undefined,
  ): StationOutput {
    return {
      stationId: 5,
      stationName: "التحليل الثقافي والتاريخي",
      executionTime: this.getProcessingTime(culturalAnalysis),
      status: "completed",
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(culturalAnalysis),
    };
  }

  private runStation6(
    producibilityAnalysis: StandardAgentOutput | undefined,
  ): StationOutput {
    return {
      stationId: 6,
      stationName: "تحليل قابلية الإنتاج",
      executionTime: this.getProcessingTime(producibilityAnalysis),
      status: "completed",
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(producibilityAnalysis),
    };
  }

  private runStation7(
    audienceAnalysis: StandardAgentOutput | undefined,
    results: Map<TaskType, StandardAgentOutput>,
  ): StationOutput {
    return {
      stationId: 7,
      stationName: "تحليل الجمهور المستهدف والتقرير النهائي",
      executionTime: this.getProcessingTime(audienceAnalysis),
      status: "completed",
      timestamp: new Date().toISOString(),
      details: this.buildStationDetails(audienceAnalysis, {
        finalReport: this.generateFinalReport(results),
      }),
    };
  }

  /**
   * Extract character names from analysis text (simplified)
   */
  private extractCharacters(analysisText: string): string[] {
    // Simple extraction - look for patterns indicating character names
    const characters: string[] = [];
    const lines = analysisText.split("\n");

    for (const line of lines) {
      if (
        line.includes("شخصية") ||
        line.includes("الشخصيات") ||
        line.includes("البطل")
      ) {
        const matches = line.match(/[\u0600-\u06FF\s]+/g);
        if (matches) {
          characters.push(...matches.filter((m) => m.trim().length > 2));
        }
      }
    }

    return [...new Set(characters)].slice(0, 10);
  }

  private extractRelationships(text: string): {
    character1: string;
    character2: string;
    relationshipType: string;
    strength: number;
  }[] {
    if (!text.trim()) {
      return [];
    }

    const names = (text.match(/[\u0600-\u06FF]{3,}/g) ?? [])
      .map((value) => value.trim())
      .filter((value) => value.length >= 3);

    const relationshipType = text.includes("حب")
      ? "حب"
      : text.includes("صراع")
        ? "صراع"
        : text.includes("صداقة")
          ? "صداقة"
          : "غير محددة";

    return [
      {
        character1: names[0] ?? "الشخصية الأولى",
        character2: names[1] ?? "الشخصية الثانية",
        relationshipType,
        strength: 0.5,
      },
    ];
  }

  /**
   * Generate comprehensive final report from all agent results
   */
  private generateFinalReport(
    results: Map<TaskType, StandardAgentOutput>,
  ): string {
    let report = "# التقرير التحليلي الشامل\n\n";

    // Add summaries from each agent
    const agentNames = [
      { type: TaskType.CHARACTER_DEEP_ANALYZER, title: "## تحليل الشخصيات" },
      { type: TaskType.DIALOGUE_ADVANCED_ANALYZER, title: "## تحليل الحوار" },
      { type: TaskType.VISUAL_CINEMATIC_ANALYZER, title: "## التحليل البصري" },
      {
        type: TaskType.THEMES_MESSAGES_ANALYZER,
        title: "## الموضوعات والرسائل",
      },
      {
        type: TaskType.CULTURAL_HISTORICAL_ANALYZER,
        title: "## السياق الثقافي",
      },
      { type: TaskType.PRODUCIBILITY_ANALYZER, title: "## قابلية الإنتاج" },
      { type: TaskType.TARGET_AUDIENCE_ANALYZER, title: "## الجمهور المستهدف" },
    ];

    for (const agent of agentNames) {
      const result = results.get(agent.type);
      if (result?.text) {
        report += `${agent.title}\n${result.text.substring(0, 500)}...\n\n`;
      }
    }

    report += "## الخلاصة\n";
    report += "تم إجراء تحليل شامل باستخدام نظام الوكلاء المتعددين المتقدم.\n";

    return report;
  }

  // ==========================================================================
  // Streaming pipeline (SSE-backed)
  // ==========================================================================
  /**
   * Run the full pipeline for a session previously created in
   * `analysisStreamRegistry`. Emits per-station events as each agent completes.
   *
   * The agents themselves do not currently expose token-level streaming, so we
   * surface real progress at the station boundary plus a single 0.5 progress
   * tick per station so the UI can show motion. No fake progress beyond that.
   */
  async runFullPipelineStreaming(args: {
    analysisId: string;
    fullText: string;
    projectName: string;
    language?: string;
  }): Promise<void> {
    const start = Date.now();
    const { analysisId } = args;
    const reg = analysisStreamRegistry;

    reg.emit(analysisId, {
      type: "pipeline.started",
      analysisId,
      projectName: args.projectName,
      capabilities: { exports: ["json", "docx", "pdf"] },
    });

    const results = new Map<TaskType, unknown>();
    let allOk = true;

    for (const { stationId, task } of STATION_TASKS) {
      const stationStart = Date.now();
      const at = new Date().toISOString();
      const stationName = this.stationNameFor(stationId);
      reg.emit(analysisId, {
        type: "station.started",
        stationId,
        name: stationName,
        at,
      });
      reg.emit(analysisId, {
        type: "station.progress",
        stationId,
        progress: 0.1,
      });

      try {
        const agent = agentRegistry.getAgent(task);
        if (!agent) {
          throw new Error(`Agent not registered for task ${task}`);
        }

        reg.emit(analysisId, {
          type: "station.progress",
          stationId,
          progress: 0.5,
        });

        const output = await agent.executeTask({
          input: args.fullText,
          context: {
            projectName: args.projectName,
            language: args.language ?? "ar",
            previousResults: Object.fromEntries(results),
          },
          options: {
            enableRAG: true,
            enableSelfCritique: true,
            enableConstitutional: true,
            enableUncertainty: true,
            enableHallucination: true,
          },
        });

        results.set(task, output);
        const stationOutput = this.buildStationFor(stationId, output, results);
        const confidence = this.extractConfidence(output);

        reg.emit(analysisId, {
          type: "station.completed",
          stationId,
          output: stationOutput,
          confidence,
          durationMs: Date.now() - stationStart,
        });
      } catch (err) {
        allOk = false;
        const message = err instanceof Error ? err.message : "فشل غير متوقع";
        logger.error("Streaming station failed", {
          analysisId,
          stationId,
          message,
        });
        reg.emit(analysisId, { type: "station.error", stationId, message });
        reg.emit(analysisId, {
          type: "pipeline.warning",
          warning: {
            id: `${analysisId}:${stationId}:error`,
            stationId,
            severity: "error",
            message,
            at: new Date().toISOString(),
          },
        });
      }
    }

    reg.emit(analysisId, {
      type: "pipeline.completed",
      status: allOk ? "completed" : "failed",
      durationMs: Date.now() - start,
    });
  }

  /**
   * Re-run a single station/agent. Returns the freshly built station output.
   * Used by the per-station retry endpoint.
   */
  async retryStation(args: {
    analysisId: string;
    stationId: StationId;
    fullText: string;
    projectName: string;
    language?: string;
  }): Promise<unknown> {
    const mapping = STATION_TASKS.find((m) => m.stationId === args.stationId);
    if (!mapping) {
      throw new Error(`Unknown stationId ${args.stationId}`);
    }
    const agent = agentRegistry.getAgent(mapping.task);
    if (!agent) {
      throw new Error(`Agent not registered for task ${mapping.task}`);
    }

    const reg = analysisStreamRegistry;
    const at = new Date().toISOString();
    const stationName = this.stationNameFor(args.stationId);
    reg.emit(args.analysisId, {
      type: "station.started",
      stationId: args.stationId,
      name: stationName,
      at,
    });
    reg.emit(args.analysisId, {
      type: "station.progress",
      stationId: args.stationId,
      progress: 0.5,
    });

    const start = Date.now();
    try {
      const output = await agent.executeTask({
        input: args.fullText,
        context: {
          projectName: args.projectName,
          language: args.language ?? "ar",
        },
        options: {
          enableRAG: true,
          enableSelfCritique: true,
          enableConstitutional: true,
          enableUncertainty: true,
          enableHallucination: true,
        },
      });
      const built = this.buildStationFor(
        args.stationId,
        output,
        new Map([[mapping.task, output]]),
      );
      const confidence = this.extractConfidence(output);
      reg.emit(args.analysisId, {
        type: "station.completed",
        stationId: args.stationId,
        output: built,
        confidence,
        durationMs: Date.now() - start,
      });
      return built;
    } catch (err) {
      const message = err instanceof Error ? err.message : "فشل غير متوقع";
      reg.emit(args.analysisId, {
        type: "station.error",
        stationId: args.stationId,
        message,
      });
      throw err;
    }
  }

  private stationNameFor(stationId: StationId): string {
    switch (stationId) {
      case 1:
        return "التحليل العميق للشخصيات";
      case 2:
        return "التحليل المتقدم للحوار";
      case 3:
        return "التحليل البصري والسينمائي";
      case 4:
        return "تحليل الموضوعات والرسائل";
      case 5:
        return "التحليل الثقافي والتاريخي";
      case 6:
        return "تحليل قابلية الإنتاج";
      case 7:
        return "تحليل الجمهور والتقرير النهائي";
    }
  }

  private buildStationFor(
    stationId: StationId,
    agentResult: unknown,
    results: Map<TaskType, unknown>,
  ): StationOutput | Station1Output {
    const typedAgentResult = this.asStandardAgentOutput(agentResult);
    switch (stationId) {
      case 1:
        return this.runStation1(typedAgentResult);
      case 2:
        return this.runStation2(typedAgentResult);
      case 3:
        return this.runStation3(typedAgentResult);
      case 4:
        return this.runStation4(typedAgentResult);
      case 5:
        return this.runStation5(typedAgentResult);
      case 6:
        return this.runStation6(typedAgentResult);
      case 7: {
        return this.runStation7(
          typedAgentResult,
          this.toStandardAgentResultMap(results),
        );
      }
    }
  }

  private extractConfidence(agentResult: unknown): number | null {
    if (
      agentResult &&
      typeof agentResult === "object" &&
      "confidence" in agentResult
    ) {
      const c = agentResult.confidence;
      if (typeof c === "number" && Number.isFinite(c)) return c;
    }
    return null;
  }

  private getProcessingTime(
    agentResult: StandardAgentOutput | undefined,
  ): number {
    const value = agentResult?.metadata?.processingTime;
    return typeof value === "number" ? value : 0;
  }

  private asStandardAgentOutput(
    value: unknown,
  ): StandardAgentOutput | undefined {
    if (!value || typeof value !== "object") {
      return undefined;
    }

    const candidate = value as Partial<StandardAgentOutput>;
    return typeof candidate.text === "string" &&
      typeof candidate.confidence === "number" &&
      Array.isArray(candidate.notes)
      ? (candidate as StandardAgentOutput)
      : undefined;
  }

  private toStandardAgentResultMap(
    results: Map<TaskType, unknown>,
  ): Map<TaskType, StandardAgentOutput> {
    const typed = new Map<TaskType, StandardAgentOutput>();
    for (const [task, value] of results) {
      const output = this.asStandardAgentOutput(value);
      if (output) {
        typed.set(task, output);
      }
    }
    return typed;
  }
}

import * as fs from "fs";
import * as path from "path";
import { StationsOrchestrator, type OrchestrationResult } from "./orchestrator";
import { GeminiService, GeminiModel } from "./gemini-service";
import { saveText } from "../utils/saveText";
import { logger } from "../utils/logger";
import {
  PipelineInputSchema,
  validateAndNormalizePipelineInput,
  type PipelineInput as ValidatedPipelineInput,
  type PipelineRunResult as ValidatedPipelineRunResult,
  type StationStatus as ValidatedStationStatus,
} from "./types";

export type { Station1Output } from "./station1-text-analysis";
export type { Station2Output } from "./station2-conceptual-analysis";
export type { Station3Output } from "./station3-network-builder";
export type { Station4Output } from "./station4-efficiency-metrics";
export type { Station5Output } from "./station5-dynamic-symbolic-stylistic";
export type { Station6Output } from "./station6-diagnostics-treatment";
export type { Station7Output } from "./station7-finalization";

export type PipelineInput = ValidatedPipelineInput;
export type PipelineRunResult = ValidatedPipelineRunResult;
export type StationStatus = ValidatedStationStatus;

export type { PipelineInputSchema };
export { validateAndNormalizePipelineInput };

export interface AnalysisPipelineConfig {
  apiKey: string;
  outputDir?: string;
  geminiService?: GeminiService;
  enableCaching?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableProgressTracking?: boolean;
  enableDetailedLogging?: boolean;
  delayBetweenStations?: number;
  geminiModel?: GeminiModel;
  fallbackModel?: GeminiModel;
  timeout?: number;
}

export interface EnhancedPipelineRunResult extends ValidatedPipelineRunResult {
  orchestrationResult?: OrchestrationResult;
  stationOutputs?: OrchestrationResult["stationOutputs"];
  metadata?: Record<string, unknown>;
  performanceMetrics?: {
    averageStationTime: number;
    slowestStation: { number: number; name: string; duration: number };
    fastestStation: { number: number; name: string; duration: number };
    totalRetries: number;
    successRate: number;
  };
}

export class AnalysisPipeline {
  private readonly geminiService: GeminiService;
  private readonly orchestrator: StationsOrchestrator;
  private readonly outputDirectory: string;
  private readonly enableProgressTracking: boolean;
  private readonly enableDetailedLogging: boolean;

  constructor(config: AnalysisPipelineConfig) {
    this.geminiService = this.initializeGeminiService(config);
    this.outputDirectory = this.initializeOutputDirectory(config);
    this.enableProgressTracking = config.enableProgressTracking ?? true;
    this.enableDetailedLogging = config.enableDetailedLogging ?? true;
    this.orchestrator = this.createOrchestrator(config);
  }

  private initializeGeminiService(
    config: AnalysisPipelineConfig
  ): GeminiService {
    if (config.geminiService) {
      return config.geminiService;
    }

    if (!config.apiKey) {
      logger.warn(
        "[AnalysisPipeline] GEMINI_API_KEY not set. AI analysis will fail."
      );
      return new GeminiService({
        apiKey: "dummy-key-ai-disabled",
        defaultModel: GeminiModel.FLASH,
        fallbackModel: GeminiModel.FLASH,
        maxRetries: 0,
        timeout: 1000,
      });
    }

    return new GeminiService({
      apiKey: config.apiKey,
      defaultModel: config.geminiModel ?? GeminiModel.PRO,
      fallbackModel: config.fallbackModel ?? GeminiModel.FLASH,
      maxRetries: config.maxRetries ?? 3,
      timeout: config.timeout ?? 120_000,
    });
  }

  private initializeOutputDirectory(config: AnalysisPipelineConfig): string {
    const outputDirectory =
      config.outputDir ?? path.join(process.cwd(), "analysis_output");
    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory, { recursive: true });
    }
    return outputDirectory;
  }

  private createOrchestrator(
    config: AnalysisPipelineConfig
  ): StationsOrchestrator {
    return new StationsOrchestrator({
      geminiService: this.geminiService,
      outputDirectory: this.outputDirectory,
      enableCaching: config.enableCaching ?? false,
      enableRetry: config.enableRetry ?? true,
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 5000,
      enableProgressTracking: this.enableProgressTracking,
      enableDetailedLogging: this.enableDetailedLogging,
    });
  }

  async runFullAnalysis(input: unknown): Promise<EnhancedPipelineRunResult> {
    const data: PipelineInput = validateAndNormalizePipelineInput(input);

    logger.info("[AnalysisPipeline] Starting full analysis", {
      textLength: data.text.length,
      options: data.options,
    });

    try {
      const orchestrationResult = await this.orchestrator.execute(
        data.text,
        (data.options?.title as string) ?? "untitled-project"
      );

      const performanceMetrics =
        this.calculatePerformanceMetrics(orchestrationResult);

      await this.saveOrchestrationResult(orchestrationResult);

      const result: EnhancedPipelineRunResult = {
        success: true,
        stationOutputs: orchestrationResult.stationOutputs,
        metadata: {
          stationsCompleted: orchestrationResult.metadata.stationsCompleted,
          totalExecutionTime: orchestrationResult.metadata.totalExecutionTime,
          startedAt: orchestrationResult.metadata.startedAt,
          finishedAt: orchestrationResult.metadata.finishedAt,
        },
        orchestrationResult,
        performanceMetrics,
      };

      logger.info("[AnalysisPipeline] Analysis completed successfully", {
        stationsCompleted: orchestrationResult.metadata.stationsCompleted,
        stationsFailed: orchestrationResult.metadata.stationsFailed,
        totalExecutionTime: orchestrationResult.metadata.totalExecutionTime,
        successRate: performanceMetrics.successRate,
      });

      return result;
    } catch (error) {
      logger.error(
        "[AnalysisPipeline] Analysis failed with critical error:",
        error
      );
      throw error;
    }
  }

  async runPartialAnalysis(
    input: unknown,
    options: {
      startFromStation?: number;
      endAtStation?: number;
      skipStations?: number[];
    }
  ): Promise<EnhancedPipelineRunResult> {
    const data: PipelineInput = validateAndNormalizePipelineInput(input);

    logger.info("[AnalysisPipeline] Starting partial analysis", {
      textLength: data.text.length,
      startFromStation: options.startFromStation,
      endAtStation: options.endAtStation,
      skipStations: options.skipStations,
    });

    try {
      const orchestrationResult = await this.orchestrator.execute(
        data.text,
        (data.options?.title as string) ?? "untitled-project",
        options
      );

      const performanceMetrics =
        this.calculatePerformanceMetrics(orchestrationResult);

      await this.saveOrchestrationResult(orchestrationResult);

      const result: EnhancedPipelineRunResult = {
        success: true,
        stationOutputs: orchestrationResult.stationOutputs,
        metadata: {
          stationsCompleted: orchestrationResult.metadata.stationsCompleted,
          totalExecutionTime: orchestrationResult.metadata.totalExecutionTime,
          startedAt: orchestrationResult.metadata.startedAt,
          finishedAt: orchestrationResult.metadata.finishedAt,
        },
        orchestrationResult,
        performanceMetrics,
      };

      logger.info("[AnalysisPipeline] Partial analysis completed", {
        stationsCompleted: orchestrationResult.metadata.stationsCompleted,
        stationsFailed: orchestrationResult.metadata.stationsFailed,
      });

      return result;
    } catch (error) {
      logger.error("[AnalysisPipeline] Partial analysis failed:", error);
      throw error;
    }
  }

  private calculatePerformanceMetrics(result: OrchestrationResult) {
    const completedStations = result.progressLog.filter(
      (p) => p.status === "completed" && p.duration != null
    );

    if (completedStations.length === 0) {
      return {
        averageStationTime: 0,
        slowestStation: { number: 0, name: "N/A", duration: 0 },
        fastestStation: { number: 0, name: "N/A", duration: 0 },
        totalRetries: 0,
        successRate: 0,
      };
    }

    const durations = completedStations.map((s) => s.duration!);
    const averageStationTime =
      durations.reduce((a, b) => a + b, 0) / durations.length;

    const slowest = completedStations.reduce((prev, curr) =>
      curr.duration! > prev.duration! ? curr : prev
    );

    const fastest = completedStations.reduce((prev, curr) =>
      curr.duration! < prev.duration! ? curr : prev
    );

    const totalRetries = result.progressLog.reduce(
      (sum, p) => sum + (p.attempt ?? 1) - 1,
      0
    );

    const successRate =
      (result.metadata.stationsCompleted /
        (result.metadata.stationsCompleted + result.metadata.stationsFailed)) *
      100;

    return {
      averageStationTime: Math.round(averageStationTime),
      slowestStation: {
        number: slowest.stationNumber,
        name: slowest.stationName,
        duration: slowest.duration!,
      },
      fastestStation: {
        number: fastest.stationNumber,
        name: fastest.stationName,
        duration: fastest.duration!,
      },
      totalRetries,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  private async saveOrchestrationResult(
    result: OrchestrationResult
  ): Promise<void> {
    try {
      const filename = `orchestration-result-${Date.now()}.txt`;
      const filepath = path.join(this.outputDirectory, filename);

      const separator = "=====================";
      const textReport = `
تقرير نتائج التنسيق
${separator}
تاريخ البدء: ${result.metadata.startedAt}
تاريخ الانتهاء: ${result.metadata.finishedAt}
وقت التنفيذ الكلي: ${result.metadata.totalExecutionTime}ms
المحطات المكتملة: ${result.metadata.stationsCompleted}
المحطات الفاشلة: ${result.metadata.stationsFailed}
النتيجة الإجمالية: ${result.metadata.overallScore || "غير متاح"}
التصنيف الإجمالي: ${result.metadata.overallRating || "غير متاح"}
الحالة: ${result.success ? "نجح" : "فشل"}

سجل التقدم:
${result.progressLog.map((p) => `- المحطة ${p.stationNumber} (${p.stationName}): ${p.status} - المدة: ${p.duration || 0}ms`).join("\n")}

${result.errors.length > 0 ? `\nالأخطاء:\n${result.errors.map((e) => `- المحطة ${e.station}: ${e.error} (${e.timestamp})`).join("\n")}` : ""}
      `.trim();

      await saveText(filepath, textReport);

      logger.info("[AnalysisPipeline] Orchestration result saved as text", {
        filepath,
      });
    } catch (error) {
      logger.error(
        "[AnalysisPipeline] Failed to save orchestration result:",
        error
      );
    }
  }

  getStationStatus(): Record<string, string> {
    return this.orchestrator.getStationStatus();
  }

  getProgressLog() {
    return this.orchestrator.getProgressLog();
  }

  getErrors() {
    return this.orchestrator.getErrors();
  }

  clearProgress(): void {
    this.orchestrator.clearProgressLog();
  }

  async healthCheck(): Promise<{
    healthy: boolean;
    geminiService: boolean;
    outputDirectory: boolean;
    details: string;
  }> {
    let healthy = true;
    let geminiServiceHealthy = true;
    let outputDirectoryHealthy = true;
    const details: string[] = [];

    try {
      await this.geminiService.generate({
        prompt: "test",
        temperature: 0.1,
        maxTokens: 10,
      });
    } catch (error) {
      geminiServiceHealthy = false;
      healthy = false;
      details.push(
        `Gemini service error: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }

    try {
      if (!fs.existsSync(this.outputDirectory)) {
        fs.mkdirSync(this.outputDirectory, { recursive: true });
      }
      const testFile = path.join(this.outputDirectory, ".health-check");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);
    } catch (error) {
      outputDirectoryHealthy = false;
      healthy = false;
      details.push(
        `Output directory error: ${error instanceof Error ? error.message : "Unknown"}`
      );
    }

    return {
      healthy,
      geminiService: geminiServiceHealthy,
      outputDirectory: outputDirectoryHealthy,
      details: details.join("; "),
    };
  }

  async estimateAnalysisTime(textLength: number): Promise<{
    estimatedTime: number;
    breakdown: Record<string, number>;
  }> {
    const baseTimePerStation = 30000;
    const timePerCharacter = 0.5;
    const overheadTime = 42000;

    const stationTimes = {
      station1: baseTimePerStation + textLength * timePerCharacter * 0.8,
      station2: baseTimePerStation + textLength * timePerCharacter * 0.6,
      station3: baseTimePerStation + textLength * timePerCharacter * 1.2,
      station4: baseTimePerStation + textLength * timePerCharacter * 0.4,
      station5: baseTimePerStation + textLength * timePerCharacter * 1.0,
      station6: baseTimePerStation + textLength * timePerCharacter * 0.7,
      station7: baseTimePerStation + textLength * timePerCharacter * 0.5,
    };

    const totalEstimatedTime =
      Object.values(stationTimes).reduce((a, b) => a + b, 0) + overheadTime;

    return {
      estimatedTime: Math.round(totalEstimatedTime),
      breakdown: Object.fromEntries(
        Object.entries(stationTimes).map(([key, value]) => [
          key,
          Math.round(value),
        ])
      ),
    };
  }
}

export async function createAnalysisPipeline(
  config: AnalysisPipelineConfig
): Promise<AnalysisPipeline> {
  const pipeline = new AnalysisPipeline(config);

  const health = await pipeline.healthCheck();
  if (!health.healthy) {
    logger.warn(
      "[AnalysisPipeline] Pipeline created with health issues:",
      health.details
    );
  } else {
    logger.info("[AnalysisPipeline] Pipeline created successfully and healthy");
  }

  return pipeline;
}

export function createQuickPipeline(
  apiKey: string,
  outputDir?: string
): AnalysisPipeline {
  return new AnalysisPipeline({
    apiKey,
    ...(outputDir !== undefined ? { outputDir } : {}),
    enableCaching: false,
    enableRetry: true,
    maxRetries: 2,
    retryDelay: 3000,
    enableProgressTracking: true,
    enableDetailedLogging: false,
    delayBetweenStations: 4000,
    geminiModel: GeminiModel.FLASH,
    fallbackModel: GeminiModel.FLASH_LITE,
    timeout: 60_000,
  });
}

export function createRobustPipeline(
  apiKey: string,
  outputDir?: string
): AnalysisPipeline {
  return new AnalysisPipeline({
    apiKey,
    ...(outputDir !== undefined ? { outputDir } : {}),
    enableCaching: true,
    enableRetry: true,
    maxRetries: 5,
    retryDelay: 10000,
    enableProgressTracking: true,
    enableDetailedLogging: true,
    delayBetweenStations: 8000,
    geminiModel: GeminiModel.PRO,
    fallbackModel: GeminiModel.FLASH,
    timeout: 180_000,
  });
}

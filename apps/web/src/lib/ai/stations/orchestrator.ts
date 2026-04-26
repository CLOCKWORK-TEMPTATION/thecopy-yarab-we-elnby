import { logger } from "../utils/logger";

import { GeminiService } from "./gemini-service";
import {
  Station1TextAnalysis,
  type Station1Output,
} from "./station1-text-analysis";
import {
  Station2ConceptualAnalysis,
  type Station2Output,
} from "./station2-conceptual-analysis";
import {
  Station3NetworkBuilder,
  type Station3Output,
} from "./station3-network-builder";
import {
  Station4EfficiencyMetrics,
  type Station4Output,
} from "./station4-efficiency-metrics";
import {
  Station5DynamicSymbolicStylistic,
  type Station5Output,
} from "./station5-dynamic-symbolic-stylistic";
import {
  Station6Diagnostics,
  type Station6Output,
} from "./station6-diagnostics-treatment";
import {
  Station7Finalization,
  type Station7Output,
} from "./station7-finalization";

export interface OrchestrationConfig {
  geminiService: GeminiService;
  outputDirectory: string;
  enableCaching?: boolean;
  enableRetry?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  enableProgressTracking?: boolean;
  enableDetailedLogging?: boolean;
}

export interface StationProgress {
  stationNumber: number;
  stationName: string;
  status: "pending" | "running" | "completed" | "failed" | "retrying";
  startTime?: number;
  endTime?: number;
  duration?: number;
  attempt?: number;
  error?: string;
}

export interface OrchestrationResult {
  success: boolean;
  stationOutputs: {
    station1?: Station1Output;
    station2?: Station2Output;
    station3?: Station3Output;
    station4?: Station4Output;
    station5?: Station5Output;
    station6?: Station6Output;
    station7?: Station7Output;
  };
  metadata: {
    totalExecutionTime: number;
    stationsCompleted: number;
    stationsFailed: number;
    startedAt: string;
    finishedAt: string;
    overallScore?: number;
    overallRating?: string;
  };
  progressLog: StationProgress[];
  errors: {
    station: number;
    error: string;
    timestamp: string;
  }[];
}

export class StationsOrchestrator {
  private readonly geminiService: GeminiService;
  private readonly outputDirectory: string;
  private readonly enableCaching: boolean;
  private readonly enableRetry: boolean;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly enableDetailedLogging: boolean;

  private progressLog: StationProgress[] = [];
  private errors: { station: number; error: string; timestamp: string }[] = [];

  constructor(config: OrchestrationConfig) {
    this.geminiService = config.geminiService;
    this.outputDirectory = config.outputDirectory;
    this.enableCaching = config.enableCaching ?? false;
    this.enableRetry = config.enableRetry ?? true;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 5000;
    this.enableDetailedLogging = config.enableDetailedLogging ?? true;
  }

  async execute(
    fullText: string,
    projectName = "untitled-project",
    options?: {
      startFromStation?: number;
      endAtStation?: number;
      skipStations?: number[];
    }
  ): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const startFromStation = options?.startFromStation ?? 1;
    const endAtStation = options?.endAtStation ?? 7;
    const skipStations = new Set(options?.skipStations ?? []);

    logger.info("[Orchestrator] Starting comprehensive analysis pipeline", {
      projectName,
      textLength: fullText.length,
      startFromStation,
      endAtStation,
      skipStations: Array.from(skipStations),
    });

    const stationOutputs: OrchestrationResult["stationOutputs"] = {};
    let stationsCompleted = 0;
    let stationsFailed = 0;

    const allPreviousStationsData = new Map<number, unknown>();

    try {
      if (startFromStation <= 1 && endAtStation >= 1 && !skipStations.has(1)) {
        const station1Output = await this.executeStation<Station1Output>(
          1,
          "Text Analysis",
          async () => {
            const station1 = new Station1TextAnalysis(this.geminiService);
            const result = await station1.run({
              text: fullText,
              projectName,
            });
            return result.result as Station1Output;
          }
        );
        if (station1Output) {
          stationOutputs.station1 = station1Output;
          allPreviousStationsData.set(1, station1Output);
          stationsCompleted++;
        } else {
          stationsFailed++;
        }
        await this.delay(6000);
      }

      if (startFromStation <= 2 && endAtStation >= 2 && !skipStations.has(2)) {
        const station2Output = await this.executeStation<Station2Output>(
          2,
          "Conceptual Analysis",
          async () => {
            if (!stationOutputs.station1) {
              throw new Error("Station 1 output is required for Station 2");
            }
            const station2 = new Station2ConceptualAnalysis(this.geminiService);
            const result = await station2.run({
              text: fullText,
              station1Output: stationOutputs.station1,
            } as any);
            return result.result as Station2Output;
          }
        );
        if (station2Output) {
          stationOutputs.station2 = station2Output;
          allPreviousStationsData.set(2, station2Output);
          stationsCompleted++;
        } else {
          stationsFailed++;
        }
        await this.delay(6000);
      }

      if (startFromStation <= 3 && endAtStation >= 3 && !skipStations.has(3)) {
        const station3Output = await this.executeStation<Station3Output>(
          3,
          "Network Builder",
          async () => {
            if (!stationOutputs.station1 || !stationOutputs.station2) {
              throw new Error(
                "Station 1 and 2 outputs are required for Station 3"
              );
            }
            const station3 = new Station3NetworkBuilder(this.geminiService);
            const result = await station3.run({
              text: fullText,
              station1Output: stationOutputs.station1,
              station2Output: stationOutputs.station2,
            } as any);
            return result.result as Station3Output;
          }
        );
        if (station3Output) {
          stationOutputs.station3 = station3Output;
          allPreviousStationsData.set(3, station3Output);
          stationsCompleted++;
        } else {
          stationsFailed++;
        }
        await this.delay(6000);
      }

      if (startFromStation <= 4 && endAtStation >= 4 && !skipStations.has(4)) {
        const station4Output = await this.executeStation<Station4Output>(
          4,
          "Efficiency Metrics",
          async () => {
            if (!stationOutputs.station3) {
              throw new Error("Station 3 output is required for Station 4");
            }
            const station4 = new Station4EfficiencyMetrics(
              {
                stationId: "station4",
                name: "Efficiency Metrics",
                description: "Efficiency Metrics",
                cacheEnabled: this.enableCaching,
                performanceTracking: true,
                inputValidation: (input) => !!input,
                outputValidation: (output) => !!output,
              },
              this.geminiService
            );
            const result = await station4.execute({
              station3Output: stationOutputs.station3,
              originalText: fullText,
            });
            return result.output;
          }
        );
        if (station4Output) {
          stationOutputs.station4 = station4Output;
          allPreviousStationsData.set(4, station4Output);
          stationsCompleted++;
        } else {
          stationsFailed++;
        }
        await this.delay(6000);
      }

      if (startFromStation <= 5 && endAtStation >= 5 && !skipStations.has(5)) {
        const station5Output = await this.executeStation<Station5Output>(
          5,
          "Dynamic/Symbolic/Stylistic Analysis",
          async () => {
            if (!stationOutputs.station3 || !stationOutputs.station4) {
              throw new Error(
                "Station 3 and 4 outputs are required for Station 5"
              );
            }
            const station5 = new Station5DynamicSymbolicStylistic(
              {
                stationId: "station5",
                name: "Dynamic/Symbolic/Stylistic Analysis",
                description: "Dynamic/Symbolic/Stylistic Analysis",
                cacheEnabled: this.enableCaching,
                performanceTracking: true,
                inputValidation: (input) => !!input,
                outputValidation: (output) => !!output,
              },
              this.geminiService
            );
            const result = await station5.execute({
              conflictNetwork: stationOutputs.station3.conflictNetwork,
              station4Output: stationOutputs.station4,
              fullText,
            });
            return result.output;
          }
        );
        if (station5Output) {
          stationOutputs.station5 = station5Output;
          allPreviousStationsData.set(5, station5Output);
          stationsCompleted++;
        } else {
          stationsFailed++;
        }
        await this.delay(6000);
      }

      if (startFromStation <= 6 && endAtStation >= 6 && !skipStations.has(6)) {
        const station6Output = await this.executeStation<Station6Output>(
          6,
          "Diagnostics & Treatment",
          async () => {
            if (
              !stationOutputs.station1 ||
              !stationOutputs.station2 ||
              !stationOutputs.station3 ||
              !stationOutputs.station4 ||
              !stationOutputs.station5
            ) {
              throw new Error(
                "All previous station outputs are required for Station 6"
              );
            }
            const station6 = new Station6Diagnostics(this.geminiService);
            const result = await station6.execute(fullText, {
              station1: stationOutputs.station1 as unknown as Record<
                string,
                unknown
              >,
              station2: stationOutputs.station2 as unknown as Record<
                string,
                unknown
              >,
              station3: stationOutputs.station3 as unknown as Record<
                string,
                unknown
              >,
              station4: stationOutputs.station4 as unknown as Record<
                string,
                unknown
              >,
              station5: stationOutputs.station5 as unknown as Record<
                string,
                unknown
              >,
            });
            return result;
          }
        );
        if (station6Output) {
          stationOutputs.station6 = station6Output;
          allPreviousStationsData.set(6, station6Output);
          stationsCompleted++;
        } else {
          stationsFailed++;
        }
        await this.delay(6000);
      }

      if (startFromStation <= 7 && endAtStation >= 7 && !skipStations.has(7)) {
        const station7Output = await this.executeStation<Station7Output>(
          7,
          "Finalization & Visualization",
          async () => {
            if (!stationOutputs.station3 || !stationOutputs.station6) {
              throw new Error(
                "Station 3 and 6 outputs are required for Station 7"
              );
            }
            const station7 = new Station7Finalization(
              {
                stationId: "station7",
                name: "Finalization & Visualization",
                description: "Finalization & Visualization",
                cacheEnabled: this.enableCaching,
                performanceTracking: true,
                inputValidation: (input) => !!input,
                outputValidation: (output) => !!output,
              },
              this.geminiService,
              this.outputDirectory
            );
            const result = await station7.execute({
              conflictNetwork: stationOutputs.station3.conflictNetwork,
              station6Output: stationOutputs.station6,
              allPreviousStationsData,
            });
            return result.output;
          }
        );
        if (station7Output) {
          stationOutputs.station7 = station7Output;
          allPreviousStationsData.set(7, station7Output);
          stationsCompleted++;
        } else {
          stationsFailed++;
        }
      }

      const endTime = Date.now();
      const totalExecutionTime = endTime - startTime;

      const overallScore = stationOutputs.station7?.scoreMatrix?.overall;
      const overallRating =
        stationOutputs.station7?.finalReport?.overallAssessment?.rating;

      logger.info("[Orchestrator] Pipeline execution completed", {
        stationsCompleted,
        stationsFailed,
        totalExecutionTime,
        overallScore,
        overallRating,
      });

      return {
        success: stationsFailed === 0,
        stationOutputs,
        metadata: {
          totalExecutionTime,
          stationsCompleted,
          stationsFailed,
          startedAt: new Date(startTime).toISOString(),
          finishedAt: new Date(endTime).toISOString(),
          ...(overallScore !== undefined && { overallScore }),
          ...(overallRating !== undefined && { overallRating }),
        },
        progressLog: this.progressLog,
        errors: this.errors,
      };
    } catch (error) {
      logger.error("[Orchestrator] Fatal error in pipeline execution:", error);

      const endTime = Date.now();
      return {
        success: false,
        stationOutputs,
        metadata: {
          totalExecutionTime: endTime - startTime,
          stationsCompleted,
          stationsFailed: stationsFailed + 1,
          startedAt: new Date(startTime).toISOString(),
          finishedAt: new Date(endTime).toISOString(),
        },
        progressLog: this.progressLog,
        errors: this.errors,
      };
    }
  }

  private async executeStation<T>(
    stationNumber: number,
    stationName: string,
    executor: () => Promise<T>
  ): Promise<T | null> {
    const progress: StationProgress = {
      stationNumber,
      stationName,
      status: "pending",
      attempt: 0,
    };
    this.progressLog.push(progress);

    let lastError: Error | null = null;

    for (
      let attempt = 1;
      attempt <= (this.enableRetry ? this.maxRetries : 1);
      attempt++
    ) {
      try {
        progress.status = attempt > 1 ? "retrying" : "running";
        progress.attempt = attempt;
        progress.startTime = Date.now();

        if (this.enableDetailedLogging) {
          logger.info(
            `[Orchestrator] Executing Station ${stationNumber}: ${stationName}`,
            {
              attempt,
              maxAttempts: this.maxRetries,
            }
          );
        }

        const result = await executor();

        progress.endTime = Date.now();
        progress.duration = progress.endTime - progress.startTime;
        progress.status = "completed";

        if (this.enableDetailedLogging) {
          logger.info(
            `[Orchestrator] Station ${stationNumber} completed successfully`,
            {
              duration: progress.duration,
            }
          );
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        progress.error = lastError.message;

        logger.error(
          `[Orchestrator] Station ${stationNumber} failed (attempt ${attempt}/${this.maxRetries})`,
          {
            error: lastError.message,
            willRetry: attempt < this.maxRetries && this.enableRetry,
          }
        );

        this.errors.push({
          station: stationNumber,
          error: lastError.message,
          timestamp: new Date().toISOString(),
        });

        if (attempt < this.maxRetries && this.enableRetry) {
          await this.delay(this.retryDelay * attempt);
        }
      }
    }

    progress.status = "failed";
    progress.endTime = Date.now();
    progress.duration = progress.endTime - (progress.startTime ?? 0);

    logger.error(
      `[Orchestrator] Station ${stationNumber} failed after ${this.maxRetries} attempts`,
      {
        lastError: lastError?.message,
      }
    );

    return null;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getProgressLog(): StationProgress[] {
    return [...this.progressLog];
  }

  getErrors(): { station: number; error: string; timestamp: string }[] {
    return [...this.errors];
  }

  getStationStatus(): Record<string, string> {
    const status: Record<string, string> = {};
    this.progressLog.forEach((progress) => {
      status[`station${progress.stationNumber}`] = progress.status;
    });
    return status;
  }

  clearProgressLog(): void {
    this.progressLog = [];
    this.errors = [];
  }
}

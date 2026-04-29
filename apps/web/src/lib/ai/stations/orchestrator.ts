import { logger } from "../utils/logger";

import { GeminiService } from "./gemini-service";
import {
  Station1TextAnalysis,
  type Station1Output,
} from "./station1-text-analysis";
import {
  Station2ConceptualAnalysis,
  type Station2Input,
  type Station2Output,
} from "./station2-conceptual-analysis";
import {
  Station3NetworkBuilder,
  type Station3Input,
  type Station3Output,
} from "./station3-network-builder";
import { toCoreStation4Output } from "./station4-core-adapter";
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

interface StationStep {
  number: number;
  name: string;
  run: () => Promise<unknown>;
  assign: (out: unknown) => void;
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

  private async runStation1(
    fullText: string,
    projectName: string
  ): Promise<Station1Output> {
    const station1 = new Station1TextAnalysis(this.geminiService);
    const result = await station1.run({ text: fullText, projectName });
    return result.result as Station1Output;
  }

  private async runStation2(
    fullText: string,
    station1Output: Station1Output
  ): Promise<Station2Output> {
    const station2 = new Station2ConceptualAnalysis(this.geminiService);
    const station2Input: Station2Input = { text: fullText, station1Output };
    const result = await station2.run(station2Input);
    return result.result as Station2Output;
  }

  private async runStation3(
    fullText: string,
    station1Output: Station1Output,
    station2Output: Station2Output
  ): Promise<Station3Output> {
    const station3 = new Station3NetworkBuilder(this.geminiService);
    const station3Input: Station3Input = {
      text: fullText,
      station1Output,
      station2Output,
    };
    const result = await station3.run(station3Input);
    return result.result as Station3Output;
  }

  private async runStation4(
    fullText: string,
    station3Output: Station3Output
  ): Promise<Station4Output> {
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
      station3Output,
      originalText: fullText,
    });
    return result.output;
  }

  private async runStation5(
    fullText: string,
    station3Output: Station3Output,
    station4Output: Station4Output
  ): Promise<Station5Output> {
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
      conflictNetwork: station3Output.conflictNetwork,
      station4Output: toCoreStation4Output(station4Output),
      fullText,
    });
    return result.output;
  }

  private async runStation6(
    fullText: string,
    outputs: {
      station1: Station1Output;
      station2: Station2Output;
      station3: Station3Output;
      station4: Station4Output;
      station5: Station5Output;
    }
  ): Promise<Station6Output> {
    const station6 = new Station6Diagnostics(this.geminiService);
    return station6.execute(fullText, {
      station1: outputs.station1 as unknown as Record<string, unknown>,
      station2: outputs.station2 as unknown as Record<string, unknown>,
      station3: outputs.station3 as unknown as Record<string, unknown>,
      station4: outputs.station4 as unknown as Record<string, unknown>,
      station5: outputs.station5 as unknown as Record<string, unknown>,
    });
  }

  private async runStation7(
    station3Output: Station3Output,
    station6Output: Station6Output,
    allPreviousStationsData: Map<number, unknown>
  ): Promise<Station7Output> {
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
      conflictNetwork: station3Output.conflictNetwork,
      station6Output,
      allPreviousStationsData,
    });
    return result.output;
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

    const shouldRun = (n: number) =>
      startFromStation <= n && endAtStation >= n && !skipStations.has(n);

    const track = (output: unknown, n: number) => {
      allPreviousStationsData.set(n, output);
      stationsCompleted++;
    };

    const stationSteps: StationStep[] = [
      {
        number: 1,
        name: "Text Analysis",
        run: () => this.runStation1(fullText, projectName),
        assign: (out: unknown) => {
          stationOutputs.station1 = out as Station1Output;
        },
      },
      {
        number: 2,
        name: "Conceptual Analysis",
        run: () => {
          if (!stationOutputs.station1) {
            throw new Error("Station 1 output is required for Station 2");
          }
          return this.runStation2(fullText, stationOutputs.station1);
        },
        assign: (out: unknown) => {
          stationOutputs.station2 = out as Station2Output;
        },
      },
      {
        number: 3,
        name: "Network Builder",
        run: () => {
          if (!stationOutputs.station1 || !stationOutputs.station2) {
            throw new Error(
              "Station 1 and 2 outputs are required for Station 3"
            );
          }
          return this.runStation3(
            fullText,
            stationOutputs.station1,
            stationOutputs.station2
          );
        },
        assign: (out: unknown) => {
          stationOutputs.station3 = out as Station3Output;
        },
      },
      {
        number: 4,
        name: "Efficiency Metrics",
        run: () => {
          if (!stationOutputs.station3) {
            throw new Error("Station 3 output is required for Station 4");
          }
          return this.runStation4(fullText, stationOutputs.station3);
        },
        assign: (out: unknown) => {
          stationOutputs.station4 = out as Station4Output;
        },
      },
      {
        number: 5,
        name: "Dynamic/Symbolic/Stylistic Analysis",
        run: () => {
          if (!stationOutputs.station3 || !stationOutputs.station4) {
            throw new Error(
              "Station 3 and 4 outputs are required for Station 5"
            );
          }
          return this.runStation5(
            fullText,
            stationOutputs.station3,
            stationOutputs.station4
          );
        },
        assign: (out: unknown) => {
          stationOutputs.station5 = out as Station5Output;
        },
      },
      {
        number: 6,
        name: "Diagnostics & Treatment",
        run: () => {
          const { station1, station2, station3, station4, station5 } =
            stationOutputs;
          if (!station1 || !station2 || !station3 || !station4 || !station5) {
            throw new Error(
              "All previous station outputs are required for Station 6"
            );
          }
          return this.runStation6(fullText, {
            station1,
            station2,
            station3,
            station4,
            station5,
          });
        },
        assign: (out: unknown) => {
          stationOutputs.station6 = out as Station6Output;
        },
      },
      {
        number: 7,
        name: "Finalization & Visualization",
        run: () => {
          if (!stationOutputs.station3 || !stationOutputs.station6) {
            throw new Error(
              "Station 3 and 6 outputs are required for Station 7"
            );
          }
          return this.runStation7(
            stationOutputs.station3,
            stationOutputs.station6,
            allPreviousStationsData
          );
        },
        assign: (out: unknown) => {
          stationOutputs.station7 = out as Station7Output;
        },
      },
    ];

    try {
      for (const step of stationSteps) {
        if (!shouldRun(step.number)) continue;
        const out = await this.executeStation(step.number, step.name, step.run);
        if (out) {
          step.assign(out);
          track(out, step.number);
        } else stationsFailed++;
        if (step.number < 7) await this.delay(6000);
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
            { attempt, maxAttempts: this.maxRetries }
          );
        }

        const result = await executor();

        progress.endTime = Date.now();
        progress.duration = progress.endTime - progress.startTime;
        progress.status = "completed";

        if (this.enableDetailedLogging) {
          logger.info(
            `[Orchestrator] Station ${stationNumber} completed successfully`,
            { duration: progress.duration }
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
      { lastError: lastError?.message }
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

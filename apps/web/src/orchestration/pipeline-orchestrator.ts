import { logger } from "@/lib/ai/utils/logger";
import {
  AnalysisType,
  type AnalysisType as AnalysisTypeValue,
} from "@/types/enums";

import {
  pipelineExecutor,
  type PipelineInputData,
  type PipelineStep,
} from "./executor";

// Seven Stations Pipeline Orchestrator
// Coordinates the execution of the Seven Stations AI analysis pipeline

// Station interface for pipeline execution
interface Station {
  id: string;
  name: string;
  description: string;
  type: AnalysisTypeValue;
  capabilities?: string[];
  estimatedDuration?: number;
}

export interface RunPipelineWithInterfacesOptions {
  scriptId?: string;
  skipStations?: string[];
  priorityStations?: string[];
  timeout?: number;
  metadata?: PipelineInputData;
  onProgress?: (execution: SevenStationsExecution) => void;
}

// Define the Seven Stations
const SEVEN_STATIONS: Station[] = [
  {
    id: "station-1",
    name: "Station 1",
    description: "Text Analysis",
    type: AnalysisType.CHARACTERS,
  },
  {
    id: "station-2",
    name: "Station 2",
    description: "Conceptual Analysis",
    type: AnalysisType.THEMES,
  },
  {
    id: "station-3",
    name: "Station 3",
    description: "Network Builder",
    type: AnalysisType.STRUCTURE,
  },
  {
    id: "station-4",
    name: "Station 4",
    description: "Efficiency Optimizer",
    type: AnalysisType.SCREENPLAY,
  },
  {
    id: "station-5",
    name: "Station 5",
    description: "Dynamic Analysis",
    type: AnalysisType.DETAILED,
  },
  {
    id: "station-6",
    name: "Station 6",
    description: "Diagnostics and Treatment",
    type: AnalysisType.FULL,
  },
  {
    id: "station-7",
    name: "Station 7",
    description: "Finalization",
    type: AnalysisType.FULL,
  },
];

function getAllStations(): Station[] {
  return SEVEN_STATIONS;
}

export interface SevenStationsResult {
  stationId: string;
  stationName: string;
  result?: string;
  success: boolean;
  duration: number;
}

export interface SevenStationsExecution {
  id: string;
  stations: SevenStationsResult[];
  overallSuccess: boolean;
  totalDuration: number;
  startTime: Date;
  endTime?: Date;
  progress: number;
}

// Seven Stations Orchestrator
export class SevenStationsOrchestrator {
  private activeExecutions = new Map<string, SevenStationsExecution>();

  private createExecution(scriptId: string): SevenStationsExecution {
    const executionId = `seven-stations-${scriptId}-${Date.now()}`;
    return {
      id: executionId,
      stations: [],
      overallSuccess: false,
      totalDuration: 0,
      startTime: new Date(),
      progress: 0,
    };
  }

  private filterAndSortStations(
    options: RunPipelineWithInterfacesOptions
  ): Station[] {
    const availableStations = getAllStations();

    const stationsToRun = availableStations.filter(
      (station: Station) => !options.skipStations?.includes(station.id)
    );

    if (options.priorityStations) {
      const priority = new Set(options.priorityStations);
      stationsToRun.sort((a: Station, b: Station) => {
        const aPriority = priority.has(a.id) ? 1 : 0;
        const bPriority = priority.has(b.id) ? 1 : 0;
        return bPriority - aPriority;
      });
    }

    return stationsToRun;
  }

  private createPipelineSteps(
    stations: Station[],
    timeout?: number
  ): PipelineStep[] {
    return stations.map((station: Station) => ({
      id: station.id,
      name: station.name,
      description: station.description,
      type: station.type,
      config: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
      timeout: timeout ?? 60000,
      retries: 2,
    }));
  }

  private convertResultsToStationResults(
    results: Map<string, { success: boolean; duration: number; data?: string }>,
    stations: Station[]
  ): SevenStationsResult[] {
    return Array.from(results.entries()).map(([stepId, result]) => {
      const station = stations.find((s: Station) => s.id === stepId)!;
      const stationResult: SevenStationsResult = {
        stationId: stepId,
        stationName: station.name,
        success: result.success,
        duration: result.duration,
      };

      if (result.data !== undefined) {
        stationResult.result = result.data;
      }

      return stationResult;
    });
  }

  private updateExecutionFromPipelineResult(
    execution: SevenStationsExecution,
    pipelineResult: {
      status: string;
      endTime?: Date;
      startTime: Date;
      results: Map<
        string,
        { success: boolean; duration: number; data?: string }
      >;
    },
    stations: Station[]
  ): void {
    execution.stations = this.convertResultsToStationResults(
      pipelineResult.results,
      stations
    );
    execution.overallSuccess = pipelineResult.status === "completed";
    execution.totalDuration = pipelineResult.endTime
      ? pipelineResult.endTime.getTime() - pipelineResult.startTime.getTime()
      : Date.now() - execution.startTime.getTime();
    if (pipelineResult.endTime) {
      execution.endTime = pipelineResult.endTime;
    }
    execution.progress = 100;
  }

  private handleExecutionFailure(execution: SevenStationsExecution): void {
    execution.overallSuccess = false;
    execution.endTime = new Date();
    execution.totalDuration = Date.now() - execution.startTime.getTime();
    logger.error("Seven Stations pipeline failed");
  }

  // Execute Seven Stations analysis pipeline
  async runSevenStationsPipeline(
    scriptId: string,
    scriptContent: string,
    options: RunPipelineWithInterfacesOptions = {}
  ): Promise<SevenStationsExecution> {
    const execution = this.createExecution(scriptId);
    this.activeExecutions.set(execution.id, execution);

    try {
      const stationsToRun = this.filterAndSortStations(options);
      const steps = this.createPipelineSteps(stationsToRun, options.timeout);

      const pipelineResult = await pipelineExecutor.executePipeline(
        execution.id,
        steps,
        { scriptContent, scriptId, ...(options.metadata ?? {}) }
      );

      this.updateExecutionFromPipelineResult(
        execution,
        pipelineResult,
        stationsToRun
      );
      options.onProgress?.(execution);
    } catch {
      this.handleExecutionFailure(execution);
    }

    return execution;
  }

  // Get station details
  getStationDetails() {
    return getAllStations().map((station: Station) => ({
      id: station.id,
      name: station.name,
      description: station.description,
      type: station.type,
      capabilities: station.capabilities,
      estimatedDuration: station.estimatedDuration,
    }));
  }

  // Get execution status
  getExecution(executionId: string): SevenStationsExecution | undefined {
    return this.activeExecutions.get(executionId);
  }

  // Cancel execution
  cancelExecution(executionId: string): boolean {
    const execution = this.activeExecutions.get(executionId);
    if (execution && !execution.endTime) {
      execution.overallSuccess = false;
      execution.endTime = new Date();
      execution.totalDuration = Date.now() - execution.startTime.getTime();

      // Cancel underlying pipeline
      return pipelineExecutor.cancelExecution(executionId);
    }
    return false;
  }

  // Get active executions
  getActiveExecutions(): SevenStationsExecution[] {
    return Array.from(this.activeExecutions.values()).filter(
      (execution) => !execution.endTime
    );
  }

  // Clean up old executions (older than specified hours)
  cleanupOldExecutions(maxAgeHours = 24): number {
    const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;
    let removed = 0;

    for (const [id, execution] of this.activeExecutions.entries()) {
      if (execution.endTime && execution.endTime.getTime() < cutoffTime) {
        this.activeExecutions.delete(id);
        removed++;
      }
    }

    return removed;
  }
}

export async function runPipelineWithInterfaces(
  content: string,
  options: RunPipelineWithInterfacesOptions = {}
): Promise<SevenStationsExecution> {
  if (!content.trim()) {
    throw new Error("runPipelineWithInterfaces requires non-empty content");
  }

  const orchestrator = new SevenStationsOrchestrator();
  return orchestrator.runSevenStationsPipeline(
    options.scriptId ?? "default",
    content,
    options
  );
}

// Export singleton instance
export const sevenStationsOrchestrator = new SevenStationsOrchestrator();

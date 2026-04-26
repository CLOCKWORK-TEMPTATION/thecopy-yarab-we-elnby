import { logger } from "@/lib/ai/utils/logger";

// Seven Stations Pipeline Orchestrator
// Coordinates the execution of the Seven Stations AI analysis pipeline
import {
  AnalysisType,
  type AnalysisType as AnalysisTypeValue,
} from "@/types/enums";
import {
  pipelineExecutor,
  type PipelineInputData,
  type PipelineStep,
} from "./executor";


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

  // Execute Seven Stations analysis pipeline
  async runSevenStationsPipeline(
    scriptId: string,
    scriptContent: string,
    options: RunPipelineWithInterfacesOptions = {}
  ): Promise<SevenStationsExecution> {
    const executionId = `seven-stations-${scriptId}-${Date.now()}`;

    const execution: SevenStationsExecution = {
      id: executionId,
      stations: [],
      overallSuccess: false,
      totalDuration: 0,
      startTime: new Date(),
      progress: 0,
    };

    this.activeExecutions.set(executionId, execution);

    try {
      // Get available stations
      const availableStations = getAllStations();

      // Filter stations based on options
      const stationsToRun = availableStations.filter(
        (station: Station) => !options.skipStations?.includes(station.id)
      );

      // Prioritize stations if specified
      if (options.priorityStations) {
        const priority = new Set(options.priorityStations);
        stationsToRun.sort((a: Station, b: Station) => {
          const aPriority = priority.has(a.id) ? 1 : 0;
          const bPriority = priority.has(b.id) ? 1 : 0;
          return bPriority - aPriority;
        });
      }

      // Convert stations to pipeline steps
      const steps: PipelineStep[] = stationsToRun.map((station: Station) => ({
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
        timeout: options.timeout ?? 60000, // 1 minute default
        retries: 2,
      }));

      // Execute pipeline
      const pipelineResult = await pipelineExecutor.executePipeline(
        executionId,
        steps,
        { scriptContent, scriptId, ...(options.metadata ?? {}) }
      );

      // Convert results to Seven Stations format
      execution.stations = Array.from(pipelineResult.results.entries()).map(
        ([stepId, result]) => {
          const station = availableStations.find(
            (s: Station) => s.id === stepId
          )!;
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
        }
      );

      execution.overallSuccess = pipelineResult.status === "completed";
      execution.totalDuration = pipelineResult.endTime
        ? pipelineResult.endTime.getTime() - pipelineResult.startTime.getTime()
        : Date.now() - execution.startTime.getTime();
      if (pipelineResult.endTime) {
        execution.endTime = pipelineResult.endTime;
      }
      execution.progress = 100;
      options.onProgress?.(execution);
    } catch {
      execution.overallSuccess = false;
      execution.endTime = new Date();
      execution.totalDuration = Date.now() - execution.startTime.getTime();
      logger.error("Seven Stations pipeline failed");
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

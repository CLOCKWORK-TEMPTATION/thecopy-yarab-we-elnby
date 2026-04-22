import { z } from 'zod';

// Pipeline Input Schema - مطابق للـ frontend
export const PipelineInputSchema = z.object({
  fullText: z.string().min(1, 'النص مطلوب'),
  projectName: z.string().min(1, 'اسم المشروع مطلوب'),
  proseFilePath: z.string().optional(),
  language: z.enum(['ar', 'en']).default('ar'),
  context: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    sceneHints: z.array(z.string()).optional(),
    genre: z.string().optional(),
  }).optional().default({}),
  flags: z.object({
    runStations: z.boolean().default(true),
    fastMode: z.boolean().default(false),
    skipValidation: z.boolean().default(false),
    verboseLogging: z.boolean().default(false),
  }).optional().default({
    runStations: true,
    fastMode: false,
    skipValidation: false,
    verboseLogging: false,
  }),
  agents: z.object({
    temperature: z.number().min(0).max(2).default(0.2),
    maxTokens: z.number().optional(),
    model: z.string().optional(),
  }).optional().default({ temperature: 0.2 }),
});

export type PipelineInput = z.infer<typeof PipelineInputSchema>;

// Station Output Types
export interface StationOutput {
  stationId: number;
  stationName: string;
  executionTime: number;
  status: 'completed' | 'failed';
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface Station1Output extends StationOutput {
  majorCharacters: string[];
  relationships: Array<{
    character1: string;
    character2: string;
    relationshipType: string;
    strength: number;
  }>;
  narrativeStyleAnalysis: {
    overallTone: string;
    pacing: string;
    complexity: number;
  };
}

export interface PipelineRunResult {
  stationOutputs: {
    station1: Station1Output;
    station2: StationOutput;
    station3: StationOutput;
    station4: StationOutput;
    station5: StationOutput;
    station6: StationOutput;
    station7: StationOutput;
  };
  pipelineMetadata: {
    stationsCompleted: number;
    totalExecutionTime: number;
    startedAt: string;
    finishedAt: string;
    agentsUsed?: number;
    averageConfidence?: number;
    successfulAgents?: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
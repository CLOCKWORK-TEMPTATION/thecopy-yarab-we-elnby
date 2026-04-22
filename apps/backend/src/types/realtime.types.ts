/**
 * Real-time Communication Types
 *
 * Unified event types and payload schemas for WebSocket and SSE
 */

/**
 * Event Types for Real-time Communication
 */
export enum RealtimeEventType {
  // Job Progress Events
  JOB_STARTED = 'job:started',
  JOB_PROGRESS = 'job:progress',
  JOB_COMPLETED = 'job:completed',
  JOB_FAILED = 'job:failed',
  JOB_RETRY = 'job:retry',

  // Queue Events
  QUEUE_ACTIVE = 'queue:active',
  QUEUE_WAITING = 'queue:waiting',
  QUEUE_COMPLETED = 'queue:completed',
  QUEUE_FAILED = 'queue:failed',
  QUEUE_STALLED = 'queue:stalled',
  QUEUE_CLEANED = 'queue:cleaned',

  // Analysis Events
  ANALYSIS_STARTED = 'analysis:started',
  ANALYSIS_PROGRESS = 'analysis:progress',
  ANALYSIS_STATION_COMPLETED = 'analysis:station_completed',
  ANALYSIS_COMPLETED = 'analysis:completed',
  ANALYSIS_FAILED = 'analysis:failed',

  // System Events
  SYSTEM_ERROR = 'system:error',
  SYSTEM_WARNING = 'system:warning',
  SYSTEM_INFO = 'system:info',

  // Connection Events
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  AUTHENTICATED = 'authenticated',
  UNAUTHORIZED = 'unauthorized',
}

/**
 * Base payload structure for all events
 */
export interface RealtimeBasePayload {
  timestamp: string;
  eventType: RealtimeEventType;
  userId?: string;
}

/**
 * Job Progress Payload
 */
export interface JobProgressPayload extends RealtimeBasePayload {
  jobId: string;
  queueName: string;
  progress: number; // 0-100
  status: 'active' | 'waiting' | 'completed' | 'failed' | 'delayed';
  data?: unknown;
  message?: string;
  currentStep?: string;
  totalSteps?: number;
  completedSteps?: number;
}

/**
 * Job Started Payload
 */
export interface JobStartedPayload extends RealtimeBasePayload {
  jobId: string;
  queueName: string;
  jobName: string;
  data?: unknown;
}

/**
 * Job Completed Payload
 */
export interface JobCompletedPayload extends RealtimeBasePayload {
  jobId: string;
  queueName: string;
  result: unknown;
  duration: number; // milliseconds
}

/**
 * Job Failed Payload
 */
export interface JobFailedPayload extends RealtimeBasePayload {
  jobId: string;
  queueName: string;
  error: string;
  stackTrace?: string;
  attemptsMade: number;
  attemptsMax: number;
}

/**
 * Queue Statistics Payload
 */
export interface QueueStatsPayload extends RealtimeBasePayload {
  queueName: string;
  stats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  };
}

/**
 * Analysis Progress Payload
 */
export interface AnalysisProgressPayload extends RealtimeBasePayload {
  projectId: string;
  analysisId: string;
  currentStation: number; // 1-7
  totalStations: number;
  stationName: string;
  progress: number; // 0-100
  message?: string;
  logs?: string[];
}

/**
 * Station Completed Payload
 */
export interface StationCompletedPayload extends RealtimeBasePayload {
  projectId: string;
  analysisId: string;
  stationNumber: number;
  stationName: string;
  result: unknown;
  duration: number;
}

/**
 * System Event Payload
 */
export interface SystemEventPayload extends RealtimeBasePayload {
  level: 'error' | 'warning' | 'info';
  message: string;
  details?: unknown;
  code?: string;
}

/**
 * Connection Event Payload
 */
export interface ConnectionPayload extends RealtimeBasePayload {
  socketId?: string;
  message: string;
}

/**
 * Union type of all possible payloads
 */
export type RealtimePayload =
  | JobProgressPayload
  | JobStartedPayload
  | JobCompletedPayload
  | JobFailedPayload
  | QueueStatsPayload
  | AnalysisProgressPayload
  | StationCompletedPayload
  | SystemEventPayload
  | ConnectionPayload
  | RealtimeBasePayload;

/**
 * Event message structure
 */
export interface RealtimeEvent<T extends RealtimePayload = RealtimePayload> {
  event: RealtimeEventType;
  payload: T;
}

/**
 * WebSocket room names
 */
export enum WebSocketRoom {
  USER = 'user',
  PROJECT = 'project',
  QUEUE = 'queue',
  GLOBAL = 'global',
}

/**
 * Helper function to create room name
 */
export function createRoomName(room: WebSocketRoom, id: string): string {
  return `${room}:${id}`;
}

/**
 * Helper to create a realtime event
 */
export function createRealtimeEvent<T extends RealtimePayload>(
  eventType: RealtimeEventType,
  payload: Omit<T, 'timestamp' | 'eventType'>
): RealtimeEvent<T> {
  return {
    event: eventType,
    payload: {
      ...payload,
      timestamp: new Date().toISOString(),
      eventType,
    } as T,
  };
}

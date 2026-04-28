/**
 * Real-time Communication Usage Examples
 *
 * This file demonstrates how to use WebSocket and SSE services
 * to broadcast real-time updates to clients.
 */

import { logger } from "@/lib/logger";
import { sseService } from "@/services/sse.service";
import { websocketService } from "@/services/websocket.service";
import {
  RealtimeEventType,
  createRealtimeEvent,
  JobProgressPayload,
  AnalysisProgressPayload,
  SystemEventPayload,
} from "@/types/realtime.types";

interface ExampleRealtimeJob {
  id?: string;
  name: string;
  data: Record<string, unknown>;
  timestamp: number;
  attemptsMade: number;
  opts: {
    attempts?: number;
  };
  updateProgress(progress: number): Promise<void> | void;
}

/**
 * Example 1: Broadcasting job progress updates
 *
 * Use this pattern when processing background jobs with BullMQ
 */
export function broadcastJobProgress(
  jobId: string,
  queueName: string,
  progress: number,
  userId?: string,
): void {
  // Method 1: Using helper method (recommended)
  websocketService.emitJobProgress({
    jobId,
    queueName,
    progress,
    status: "active",
    message: `Job ${progress}% complete`,
    ...(userId && { userId }),
  });

  // Method 2: Using generic broadcast with custom event
  const event = createRealtimeEvent<JobProgressPayload>(
    RealtimeEventType.JOB_PROGRESS,
    {
      jobId,
      queueName,
      progress,
      status: "active",
      message: `Processing: ${progress}%`,
      ...(userId && { userId }),
    },
  );

  // Broadcast via WebSocket
  websocketService.toUser(userId ?? "anonymous", event);

  // Broadcast via SSE
  sseService.sendToUser(userId ?? "anonymous", event);
}

/**
 * Example 2: Streaming analysis logs via SSE
 *
 * Use this for long-running operations where you want to stream logs
 */
export function streamAnalysisProgress(
  projectId: string,
  analysisId: string,
  currentStation: number,
  progress: number,
  logs: string[],
): void {
  const event = createRealtimeEvent<AnalysisProgressPayload>(
    RealtimeEventType.ANALYSIS_PROGRESS,
    {
      projectId,
      analysisId,
      currentStation,
      totalStations: 7,
      stationName: `Station ${currentStation}`,
      progress,
      logs,
    },
  );

  // Send to analysis room
  const analysisRoom = `analysis:${analysisId}`;

  // Via WebSocket
  websocketService.toRoom(analysisRoom, event);

  // Via SSE
  sseService.sendToRoom(analysisRoom, event);

  // Also stream raw log data if needed
  logs.forEach((_log) => {
    // Stream each log line to SSE clients
    // Note: This requires knowing the clientId
    // You would typically track this when initializing the SSE connection
  });
}

/**
 * Example 3: Integrating with BullMQ job processor
 *
 * Add this code to your BullMQ job processor to emit real-time updates
 */
export async function exampleJobProcessorWithRealtime(
  job: ExampleRealtimeJob,
): Promise<{ success: boolean; data: string }> {
  const userId =
    typeof job.data["userId"] === "string" ? job.data["userId"] : undefined;
  const jobId = String(job.id ?? "");

  // Emit job started
  websocketService.emitJobStarted({
    jobId,
    queueName: "ai-analysis",
    jobName: job.name,
    data: job.data,
    ...(userId ? { userId } : {}),
  });

  try {
    // Simulate work with progress updates
    for (let i = 0; i <= 100; i += 10) {
      // Update progress
      await job.updateProgress(i);

      // Emit progress via WebSocket & SSE
      websocketService.emitJobProgress({
        jobId,
        queueName: "ai-analysis",
        progress: i,
        status: "active",
        message: `Processing... ${i}%`,
        currentStep: `Step ${i / 10}`,
        totalSteps: 10,
        completedSteps: i / 10,
        ...(userId ? { userId } : {}),
      });

      // Simulate work
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const result = { success: true, data: "Job completed successfully" };

    // Emit job completed
    websocketService.emitJobCompleted({
      jobId,
      queueName: "ai-analysis",
      result,
      duration: Date.now() - job.timestamp,
      ...(userId ? { userId } : {}),
    });

    return result;
  } catch (error: unknown) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error));

    // Emit job failed
    websocketService.emitJobFailed({
      jobId,
      queueName: "ai-analysis",
      error: normalizedError.message,
      attemptsMade: job.attemptsMade,
      attemptsMax: job.opts.attempts ?? 3,
      ...(normalizedError.stack ? { stackTrace: normalizedError.stack } : {}),
      ...(userId ? { userId } : {}),
    });

    throw error;
  }
}

/**
 * Example 4: Broadcasting to specific rooms
 *
 * Use rooms to group related clients (e.g., project members)
 */
export function broadcastToProjectRoom(
  projectId: string,
  message: string,
): void {
  const event = createRealtimeEvent<SystemEventPayload>(
    RealtimeEventType.SYSTEM_INFO,
    {
      level: "info" as const,
      message,
      details: { projectId },
    },
  );

  // Broadcast to all clients subscribed to this project
  websocketService.toProject(projectId, event);
  sseService.sendToRoom(`project:${projectId}`, event);
}

/**
 * Example 5: Client-side usage (for reference)
 *
 * This is how clients would connect and receive events
 */
export const clientSideExample = `
// ============================================
// WebSocket Client (using socket.io-client)
// ============================================
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  transports: ['websocket', 'polling'],
  auth: {
    token: 'your-jwt-token', // Optional
  },
});

// Authenticate after connection
socket.on('connected', (data) => {
  logger.info('Connected:', data);

  // Authenticate with userId
  socket.emit('authenticate', {
    userId: 'user-123',
    token: 'your-jwt-token',
  });
});

// Listen for authentication success
socket.on('authenticated', (data) => {
  logger.info('Authenticated:', data);

  // Subscribe to rooms
  socket.emit('subscribe', { room: 'project:abc123' });
  socket.emit('subscribe', { room: 'queue:ai-analysis' });
});

// Listen for job progress
socket.on('job:progress', (data) => {
  logger.info('Job progress:', data);
  // Update UI with progress
  updateProgressBar(data.progress);
});

// Listen for job completed
socket.on('job:completed', (data) => {
  logger.info('Job completed:', data);
  // Show success message
  showSuccessNotification(data.result);
});

// Listen for errors
socket.on('system:error', (data) => {
  logger.error('System error:', data);
  showErrorNotification(data.message);
});

// Handle disconnection
socket.on('disconnected', () => {
  logger.info('Disconnected from server');
});

// ============================================
// SSE Client (using EventSource)
// ============================================
const eventSource = new EventSource('http://localhost:3000/api/realtime/events', {
  withCredentials: true,
});

// Listen for connection
eventSource.addEventListener('connected', (event) => {
  logger.info('SSE Connected:', JSON.parse(event.data));
});

// Listen for job progress
eventSource.addEventListener('job:progress', (event) => {
  const data = JSON.parse(event.data);
  logger.info('Job progress:', data);
  updateProgressBar(data.progress);
});

// Listen for analysis progress
eventSource.addEventListener('analysis:progress', (event) => {
  const data = JSON.parse(event.data);
  logger.info('Analysis progress:', data);

  // Stream logs to UI
  data.logs?.forEach(log => appendLog(log));
});

// Handle errors
eventSource.onerror = (error) => {
  logger.error('SSE Error:', error);
  // Reconnect logic
};

// ============================================
// Stream specific job progress
// ============================================
const jobEventSource = new EventSource(
  'http://localhost:3000/api/realtime/jobs/job-123/stream',
  { withCredentials: true }
);

jobEventSource.addEventListener('job:progress', (event) => {
  const data = JSON.parse(event.data);
  updateJobProgress(data);
});

// ============================================
// Stream analysis logs
// ============================================
const analysisEventSource = new EventSource(
  'http://localhost:3000/api/realtime/analysis/analysis-456/stream',
  { withCredentials: true }
);

analysisEventSource.addEventListener('analysis:progress', (event) => {
  const data = JSON.parse(event.data);
  appendAnalysisLog(data.logs);
});
`;

/**
 * Example 6: Testing the real-time system
 *
 * Use these functions to test the real-time communication
 */
export function testRealtimeSystem(): void {
  logger.info("Testing real-time system...");

  // Test 1: Broadcast a test event
  const testEvent = createRealtimeEvent<SystemEventPayload>(
    RealtimeEventType.SYSTEM_INFO,
    {
      level: "info" as const,
      message: "Real-time system test",
      details: {
        timestamp: new Date().toISOString(),
        test: true,
      },
    },
  );

  websocketService.broadcast(testEvent);
  sseService.broadcast(testEvent);

  // Test 2: Simulate job progress
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;

    websocketService.emitJobProgress({
      jobId: "test-job-123",
      queueName: "test-queue",
      progress,
      status: "active",
      message: `Test progress: ${progress}%`,
    });

    if (progress >= 100) {
      clearInterval(interval);

      websocketService.emitJobCompleted({
        jobId: "test-job-123",
        queueName: "test-queue",
        result: { success: true },
        duration: 10000,
      });
    }
  }, 1000);

  // Test 3: Get stats
  setTimeout(() => {
    const wsStats = websocketService.getStats();
    const sseStats = sseService.getStats();

    logger.info("WebSocket Stats:", wsStats);
    logger.info("SSE Stats:", sseStats);
  }, 15000);
}

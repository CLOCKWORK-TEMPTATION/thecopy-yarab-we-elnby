/**
 * Realtime Service Tests
 *
 * Comprehensive tests for the unified real-time service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { realtimeService, BroadcastTarget } from './realtime.service';
import { websocketService } from './websocket.service';
import { sseService } from './sse.service';
import { RealtimeEventType } from '@/types/realtime.types';

// Mock the underlying services
vi.mock('./websocket.service');
vi.mock('./sse.service');
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('RealtimeService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Broadcasting', () => {
    it('should broadcast to both WebSocket and SSE by default', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test broadcast',
        },
      };

      realtimeService.broadcast(testEvent);

      expect(websocketService.broadcast).toHaveBeenCalledWith(testEvent);
      expect(sseService.broadcast).toHaveBeenCalledWith(testEvent, undefined);
    });

    it('should broadcast only to WebSocket when specified', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test WebSocket only',
        },
      };

      realtimeService.broadcast(testEvent, {
        target: BroadcastTarget.WEBSOCKET,
      });

      expect(websocketService.broadcast).toHaveBeenCalledWith(testEvent);
      expect(sseService.broadcast).not.toHaveBeenCalled();
    });

    it('should broadcast only to SSE when specified', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test SSE only',
        },
      };

      realtimeService.broadcast(testEvent, {
        target: BroadcastTarget.SSE,
        eventId: 'event-123',
      });

      expect(websocketService.broadcast).not.toHaveBeenCalled();
      expect(sseService.broadcast).toHaveBeenCalledWith(testEvent, 'event-123');
    });

    it('should handle broadcast errors gracefully', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test',
        },
      };

      vi.mocked(websocketService.broadcast).mockImplementationOnce(() => {
        throw new Error('Broadcast error');
      });

      expect(() => realtimeService.broadcast(testEvent)).not.toThrow();
    });
  });

  describe('Room Messaging', () => {
    it('should send to room via both channels', () => {
      const testEvent = {
        event: RealtimeEventType.JOB_PROGRESS,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.JOB_PROGRESS,
          jobId: 'job-123',
          queueName: 'test-queue',
          progress: 50,
          status: 'active' as const,
        },
      };

      realtimeService.toRoom('queue:test-queue', testEvent);

      expect(websocketService.toRoom).toHaveBeenCalledWith('queue:test-queue', testEvent);
      expect(sseService.sendToRoom).toHaveBeenCalledWith(
        'queue:test-queue',
        testEvent,
        undefined
      );
    });

    it('should send to room with event ID for SSE', () => {
      const testEvent = {
        event: RealtimeEventType.ANALYSIS_PROGRESS,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.ANALYSIS_PROGRESS,
          projectId: 'project-123',
          analysisId: 'analysis-456',
          currentStation: 3,
          totalStations: 7,
          stationName: 'Station 3',
          progress: 43,
        },
      };

      realtimeService.toRoom('analysis:analysis-456', testEvent, {
        eventId: 'event-789',
      });

      expect(sseService.sendToRoom).toHaveBeenCalledWith(
        'analysis:analysis-456',
        testEvent,
        'event-789'
      );
    });

    it('should handle room messaging errors', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test',
        },
      };

      vi.mocked(websocketService.toRoom).mockImplementationOnce(() => {
        throw new Error('Room error');
      });

      expect(() => realtimeService.toRoom('test-room', testEvent)).not.toThrow();
    });
  });

  describe('User Messaging', () => {
    it('should send to user via both channels', () => {
      const testEvent = {
        event: RealtimeEventType.JOB_COMPLETED,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.JOB_COMPLETED,
          jobId: 'job-123',
          queueName: 'test-queue',
          result: { success: true },
          duration: 5000,
        },
      };

      realtimeService.toUser('user-123', testEvent);

      expect(websocketService.toUser).toHaveBeenCalledWith('user-123', testEvent);
      expect(sseService.sendToUser).toHaveBeenCalledWith('user-123', testEvent, undefined);
    });

    it('should send to user with specific target', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'User notification',
        },
      };

      realtimeService.toUser('user-456', testEvent, {
        target: BroadcastTarget.WEBSOCKET,
      });

      expect(websocketService.toUser).toHaveBeenCalledWith('user-456', testEvent);
      expect(sseService.sendToUser).not.toHaveBeenCalled();
    });
  });

  describe('Project Messaging', () => {
    it('should send to project room', () => {
      const testEvent = {
        event: RealtimeEventType.ANALYSIS_STARTED,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.ANALYSIS_STARTED,
          projectId: 'project-123',
          analysisId: 'analysis-456',
        },
      };

      realtimeService.toProject('project-123', testEvent);

      expect(websocketService.toRoom).toHaveBeenCalledWith('project:project-123', testEvent);
      expect(sseService.sendToRoom).toHaveBeenCalledWith(
        'project:project-123',
        testEvent,
        undefined
      );
    });
  });

  describe('Queue Messaging', () => {
    it('should send to queue room', () => {
      const testEvent = {
        event: RealtimeEventType.QUEUE_ACTIVE,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.QUEUE_ACTIVE,
          queueName: 'ai-analysis',
        },
      };

      realtimeService.toQueue('ai-analysis', testEvent);

      expect(websocketService.toRoom).toHaveBeenCalledWith('queue:ai-analysis', testEvent);
      expect(sseService.sendToRoom).toHaveBeenCalledWith(
        'queue:ai-analysis',
        testEvent,
        undefined
      );
    });
  });

  describe('Job Events', () => {
    it('should emit job started event', () => {
      realtimeService.emitJobStarted({
        jobId: 'job-123',
        queueName: 'test-queue',
        jobName: 'test-job',
        userId: 'user-123',
      });

      expect(websocketService.toRoom).toHaveBeenCalledWith(
        'queue:test-queue',
        expect.objectContaining({
          event: RealtimeEventType.JOB_STARTED,
        })
      );
      expect(websocketService.toUser).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          event: RealtimeEventType.JOB_STARTED,
        })
      );
    });

    it('should emit job progress event', () => {
      realtimeService.emitJobProgress({
        jobId: 'job-123',
        queueName: 'test-queue',
        progress: 75,
        status: 'active',
        userId: 'user-123',
      });

      expect(websocketService.toRoom).toHaveBeenCalled();
      expect(websocketService.toUser).toHaveBeenCalled();
    });

    it('should emit job completed event', () => {
      realtimeService.emitJobCompleted({
        jobId: 'job-123',
        queueName: 'test-queue',
        result: { success: true },
        duration: 5000,
        userId: 'user-123',
      });

      expect(websocketService.toRoom).toHaveBeenCalledWith(
        'queue:test-queue',
        expect.objectContaining({
          event: RealtimeEventType.JOB_COMPLETED,
        })
      );
    });

    it('should emit job failed event', () => {
      realtimeService.emitJobFailed({
        jobId: 'job-123',
        queueName: 'test-queue',
        error: 'Test error',
        attemptsMade: 3,
        attemptsMax: 3,
        userId: 'user-123',
      });

      expect(websocketService.toRoom).toHaveBeenCalledWith(
        'queue:test-queue',
        expect.objectContaining({
          event: RealtimeEventType.JOB_FAILED,
        })
      );
    });

    it('should emit job events without userId', () => {
      realtimeService.emitJobStarted({
        jobId: 'job-456',
        queueName: 'test-queue',
        jobName: 'test-job',
      });

      expect(websocketService.toRoom).toHaveBeenCalled();
      expect(websocketService.toUser).not.toHaveBeenCalled();
    });
  });

  describe('Analysis Events', () => {
    it('should emit analysis progress event', () => {
      realtimeService.emitAnalysisProgress({
        projectId: 'project-123',
        analysisId: 'analysis-456',
        currentStation: 3,
        totalStations: 7,
        stationName: 'Station 3',
        progress: 43,
        userId: 'user-123',
      });

      expect(websocketService.toRoom).toHaveBeenCalledWith(
        'project:project-123',
        expect.anything()
      );
      expect(websocketService.toRoom).toHaveBeenCalledWith(
        'analysis:analysis-456',
        expect.anything()
      );
      expect(websocketService.toUser).toHaveBeenCalledWith('user-123', expect.anything());
    });

    it('should emit station completed event', () => {
      realtimeService.emitStationCompleted({
        projectId: 'project-123',
        analysisId: 'analysis-456',
        stationNumber: 3,
        stationName: 'Station 3',
        result: { data: 'test' },
        duration: 2000,
        userId: 'user-123',
      });

      expect(websocketService.toRoom).toHaveBeenCalledWith(
        'project:project-123',
        expect.objectContaining({
          event: RealtimeEventType.ANALYSIS_STATION_COMPLETED,
        })
      );
    });
  });

  describe('System Events', () => {
    it('should emit system info event', () => {
      realtimeService.emitSystemInfo('System information', { version: '1.0' });

      expect(websocketService.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          event: RealtimeEventType.SYSTEM_INFO,
        })
      );
    });

    it('should emit system warning event', () => {
      realtimeService.emitSystemWarning('System warning', { code: 'WARN_001' });

      expect(websocketService.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          event: RealtimeEventType.SYSTEM_WARNING,
        })
      );
    });

    it('should emit system error event', () => {
      realtimeService.emitSystemError('System error', { code: 'ERR_001' });

      expect(websocketService.broadcast).toHaveBeenCalledWith(
        expect.objectContaining({
          event: RealtimeEventType.SYSTEM_ERROR,
        })
      );
    });

    it('should emit system event to specific user', () => {
      realtimeService.emitSystemInfo('User info', undefined, {
        userId: 'user-123',
      });

      expect(websocketService.toUser).toHaveBeenCalledWith('user-123', expect.anything());
      expect(websocketService.broadcast).not.toHaveBeenCalled();
    });

    it('should emit system event to specific room', () => {
      realtimeService.emitSystemInfo('Room info', undefined, {
        room: 'project:123',
      });

      expect(websocketService.toRoom).toHaveBeenCalledWith('project:123', expect.anything());
      expect(websocketService.broadcast).not.toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return comprehensive statistics', () => {
      const mockWsStats = {
        totalConnections: 5,
        authenticatedConnections: 4,
        rooms: ['user:1', 'project:123'],
      };

      const mockSseStats = {
        totalClients: 3,
        authenticatedClients: 2,
        rooms: [{ name: 'queue:analysis', clients: 2 }],
        users: [{ userId: 'user-1', clients: 1 }],
      };

      vi.mocked(websocketService.getStats).mockReturnValue(mockWsStats);
      vi.mocked(sseService.getStats).mockReturnValue(mockSseStats);

      const stats = realtimeService.getStats();

      expect(stats.websocket).toEqual(mockWsStats);
      expect(stats.sse).toEqual(mockSseStats);
      expect(stats.timestamp).toBeDefined();
    });
  });

  describe('Health Check', () => {
    it('should return healthy status when both services operational', () => {
      vi.mocked(websocketService.getIO).mockReturnValue({} as never);
      vi.mocked(sseService.getStats).mockReturnValue({
        totalClients: 5,
        authenticatedClients: 3,
        rooms: [],
        users: [],
      });

      const health = realtimeService.getHealth();

      expect(health.overall).toBe('healthy');
      expect(health.websocket["status"]).toBe('operational');
      expect(health.sse["status"]).toBe('operational');
    });

    it('should return degraded status when WebSocket not initialized', () => {
      vi.mocked(websocketService.getIO).mockReturnValue(null);
      vi.mocked(sseService.getStats).mockReturnValue({
        totalClients: 5,
        authenticatedClients: 3,
        rooms: [],
        users: [],
      });

      const health = realtimeService.getHealth();

      expect(health.overall).toBe('degraded');
      expect(health.websocket["status"]).toBe('not_initialized');
      expect(health.sse["status"]).toBe('operational');
    });
  });

  describe('SSE-specific Features', () => {
    it('should stream data to SSE client', () => {
      vi.mocked(sseService.streamData).mockReturnValue(true);

      const result = realtimeService.streamToSSE('client-1', 'log data', 'analysis:log');

      expect(sseService.streamData).toHaveBeenCalledWith('client-1', 'log data', 'analysis:log');
      expect(result).toBe(true);
    });

    it('should handle SSE streaming errors', () => {
      vi.mocked(sseService.streamData).mockImplementationOnce(() => {
        throw new Error('Stream error');
      });

      const result = realtimeService.streamToSSE('client-1', 'data');

      expect(result).toBe(false);
    });

    it('should subscribe SSE client to room', () => {
      realtimeService.subscribeSSEClientToRoom('client-1', 'project:123');

      expect(sseService.subscribeToRoom).toHaveBeenCalledWith('client-1', 'project:123');
    });

    it('should unsubscribe SSE client from room', () => {
      realtimeService.unsubscribeSSEClientFromRoom('client-1', 'project:123');

      expect(sseService.unsubscribeFromRoom).toHaveBeenCalledWith('client-1', 'project:123');
    });

    it('should handle SSE subscription errors', () => {
      vi.mocked(sseService.subscribeToRoom).mockImplementationOnce(() => {
        throw new Error('Subscription error');
      });

      expect(() =>
        realtimeService.subscribeSSEClientToRoom('client-1', 'room')
      ).not.toThrow();
    });
  });

  describe('Shutdown', () => {
    it('should shutdown all services', async () => {
      vi.mocked(websocketService.shutdown).mockResolvedValue(undefined);
      vi.mocked(sseService.shutdown).mockReturnValue(undefined);

      await realtimeService.shutdown();

      expect(websocketService.shutdown).toHaveBeenCalled();
      expect(sseService.shutdown).toHaveBeenCalled();
    });

    it('should handle shutdown errors', async () => {
      vi.mocked(websocketService.shutdown).mockRejectedValue(
        new Error('Shutdown error')
      );

      await expect(realtimeService.shutdown()).rejects.toThrow('Shutdown error');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete job lifecycle', () => {
      const jobData = {
        jobId: 'job-123',
        queueName: 'ai-analysis',
        userId: 'user-123',
      };

      // Job started
      realtimeService.emitJobStarted({
        ...jobData,
        jobName: 'Analysis Job',
      });

      // Job progress
      realtimeService.emitJobProgress({
        ...jobData,
        progress: 50,
        status: 'active',
      });

      // Job completed
      realtimeService.emitJobCompleted({
        ...jobData,
        result: { success: true },
        duration: 5000,
      });

      expect(websocketService.toRoom).toHaveBeenCalledTimes(3);
      expect(websocketService.toUser).toHaveBeenCalledTimes(3);
    });

    it('should handle multi-channel broadcasting', () => {
      const event = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Multi-channel test',
        },
      };

      // Broadcast to all
      realtimeService.broadcast(event, { target: BroadcastTarget.ALL });

      // Send to specific room
      realtimeService.toRoom('project:123', event, {
        target: BroadcastTarget.WEBSOCKET,
      });

      // Send to specific user
      realtimeService.toUser('user-456', event, {
        target: BroadcastTarget.SSE,
        eventId: 'event-789',
      });

      expect(websocketService.broadcast).toHaveBeenCalled();
      expect(sseService.broadcast).toHaveBeenCalled();
      expect(websocketService.toRoom).toHaveBeenCalled();
      expect(sseService.sendToUser).toHaveBeenCalled();
    });
  });
});

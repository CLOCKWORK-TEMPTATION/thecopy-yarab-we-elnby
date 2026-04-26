/**
 * Realtime Service Tests
 *
 * Comprehensive tests for the unified real-time service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { RealtimeEventType } from '@/types/realtime.types';

const { wsMock, sseMock } = vi.hoisted(() => ({
  wsMock: {
    broadcast: vi.fn(),
    toRoom: vi.fn(),
    toUser: vi.fn(),
    getStats: vi.fn(),
    getIO: vi.fn(),
    shutdown: vi.fn(),
  },
  sseMock: {
    broadcast: vi.fn(),
    sendToRoom: vi.fn(),
    sendToUser: vi.fn(),
    getStats: vi.fn(),
    streamData: vi.fn(),
    subscribeToRoom: vi.fn(),
    unsubscribeFromRoom: vi.fn(),
    shutdown: vi.fn(),
  },
}));

vi.mock('./websocket.service', () => ({ websocketService: wsMock }));
vi.mock('./sse.service', () => ({ sseService: sseMock }));
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { realtimeService, BroadcastTarget } from './realtime.service';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RealtimeService > Broadcasting', () => {
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

    expect(wsMock.broadcast).toHaveBeenCalledWith(testEvent);
    expect(sseMock.broadcast).toHaveBeenCalledWith(testEvent, undefined);
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

    realtimeService.broadcast(testEvent, { target: BroadcastTarget.WEBSOCKET });

    expect(wsMock.broadcast).toHaveBeenCalledWith(testEvent);
    expect(sseMock.broadcast).not.toHaveBeenCalled();
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

    expect(wsMock.broadcast).not.toHaveBeenCalled();
    expect(sseMock.broadcast).toHaveBeenCalledWith(testEvent, 'event-123');
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

    wsMock.broadcast.mockImplementationOnce(() => {
      throw new Error('Broadcast error');
    });

    expect(() => realtimeService.broadcast(testEvent)).not.toThrow();
  });
});

describe('RealtimeService > Room Messaging', () => {
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

    expect(wsMock.toRoom).toHaveBeenCalledWith('queue:test-queue', testEvent);
    expect(sseMock.sendToRoom).toHaveBeenCalledWith('queue:test-queue', testEvent, undefined);
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

    realtimeService.toRoom('analysis:analysis-456', testEvent, { eventId: 'event-789' });

    expect(sseMock.sendToRoom).toHaveBeenCalledWith(
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

    wsMock.toRoom.mockImplementationOnce(() => {
      throw new Error('Room error');
    });

    expect(() => realtimeService.toRoom('test-room', testEvent)).not.toThrow();
  });
});

describe('RealtimeService > User Messaging', () => {
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

    expect(wsMock.toUser).toHaveBeenCalledWith('user-123', testEvent);
    expect(sseMock.sendToUser).toHaveBeenCalledWith('user-123', testEvent, undefined);
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

    realtimeService.toUser('user-456', testEvent, { target: BroadcastTarget.WEBSOCKET });

    expect(wsMock.toUser).toHaveBeenCalledWith('user-456', testEvent);
    expect(sseMock.sendToUser).not.toHaveBeenCalled();
  });
});

describe('RealtimeService > Project Messaging', () => {
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

    expect(wsMock.toRoom).toHaveBeenCalledWith('project:project-123', testEvent);
    expect(sseMock.sendToRoom).toHaveBeenCalledWith(
      'project:project-123',
      testEvent,
      undefined
    );
  });
});

describe('RealtimeService > Queue Messaging', () => {
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

    expect(wsMock.toRoom).toHaveBeenCalledWith('queue:ai-analysis', testEvent);
    expect(sseMock.sendToRoom).toHaveBeenCalledWith('queue:ai-analysis', testEvent, undefined);
  });
});

describe('RealtimeService > Job Events', () => {
  it('should emit job started event', () => {
    realtimeService.emitJobStarted({
      jobId: 'job-123',
      queueName: 'test-queue',
      jobName: 'test-job',
      userId: 'user-123',
    });

    expect(wsMock.toRoom).toHaveBeenCalledWith(
      'queue:test-queue',
      expect.objectContaining({ event: RealtimeEventType.JOB_STARTED })
    );
    expect(wsMock.toUser).toHaveBeenCalledWith(
      'user-123',
      expect.objectContaining({ event: RealtimeEventType.JOB_STARTED })
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

    expect(wsMock.toRoom).toHaveBeenCalled();
    expect(wsMock.toUser).toHaveBeenCalled();
  });

  it('should emit job completed event', () => {
    realtimeService.emitJobCompleted({
      jobId: 'job-123',
      queueName: 'test-queue',
      result: { success: true },
      duration: 5000,
      userId: 'user-123',
    });

    expect(wsMock.toRoom).toHaveBeenCalledWith(
      'queue:test-queue',
      expect.objectContaining({ event: RealtimeEventType.JOB_COMPLETED })
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

    expect(wsMock.toRoom).toHaveBeenCalledWith(
      'queue:test-queue',
      expect.objectContaining({ event: RealtimeEventType.JOB_FAILED })
    );
  });

  it('should emit job events without userId', () => {
    realtimeService.emitJobStarted({
      jobId: 'job-456',
      queueName: 'test-queue',
      jobName: 'test-job',
    });

    expect(wsMock.toRoom).toHaveBeenCalled();
    expect(wsMock.toUser).not.toHaveBeenCalled();
  });
});

describe('RealtimeService > Analysis Events', () => {
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

    expect(wsMock.toRoom).toHaveBeenCalledWith('project:project-123', expect.anything());
    expect(wsMock.toRoom).toHaveBeenCalledWith('analysis:analysis-456', expect.anything());
    expect(wsMock.toUser).toHaveBeenCalledWith('user-123', expect.anything());
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

    expect(wsMock.toRoom).toHaveBeenCalledWith(
      'project:project-123',
      expect.objectContaining({
        event: RealtimeEventType.ANALYSIS_STATION_COMPLETED,
      })
    );
  });
});

describe('RealtimeService > System Events', () => {
  it('should emit system info event', () => {
    realtimeService.emitSystemInfo('System information', { version: '1.0' });
    expect(wsMock.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ event: RealtimeEventType.SYSTEM_INFO })
    );
  });

  it('should emit system warning event', () => {
    realtimeService.emitSystemWarning('System warning', { code: 'WARN_001' });
    expect(wsMock.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ event: RealtimeEventType.SYSTEM_WARNING })
    );
  });

  it('should emit system error event', () => {
    realtimeService.emitSystemError('System error', { code: 'ERR_001' });
    expect(wsMock.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({ event: RealtimeEventType.SYSTEM_ERROR })
    );
  });

  it('should emit system event to specific user', () => {
    realtimeService.emitSystemInfo('User info', undefined, { userId: 'user-123' });
    expect(wsMock.toUser).toHaveBeenCalledWith('user-123', expect.anything());
    expect(wsMock.broadcast).not.toHaveBeenCalled();
  });

  it('should emit system event to specific room', () => {
    realtimeService.emitSystemInfo('Room info', undefined, { room: 'project:123' });
    expect(wsMock.toRoom).toHaveBeenCalledWith('project:123', expect.anything());
    expect(wsMock.broadcast).not.toHaveBeenCalled();
  });
});

describe('RealtimeService > Statistics', () => {
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

    wsMock.getStats.mockReturnValue(mockWsStats);
    sseMock.getStats.mockReturnValue(mockSseStats);

    const stats = realtimeService.getStats();

    expect(stats.websocket).toEqual(mockWsStats);
    expect(stats.sse).toEqual(mockSseStats);
    expect(stats.timestamp).toBeDefined();
  });
});

describe('RealtimeService > Health Check', () => {
  it('should return healthy status when both services operational', () => {
    wsMock.getIO.mockReturnValue({});
    sseMock.getStats.mockReturnValue({
      totalClients: 5,
      authenticatedClients: 3,
      rooms: [],
      users: [],
    });

    const health = realtimeService.getHealth();

    expect(health.overall).toBe('healthy');
    expect(health.websocket.status).toBe('operational');
    expect(health.sse.status).toBe('operational');
  });

  it('should return degraded status when WebSocket not initialized', () => {
    wsMock.getIO.mockReturnValue(null);
    sseMock.getStats.mockReturnValue({
      totalClients: 5,
      authenticatedClients: 3,
      rooms: [],
      users: [],
    });

    const health = realtimeService.getHealth();

    expect(health.overall).toBe('degraded');
    expect(health.websocket.status).toBe('not_initialized');
    expect(health.sse.status).toBe('operational');
  });
});

describe('RealtimeService > SSE-specific Features', () => {
  it('should stream data to SSE client', () => {
    sseMock.streamData.mockReturnValue(true);

    const result = realtimeService.streamToSSE('client-1', 'log data', 'analysis:log');

    expect(sseMock.streamData).toHaveBeenCalledWith('client-1', 'log data', 'analysis:log');
    expect(result).toBe(true);
  });

  it('should handle SSE streaming errors', () => {
    sseMock.streamData.mockImplementationOnce(() => {
      throw new Error('Stream error');
    });

    const result = realtimeService.streamToSSE('client-1', 'data');

    expect(result).toBe(false);
  });

  it('should subscribe SSE client to room', () => {
    realtimeService.subscribeSSEClientToRoom('client-1', 'project:123');
    expect(sseMock.subscribeToRoom).toHaveBeenCalledWith('client-1', 'project:123');
  });

  it('should unsubscribe SSE client from room', () => {
    realtimeService.unsubscribeSSEClientFromRoom('client-1', 'project:123');
    expect(sseMock.unsubscribeFromRoom).toHaveBeenCalledWith('client-1', 'project:123');
  });

  it('should handle SSE subscription errors', () => {
    sseMock.subscribeToRoom.mockImplementationOnce(() => {
      throw new Error('Subscription error');
    });
    expect(() => realtimeService.subscribeSSEClientToRoom('client-1', 'room')).not.toThrow();
  });
});

describe('RealtimeService > Shutdown', () => {
  it('should shutdown all services', async () => {
    wsMock.shutdown.mockResolvedValue(undefined);
    sseMock.shutdown.mockReturnValue(undefined);

    await realtimeService.shutdown();

    expect(wsMock.shutdown).toHaveBeenCalled();
    expect(sseMock.shutdown).toHaveBeenCalled();
  });

  it('should handle shutdown errors', async () => {
    wsMock.shutdown.mockRejectedValue(new Error('Shutdown error'));
    await expect(realtimeService.shutdown()).rejects.toThrow('Shutdown error');
  });
});

describe('RealtimeService > Integration Scenarios', () => {
  it('should handle complete job lifecycle', () => {
    const jobData = {
      jobId: 'job-123',
      queueName: 'ai-analysis',
      userId: 'user-123',
    };

    realtimeService.emitJobStarted({ ...jobData, jobName: 'Analysis Job' });
    realtimeService.emitJobProgress({ ...jobData, progress: 50, status: 'active' });
    realtimeService.emitJobCompleted({
      ...jobData,
      result: { success: true },
      duration: 5000,
    });

    expect(wsMock.toRoom).toHaveBeenCalledTimes(3);
    expect(wsMock.toUser).toHaveBeenCalledTimes(3);
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

    realtimeService.broadcast(event, { target: BroadcastTarget.ALL });
    realtimeService.toRoom('project:123', event, { target: BroadcastTarget.WEBSOCKET });
    realtimeService.toUser('user-456', event, {
      target: BroadcastTarget.SSE,
      eventId: 'event-789',
    });

    expect(wsMock.broadcast).toHaveBeenCalled();
    expect(sseMock.broadcast).toHaveBeenCalled();
    expect(wsMock.toRoom).toHaveBeenCalled();
    expect(sseMock.sendToUser).toHaveBeenCalled();
  });
});

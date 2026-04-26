/**
 * SSE Service Tests
 *
 * Comprehensive tests for Server-Sent Events service functionality
 */

import { Response } from 'express';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { RealtimeEventType } from '@/types/realtime.types';

import { sseService } from './sse.service';


// Mock Response object
const createMockResponse = (): Partial<Response> => ({
  setHeader: vi.fn(),
  write: vi.fn(),
  end: vi.fn(),
  on: vi.fn(),
});

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('SSEService', () => {
  let mockResponse: Partial<Response>;
  let closeCallback: (() => void) | undefined;
  let errorCallback: ((error: Error) => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    mockResponse = createMockResponse();

    // Capture event handlers
    vi.mocked(mockResponse.on as never).mockImplementation((event: string, callback: any) => {
      if (event === 'close') {
        closeCallback = callback;
      } else if (event === 'error') {
        errorCallback = callback;
      }
    });
  });

  afterEach(() => {
    // Clean up any active connections
    sseService.shutdown();
  });

  describe('Connection Initialization', () => {
    it('should initialize SSE connection with correct headers', () => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Credentials', 'true');
    });

    it('should send initial connection event', () => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('event: connected')
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('SSE connection established')
      );
    });

    it('should support anonymous connections', () => {
      sseService.initializeConnection(
        'client-anonymous',
        mockResponse as Response
      );

      expect(mockResponse.setHeader).toHaveBeenCalled();
      expect(mockResponse.write).toHaveBeenCalled();
    });

    it('should track lastEventId for reconnection', () => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123',
        'last-event-456'
      );

      expect(mockResponse.write).toHaveBeenCalled();
    });

    it('should setup keep-alive ping', () => {
      vi.useFakeTimers();

      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );

      // Clear initial writes
      vi.mocked(mockResponse.write as never).mockClear();

      // Fast-forward 30 seconds
      vi.advanceTimersByTime(30000);

      expect(mockResponse.write).toHaveBeenCalledWith(': keep-alive\n\n');

      vi.useRealTimers();
    });
  });

  describe('Room Subscriptions', () => {
    beforeEach(() => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
      vi.mocked(mockResponse.write as never).mockClear();
    });

    it('should allow client to subscribe to room', () => {
      sseService.subscribeToRoom('client-1', 'project:123');

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('Subscribed to room: project:123')
      );
    });

    it('should allow client to unsubscribe from room', () => {
      sseService.subscribeToRoom('client-1', 'project:123');
      vi.mocked(mockResponse.write as never).mockClear();

      sseService.unsubscribeFromRoom('client-1', 'project:123');

      // Should not send event on unsubscribe
      expect(mockResponse.write).not.toHaveBeenCalled();
    });

    it('should handle subscription for non-existent client', () => {
      sseService.subscribeToRoom('non-existent-client', 'project:123');

      // Should not throw error
      expect(true).toBe(true);
    });

    it('should allow multiple room subscriptions', () => {
      sseService.subscribeToRoom('client-1', 'project:123');
      sseService.subscribeToRoom('client-1', 'queue:analysis');
      sseService.subscribeToRoom('client-1', 'user:456');

      expect(mockResponse.write).toHaveBeenCalledTimes(3);
    });
  });

  describe('Sending Events', () => {
    beforeEach(() => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
      (mockResponse.write as jest.Mock).mockClear();
    });

    it('should send event to specific client', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test message',
        },
      };

      const result = sseService.sendToClient('client-1', testEvent);

      expect(result).toBe(true);
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('event: system:info')
      );
      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('Test message')
      );
    });

    it('should return false when sending to non-existent client', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test',
        },
      };

      const result = sseService.sendToClient('non-existent', testEvent);

      expect(result).toBe(false);
    });

    it('should send event with custom event ID', () => {
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

      sseService.sendToClient('client-1', testEvent, 'event-id-456');

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('id: event-id-456')
      );
    });

    it('should format SSE message correctly', () => {
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

      sseService.sendToClient('client-1', testEvent);

      const writtenData = (mockResponse.write as jest.Mock).mock.calls[0][0];

      expect(writtenData).toContain('event: job:completed');
      expect(writtenData).toContain('data: ');
      expect(writtenData).toContain('"jobId":"job-123"');
      expect(writtenData).toContain('\n\n'); // SSE message terminator
    });
  });

  describe('Room Broadcasting', () => {
    let mockResponse2: Partial<Response>;

    beforeEach(() => {
      mockResponse2 = createMockResponse();

      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
      sseService.initializeConnection(
        'client-2',
        mockResponse2 as Response,
        'user-456'
      );

      sseService.subscribeToRoom('client-1', 'project:123');
      sseService.subscribeToRoom('client-2', 'project:123');

      (mockResponse.write as jest.Mock).mockClear();
      (mockResponse2.write as jest.Mock).mockClear();
    });

    afterEach(() => {
      sseService.shutdown();
    });

    it('should send event to all clients in room', () => {
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

      const count = sseService.sendToRoom('project:123', testEvent);

      expect(count).toBe(2);
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse2.write).toHaveBeenCalled();
    });

    it('should return 0 for non-existent room', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test',
        },
      };

      const count = sseService.sendToRoom('non-existent-room', testEvent);

      expect(count).toBe(0);
    });
  });

  describe('User Broadcasting', () => {
    let mockResponse2: Partial<Response>;

    beforeEach(() => {
      mockResponse2 = createMockResponse();

      // Same user with multiple connections
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
      sseService.initializeConnection(
        'client-2',
        mockResponse2 as Response,
        'user-123'
      );

      (mockResponse.write as jest.Mock).mockClear();
      (mockResponse2.write as jest.Mock).mockClear();
    });

    afterEach(() => {
      sseService.shutdown();
    });

    it('should send event to all connections of a user', () => {
      const testEvent = {
        event: RealtimeEventType.JOB_STARTED,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.JOB_STARTED,
          jobId: 'job-123',
          queueName: 'test-queue',
          jobName: 'test-job',
        },
      };

      const count = sseService.sendToUser('user-123', testEvent);

      expect(count).toBe(2);
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse2.write).toHaveBeenCalled();
    });

    it('should return 0 for non-existent user', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test',
        },
      };

      const count = sseService.sendToUser('non-existent-user', testEvent);

      expect(count).toBe(0);
    });
  });

  describe('Global Broadcasting', () => {
    let mockResponse2: Partial<Response>;
    let mockResponse3: Partial<Response>;

    beforeEach(() => {
      mockResponse2 = createMockResponse();
      mockResponse3 = createMockResponse();

      sseService.initializeConnection('client-1', mockResponse as Response, 'user-1');
      sseService.initializeConnection('client-2', mockResponse2 as Response, 'user-2');
      sseService.initializeConnection('client-3', mockResponse3 as Response);

      (mockResponse.write as jest.Mock).mockClear();
      (mockResponse2.write as jest.Mock).mockClear();
      (mockResponse3.write as jest.Mock).mockClear();
    });

    afterEach(() => {
      sseService.shutdown();
    });

    it('should broadcast to all connected clients', () => {
      const testEvent = {
        event: RealtimeEventType.SYSTEM_WARNING,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_WARNING,
          level: 'warning' as const,
          message: 'System maintenance scheduled',
        },
      };

      const count = sseService.broadcast(testEvent);

      expect(count).toBe(3);
      expect(mockResponse.write).toHaveBeenCalled();
      expect(mockResponse2.write).toHaveBeenCalled();
      expect(mockResponse3.write).toHaveBeenCalled();
    });
  });

  describe('Data Streaming', () => {
    beforeEach(() => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
      (mockResponse.write as jest.Mock).mockClear();
    });

    it('should stream raw data to client', () => {
      const result = sseService.streamData('client-1', 'Log line 1');

      expect(result).toBe(true);
      expect(mockResponse.write).toHaveBeenCalledWith('data: Log line 1\n\n');
    });

    it('should stream data with custom event type', () => {
      const result = sseService.streamData('client-1', 'Analysis log', 'analysis:log');

      expect(result).toBe(true);
      expect(mockResponse.write).toHaveBeenCalledWith('event: analysis:log\n');
      expect(mockResponse.write).toHaveBeenCalledWith('data: Analysis log\n\n');
    });

    it('should return false for non-existent client', () => {
      const result = sseService.streamData('non-existent', 'data');

      expect(result).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      sseService.initializeConnection('client-1', mockResponse as Response, 'user-1');
    });

    afterEach(() => {
      sseService.shutdown();
    });

    it('should return correct statistics', () => {
      const stats = sseService.getStats();

      expect(stats.totalClients).toBe(1);
      expect(stats.authenticatedClients).toBe(1);
      expect(Array.isArray(stats.rooms)).toBe(true);
      expect(Array.isArray(stats.users)).toBe(true);
    });

    it('should track room statistics', () => {
      sseService.subscribeToRoom('client-1', 'project:123');

      const stats = sseService.getStats();

      expect(stats.rooms).toContainEqual({
        name: 'project:123',
        clients: 1,
      });
    });

    it('should track user statistics', () => {
      const stats = sseService.getStats();

      expect(stats.users).toContainEqual({
        userId: 'user-1',
        clients: 1,
      });
    });
  });

  describe('Client Disconnection', () => {
    beforeEach(() => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
      sseService.subscribeToRoom('client-1', 'project:123');
    });

    it('should handle client close event', () => {
      expect(closeCallback).toBeDefined();

      if (closeCallback) {
        closeCallback();

        const stats = sseService.getStats();
        expect(stats.totalClients).toBe(0);
      }
    });

    it('should handle client error event', () => {
      expect(errorCallback).toBeDefined();

      if (errorCallback) {
        const testError = new Error('Connection error');
        errorCallback(testError);

        const stats = sseService.getStats();
        expect(stats.totalClients).toBe(0);
      }
    });

    it('should clean up room subscriptions on disconnect', () => {
      if (closeCallback) {
        closeCallback();

        const stats = sseService.getStats();
        expect(stats.rooms.length).toBe(0);
      }
    });

    it('should clean up user mappings on disconnect', () => {
      if (closeCallback) {
        closeCallback();

        const stats = sseService.getStats();
        expect(stats.users.length).toBe(0);
      }
    });
  });

  describe('Manual Client Closure', () => {
    beforeEach(() => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
    });

    it('should close client connection manually', () => {
      sseService.closeClient('client-1');

      expect(mockResponse.end).toHaveBeenCalled();

      const stats = sseService.getStats();
      expect(stats.totalClients).toBe(0);
    });

    it('should handle closing non-existent client', () => {
      sseService.closeClient('non-existent');

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Service Shutdown', () => {
    beforeEach(() => {
      sseService.initializeConnection('client-1', mockResponse as Response, 'user-1');
    });

    it('should disconnect all clients on shutdown', () => {
      sseService.shutdown();

      expect(mockResponse.write).toHaveBeenCalledWith(
        expect.stringContaining('disconnected')
      );
      expect(mockResponse.end).toHaveBeenCalled();

      const stats = sseService.getStats();
      expect(stats.totalClients).toBe(0);
    });

    it('should clear all mappings on shutdown', () => {
      sseService.subscribeToRoom('client-1', 'project:123');

      sseService.shutdown();

      const stats = sseService.getStats();
      expect(stats.rooms.length).toBe(0);
      expect(stats.users.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      sseService.initializeConnection(
        'client-1',
        mockResponse as Response,
        'user-123'
      );
    });

    it('should handle write errors gracefully', () => {
      (mockResponse.write as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Write error');
      });

      const testEvent = {
        event: RealtimeEventType.SYSTEM_INFO,
        payload: {
          timestamp: new Date().toISOString(),
          eventType: RealtimeEventType.SYSTEM_INFO,
          level: 'info' as const,
          message: 'Test',
        },
      };

      const result = sseService.sendToClient('client-1', testEvent);

      expect(result).toBe(false);
      // Client should be disconnected after error
      const stats = sseService.getStats();
      expect(stats.totalClients).toBe(0);
    });
  });
});

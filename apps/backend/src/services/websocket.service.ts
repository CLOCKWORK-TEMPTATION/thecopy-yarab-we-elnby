/* eslint-disable max-lines -- WebSocket service module */
/**
 * WebSocket Service
 *
 * Central service for managing Socket.IO connections and broadcasting events
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import type { ServerOptions } from 'socket.io';
import { getWebSocketConfig, WEBSOCKET_CONFIG } from '@/config/websocket.config';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { authService } from './auth.service';
import { trackWebSocketAuth } from '@/utils/connectivity-telemetry';
import {
  RealtimeEvent,
  RealtimeEventType,
  RealtimePayload,
  WebSocketRoom,
  createRoomName,
  JobProgressPayload,
  JobStartedPayload,
  JobCompletedPayload,
  JobFailedPayload,
} from '@/types/realtime.types';
import { breakappService } from '@/modules/breakapp/service';

/**
 * Extended Socket interface with custom properties
 */
interface AuthenticatedSocket extends Socket {
  userId?: string;
  authenticated?: boolean;
  authExpiresAtMs?: number;
}

/**
 * WebSocket Service Manager
 */
class WebSocketService {
  private io: SocketIOServer | null = null;
  private connections: Map<string, AuthenticatedSocket> = new Map();
  private sessionTimers: Map<string, NodeJS.Timeout> = new Map();

  private setAuthExpiry(
    socket: AuthenticatedSocket,
    expSeconds?: number,
  ): void {
    if (typeof expSeconds === 'number') {
      socket.authExpiresAtMs = expSeconds * 1000;
      return;
    }

    delete socket.authExpiresAtMs;
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.io) {
      logger.warn('[WebSocket] Service already initialized');
      return;
    }

    const config = getWebSocketConfig() as ServerOptions;
    this.io = new SocketIOServer(httpServer, config);

    this.setupEventHandlers();
    logger.info('[WebSocket] Service initialized successfully');
  }

  /**
   * Setup event handlers for Socket.IO
   */

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        let token = null;

        // 1. Try checking handshake auth
        if (socket.handshake.auth && socket.handshake.auth["token"]) {
          token = socket.handshake.auth["token"];
        }

        // 2. Try checking cookies (manual parse to avoid extra dependency)
        if (!token && socket.handshake.headers.cookie) {
          const cookies = socket.handshake.headers.cookie.split(';').reduce((res: Record<string, string>, item) => {
            const data = item.trim().split('=');
            if (data.length === 2 && data[0]) {
              res[data[0]] = decodeURIComponent(data[1]!);
            }
            return res;
          }, {});
          if (cookies['accessToken']) {
            token = cookies['accessToken'];
          }
        }

        if (token) {
          try {
            const decoded = authService.verifyToken(token);
            socket.userId = decoded.userId;
            socket.authenticated = true;
            this.setAuthExpiry(socket, decoded.exp);
          } catch {
            // Invalid token, just proceed unauthenticated or fail
          }
        }

        next();
      } catch {
        next(new Error('Authentication error'));
      }
    });

    this.io.on(WEBSOCKET_CONFIG.EVENTS.CONNECTION, (socket: AuthenticatedSocket) => {
      logger.info(`[WebSocket] Client connected: ${socket.id}`);

      if (socket.authenticated && socket.userId) {
        const userRoom = createRoomName(WebSocketRoom.USER, socket.userId);
        void socket.join(userRoom);
      }

      this.handleConnection(socket);
    });

    // Handle errors at server level
    this.io.engine.on(WEBSOCKET_CONFIG.EVENTS.ERROR, (error: Error) => {
      logger.error('[WebSocket] Engine error:', error);
    });
  }


  /**
   * Handle new client connection
   */
  // eslint-disable-next-line max-lines-per-function
  private handleConnection(socket: AuthenticatedSocket): void {
    // Store connection
    this.connections.set(socket.id, socket);

    let authTimeout: NodeJS.Timeout | null = null;

    if (socket.authenticated === true && socket.userId) {
      trackWebSocketAuth('ws:auth:middleware_success', {
        socketId: socket.id,
        userId: socket.userId,
        authMethod: 'middleware',
      });

      socket.emit(RealtimeEventType.AUTHENTICATED, {
        message: 'Authenticated successfully',
        userId: socket.userId,
        timestamp: new Date().toISOString(),
      });

      if (socket.authExpiresAtMs) {
        this.scheduleSessionExpiry(socket, socket.authExpiresAtMs);
      }
    } else {
      authTimeout = setTimeout(() => {
        if (!socket.authenticated) {
          trackWebSocketAuth('ws:auth:timeout', {
            socketId: socket.id,
            reason: 'auth_timeout',
          });
          logger.warn(`[WebSocket] Authentication timeout for socket: ${socket.id}`);
          socket.emit('auth_error', {
            reason: 'auth_timeout',
            message: 'Connection timed out. Please reconnect.',
          });
          socket.disconnect(true);
        }
      }, WEBSOCKET_CONFIG.TIMEOUTS.AUTHENTICATION);

      socket.on('authenticate', (data: { token?: string; userId?: string }) => {
        if (authTimeout) {
          clearTimeout(authTimeout);
          authTimeout = null;
        }
        this.handleAuthentication(socket, data);
      });
    }

    socket.on('token:refresh', (data: { token?: string }) => {
      this.handleTokenRefresh(socket, data);
    });

    // Handle disconnection
    socket.on(WEBSOCKET_CONFIG.EVENTS.DISCONNECT, (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on(WEBSOCKET_CONFIG.EVENTS.ERROR, (error: Error) => {
      logger.error(`[WebSocket] Socket error for ${socket.id}:`, error);
    });

    // Handle room subscriptions
    socket.on('subscribe', (data: { room: string }) => {
      this.handleRoomSubscription(socket, data.room);
    });

    socket.on('unsubscribe', (data: { room: string }) => {
      this.handleRoomUnsubscription(socket, data.room);
    });

    socket.on('runner:register', (data: { runnerId?: string }) => {
      if (!data?.runnerId) {
        return;
      }

      const room = `breakapp-runner:${data.runnerId}`;
      void socket.join(room);
      socket.emit('runner:registered', {
        runnerId: data.runnerId,
        room,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on(
      'runner:location',
      async (data: {
        runnerId?: string;
        lat?: number;
        lng?: number;
        timestamp?: number;
      }) => {
        if (
          !data?.runnerId ||
          typeof data.lat !== 'number' ||
          typeof data.lng !== 'number'
        ) {
          return;
        }

        await breakappService.updateRunnerLocation({
          runnerId: data.runnerId,
          lat: data.lat,
          lng: data.lng,
          timestamp: data.timestamp ?? Date.now(),
        });
      }
    );

    socket.on(
      'order:status',
      async (data: { orderId?: string; status?: 'pending' | 'processing' | 'completed' | 'cancelled' }) => {
        if (!data?.orderId || !data["status"]) {
          return;
        }

        await breakappService.updateOrderStatus(data.orderId, data["status"]);
        this.emitCustom('order:status:update', {
          orderId: data.orderId,
          status: data["status"],
          timestamp: new Date().toISOString(),
        });
      }
    );

    socket.on(
      'batch:status',
      async (data: { batchId?: string; vendorId?: string; status?: 'pending' | 'in-progress' | 'completed' }) => {
        if (!data?.batchId || !data?.vendorId || !data["status"]) {
          return;
        }

        logger.info('[WebSocket] Batch status update received', {
          batchId: data.batchId,
          vendorId: data.vendorId,
          status: data["status"],
        });

        this.emitCustom('batch:status:update', {
          batchId: data.batchId,
          vendorId: data.vendorId,
          status: data["status"],
          timestamp: new Date().toISOString(),
        });
      }
    );

    // Send connection confirmation
    socket.emit(RealtimeEventType.CONNECTED, {
      socketId: socket.id,
      message: 'Connected successfully',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle client authentication
   *
   * ⚠️ SECURITY WARNING: DEV STUB - NO AUTHENTICATION
   * Current implementation accepts userId without verification
   *
   * 🚨 CRITICAL TODO PRODUCTION: Implement JWT verification
   *
   * Production implementation MUST:
   * 1. Verify JWT token signature using secret key
   * 2. Check token expiration
   * 3. Validate token claims (issuer, audience, etc.)
   * 4. Rate limit authentication attempts
   * 5. Log authentication failures for security monitoring
   *
   * Example production implementation:
   * ```
   * import jwt from 'jsonwebtoken';
   * const decoded = jwt.verify(data.token, process.env['JWT_SECRET']);
   * socket.userId = decoded.userId;
   * ```
   */
  // eslint-disable-next-line max-lines-per-function, complexity
  private handleAuthentication(
    socket: AuthenticatedSocket,
    data: { token?: string; userId?: string }
  ): void {
    if (data.token) {
      try {
        const verified = authService.verifyToken(data.token);
        socket.userId = verified.userId;
        socket.authenticated = true;
        this.setAuthExpiry(socket, verified.exp);

        const userRoom = createRoomName(WebSocketRoom.USER, verified.userId);
        socket.join(userRoom);

        trackWebSocketAuth('ws:auth:event_success', {
          socketId: socket.id,
          userId: verified.userId,
          authMethod: 'event',
        });

        if (socket.authExpiresAtMs) {
          this.scheduleSessionExpiry(socket, socket.authExpiresAtMs);
        }

        socket.emit(RealtimeEventType.AUTHENTICATED, {
          message: 'Authenticated successfully',
          userId: verified.userId,
          timestamp: new Date().toISOString(),
        });
        return;
      } catch {
        trackWebSocketAuth('ws:auth:denied', {
          socketId: socket.id,
          reason: 'invalid_token',
        });
        socket.emit('auth_error', {
          reason: 'invalid_token',
          message: 'Authentication failed. Please sign in again.',
        });
        socket.disconnect(true);
        return;
      }
    }

    const remoteAddress = socket.handshake.address || socket.conn.remoteAddress || '';
    const isLoopback =
      remoteAddress.includes('127.0.0.1') ||
      remoteAddress.includes('::1') ||
      remoteAddress.includes('localhost');

    if (env.NODE_ENV === 'development' && data.userId && isLoopback) {
      socket.userId = data.userId;
      socket.authenticated = true;
      trackWebSocketAuth('ws:auth:dev_fallback', {
        socketId: socket.id,
        userId: data.userId,
        authMethod: 'dev-fallback',
        reason: 'dev_localhost_fallback',
      });

      // Join user-specific room
      const userRoom = createRoomName(WebSocketRoom.USER, data.userId);
      void socket.join(userRoom);

      logger.warn(`[WebSocket] Development fallback auth used for socket ${socket.id} and user ${data.userId}`);

      socket.emit(RealtimeEventType.AUTHENTICATED, {
        message: 'Authenticated successfully',
        userId: data.userId,
        timestamp: new Date().toISOString(),
      });
    } else {
      logger.warn(`[WebSocket] Authentication failed for socket: ${socket.id}`);
      trackWebSocketAuth('ws:auth:denied', {
        socketId: socket.id,
        reason: 'missing_token',
      });
      socket.emit('auth_error', {
        reason: 'missing_token',
        message: 'Authentication required.',
      });
      socket.disconnect(true);
    }
  }

  private handleTokenRefresh(socket: AuthenticatedSocket, data: { token?: string }): void {
    if (!data?.token) {
      socket.emit('auth_error', {
        reason: 'missing_token',
        message: 'Authentication required.',
      });
      return;
    }

    try {
      const verified = authService.verifyToken(data.token);
      socket.userId = verified.userId;
      socket.authenticated = true;
      this.setAuthExpiry(socket, verified.exp);

      if (socket.authExpiresAtMs) {
        this.scheduleSessionExpiry(socket, socket.authExpiresAtMs);
      }

      socket.emit('token:refreshed', {
        userId: verified.userId,
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch {
      socket.emit('auth_error', {
        reason: 'invalid_token',
        message: 'Authentication failed. Please sign in again.',
      });
    }
  }

  private scheduleSessionExpiry(socket: AuthenticatedSocket, expiresAtMs: number): void {
    const timeoutMs = Math.max(expiresAtMs - Date.now(), 1000);
    this.clearSessionExpiry(socket.id);

    const timer = setTimeout(() => {
      socket.emit('auth_error', {
        reason: 'session_expired',
        message: 'Session expired. Please sign in again.',
      });
      socket.disconnect(true);
    }, timeoutMs);

    this.sessionTimers.set(socket.id, timer);
  }

  private clearSessionExpiry(socketId: string): void {
    const timer = this.sessionTimers.get(socketId);
    if (timer) {
      clearTimeout(timer);
      this.sessionTimers.delete(socketId);
    }
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: AuthenticatedSocket, reason: string): void {
    logger.info(`[WebSocket] Client disconnected: ${socket.id}, reason: ${reason}`);
    this.connections.delete(socket.id);
    this.clearSessionExpiry(socket.id);

    if (socket.userId) {
      socket.emit(RealtimeEventType.DISCONNECTED, {
        message: 'Disconnected',
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle room subscription
   */
  private handleRoomSubscription(socket: AuthenticatedSocket, room: string): void {
    if (!socket.authenticated) {
      socket.emit(RealtimeEventType.UNAUTHORIZED, {
        message: 'Must authenticate before subscribing to rooms',
      });
      return;
    }

    const currentRooms = Array.from(socket.rooms).length;
    if (currentRooms >= WEBSOCKET_CONFIG.LIMITS.MAX_ROOMS_PER_SOCKET) {
      socket.emit(RealtimeEventType.SYSTEM_ERROR, {
        message: 'Maximum room limit reached',
      });
      return;
    }

    void socket.join(room);
    logger.info(`[WebSocket] Socket ${socket.id} joined room: ${room}`);
    socket.emit(RealtimeEventType.SYSTEM_INFO, {
      message: `Subscribed to room: ${room}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle room unsubscription
   */
  private handleRoomUnsubscription(socket: AuthenticatedSocket, room: string): void {
    void socket.leave(room);
    logger.info(`[WebSocket] Socket ${socket.id} left room: ${room}`);
    socket.emit(RealtimeEventType.SYSTEM_INFO, {
      message: `Unsubscribed from room: ${room}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast<T extends RealtimePayload>(event: RealtimeEvent<T>): void {
    if (!this.io) {
      logger.warn('[WebSocket] Service not initialized');
      return;
    }

    this.io.emit(event.event, event.payload);
    logger.debug(`[WebSocket] Broadcasted event: ${event.event}`);
  }

  /**
   * Send event to specific room
   */
  toRoom<T extends RealtimePayload>(room: string, event: RealtimeEvent<T>): void {
    if (!this.io) {
      logger.warn('[WebSocket] Service not initialized');
      return;
    }

    this.io.to(room).emit(event.event, event.payload);
    logger.debug(`[WebSocket] Sent event to room ${room}: ${event.event}`);
  }

  /**
   * Send event to specific user
   */
  toUser<T extends RealtimePayload>(userId: string, event: RealtimeEvent<T>): void {
    const userRoom = createRoomName(WebSocketRoom.USER, userId);
    this.toRoom(userRoom, event);
  }

  /**
   * Send event to specific project subscribers
   */
  toProject<T extends RealtimePayload>(projectId: string, event: RealtimeEvent<T>): void {
    const projectRoom = createRoomName(WebSocketRoom.PROJECT, projectId);
    this.toRoom(projectRoom, event);
  }

  /**
   * Send event to queue monitoring room
   */
  toQueue<T extends RealtimePayload>(queueName: string, event: RealtimeEvent<T>): void {
    const queueRoom = createRoomName(WebSocketRoom.QUEUE, queueName);
    this.toRoom(queueRoom, event);
  }

  emitCustom(eventName: string, payload: Record<string, unknown>): void {
    if (!this.io) {
      logger.warn('[WebSocket] Service not initialized');
      return;
    }

    this.io.emit(eventName, payload);
    logger.debug(`[WebSocket] Broadcasted custom event: ${eventName}`);
  }

  /**
   * Emit job progress update
   */
  emitJobProgress(payload: Omit<JobProgressPayload, 'timestamp' | 'eventType'>): void {
    const event: RealtimeEvent<JobProgressPayload> = {
      event: RealtimeEventType.JOB_PROGRESS,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        eventType: RealtimeEventType.JOB_PROGRESS,
      },
    };

    // Broadcast to queue room and user if available
    this.toQueue(payload.queueName, event);
    if (payload.userId) {
      this.toUser(payload.userId, event);
    }
  }

  /**
   * Emit job started event
   */
  emitJobStarted(payload: Omit<JobStartedPayload, 'timestamp' | 'eventType'>): void {
    const event: RealtimeEvent<JobStartedPayload> = {
      event: RealtimeEventType.JOB_STARTED,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        eventType: RealtimeEventType.JOB_STARTED,
      },
    };

    this.toQueue(payload.queueName, event);
    if (payload.userId) {
      this.toUser(payload.userId, event);
    }
  }

  /**
   * Emit job completed event
   */
  emitJobCompleted(payload: Omit<JobCompletedPayload, 'timestamp' | 'eventType'>): void {
    const event: RealtimeEvent<JobCompletedPayload> = {
      event: RealtimeEventType.JOB_COMPLETED,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        eventType: RealtimeEventType.JOB_COMPLETED,
      },
    };

    this.toQueue(payload.queueName, event);
    if (payload.userId) {
      this.toUser(payload.userId, event);
    }
  }

  /**
   * Emit job failed event
   */
  emitJobFailed(payload: Omit<JobFailedPayload, 'timestamp' | 'eventType'>): void {
    const event: RealtimeEvent<JobFailedPayload> = {
      event: RealtimeEventType.JOB_FAILED,
      payload: {
        ...payload,
        timestamp: new Date().toISOString(),
        eventType: RealtimeEventType.JOB_FAILED,
      },
    };

    this.toQueue(payload.queueName, event);
    if (payload.userId) {
      this.toUser(payload.userId, event);
    }
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    authenticatedConnections: number;
    rooms: string[];
  } {
    if (!this.io) {
      return {
        totalConnections: 0,
        authenticatedConnections: 0,
        rooms: [],
      };
    }

    const authenticatedCount = Array.from(this.connections.values()).filter(
      (socket) => socket.authenticated
    ).length;

    // Get all rooms
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys()).filter(
      (room) => !this.connections.has(room) // Filter out socket IDs
    );

    return {
      totalConnections: this.connections.size,
      authenticatedConnections: authenticatedCount,
      rooms,
    };
  }

  /**
   * Shutdown WebSocket service
   */
  async shutdown(): Promise<void> {
    if (!this.io) return;

    logger.info('[WebSocket] Shutting down service...');

    // Disconnect all clients
    void this.io.disconnectSockets(true);

    // Close server
    await new Promise<void>((resolve) => {
      void this.io?.close(() => {
        logger.info('[WebSocket] Service shut down successfully');
        resolve();
      });
    });

    this.connections.clear();
    this.io = null;
  }

  /**
   * Get Socket.IO instance (for advanced usage)
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();

/**
 * WebSocket Service
 *
 * Central service for managing Socket.IO connections and broadcasting events
 */

import { Server as HTTPServer } from "http";

import { Server as SocketIOServer } from "socket.io";

import {
  getWebSocketConfig,
  WEBSOCKET_CONFIG,
} from "@/config/websocket.config";
import { logger } from "@/lib/logger";
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
} from "@/types/realtime.types";

import { authService } from "./auth.service";
import { setAuthExpiry } from "./websocket-auth";
import { getConnections, handleConnection } from "./websocket-handlers";
import { AuthenticatedSocket } from "./websocket-types";

import type { ServerOptions } from "socket.io";

/**
 * WebSocket Service Manager
 */
class WebSocketService {
  private io: SocketIOServer | null = null;
  private connections = getConnections();

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    if (this.io) {
      logger.warn("[WebSocket] Service already initialized");
      return;
    }

    const config = getWebSocketConfig() as ServerOptions;
    this.io = new SocketIOServer(httpServer, config);

    this.setupEventHandlers();
    logger.info("[WebSocket] Service initialized successfully");
  }

  /**
   * Setup event handlers for Socket.IO
   */

  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.use((socket: AuthenticatedSocket, next) => {
      try {
        // 1. Try checking handshake auth
        let token = readStringField(socket.handshake.auth, "token");

        // 2. Try checking cookies (manual parse to avoid extra dependency)
        if (!token && socket.handshake.headers.cookie) {
          const cookies = socket.handshake.headers.cookie
            .split(";")
            .reduce((res: Record<string, string>, item) => {
              const data = item.trim().split("=");
              if (data.length === 2 && data[0]) {
                res[data[0]] = decodeURIComponent(data[1]!);
              }
              return res;
            }, {});
          if (cookies["accessToken"]) {
            token = cookies["accessToken"];
          }
        }

        if (token) {
          try {
            const decoded = authService.verifyToken(token);
            socket.userId = decoded.userId;
            socket.authenticated = true;
            setAuthExpiry(socket, decoded.exp);
          } catch {
            // Invalid token, just proceed unauthenticated or fail
          }
        }

        next();
      } catch {
        next(new Error("Authentication error"));
      }
    });

    this.io.on(
      WEBSOCKET_CONFIG.EVENTS.CONNECTION,
      (socket: AuthenticatedSocket) => {
        logger.info("[WebSocket] Client connected");

        if (socket.authenticated && socket.userId) {
          const userRoom = createRoomName(WebSocketRoom.USER, socket.userId);
          void socket.join(userRoom);
        }

        handleConnection(socket);
      },
    );

    // Handle errors at server level
    this.io.engine.on(WEBSOCKET_CONFIG.EVENTS.ERROR, (error: Error) => {
      logger.error("[WebSocket] Engine error:", error);
    });
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast<T extends RealtimePayload>(event: RealtimeEvent<T>): void {
    if (!this.io) {
      logger.warn("[WebSocket] Service not initialized");
      return;
    }

    this.io.emit(event.event, event.payload);
    logger.debug("[WebSocket] Broadcasted event");
  }

  /**
   * Send event to specific room
   */
  toRoom<T extends RealtimePayload>(
    room: string,
    event: RealtimeEvent<T>,
  ): void {
    if (!this.io) {
      logger.warn("[WebSocket] Service not initialized");
      return;
    }

    this.io.to(room).emit(event.event, event.payload);
    logger.debug("[WebSocket] Sent event to room");
  }

  /**
   * Send event to specific user
   */
  toUser<T extends RealtimePayload>(
    userId: string,
    event: RealtimeEvent<T>,
  ): void {
    const userRoom = createRoomName(WebSocketRoom.USER, userId);
    this.toRoom(userRoom, event);
  }

  /**
   * Send event to specific project subscribers
   */
  toProject<T extends RealtimePayload>(
    projectId: string,
    event: RealtimeEvent<T>,
  ): void {
    const projectRoom = createRoomName(WebSocketRoom.PROJECT, projectId);
    this.toRoom(projectRoom, event);
  }

  /**
   * Send event to queue monitoring room
   */
  toQueue<T extends RealtimePayload>(
    queueName: string,
    event: RealtimeEvent<T>,
  ): void {
    const queueRoom = createRoomName(WebSocketRoom.QUEUE, queueName);
    this.toRoom(queueRoom, event);
  }

  emitCustom(eventName: string, payload: Record<string, unknown>): void {
    if (!this.io) {
      logger.warn("[WebSocket] Service not initialized");
      return;
    }

    this.io.emit(eventName, payload);
    logger.debug("[WebSocket] Broadcasted custom event");
  }

  /**
   * Emit job progress update
   */
  emitJobProgress(
    payload: Omit<JobProgressPayload, "timestamp" | "eventType">,
  ): void {
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
  emitJobStarted(
    payload: Omit<JobStartedPayload, "timestamp" | "eventType">,
  ): void {
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
  emitJobCompleted(
    payload: Omit<JobCompletedPayload, "timestamp" | "eventType">,
  ): void {
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
  emitJobFailed(
    payload: Omit<JobFailedPayload, "timestamp" | "eventType">,
  ): void {
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
      (socket) => socket.authenticated,
    ).length;

    // Get all rooms
    const rooms = Array.from(this.io.sockets.adapter.rooms.keys()).filter(
      (room) => !this.connections.has(room), // Filter out socket IDs
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

    logger.info("[WebSocket] Shutting down service...");

    // Disconnect all clients
    void this.io.disconnectSockets(true);

    // Close server
    await new Promise<void>((resolve) => {
      void this.io?.close(() => {
        logger.info("[WebSocket] Service shut down successfully");
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

function readStringField(source: unknown, key: string): string | null {
  if (typeof source !== "object" || source === null) {
    return null;
  }

  const value = (source as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

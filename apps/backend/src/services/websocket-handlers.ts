import { WEBSOCKET_CONFIG } from "@/config/websocket.config";
import { logger } from "@/lib/logger";
import { breakappService } from "@/modules/breakapp/service";
import { RealtimeEventType } from "@/types/realtime.types";
import { trackWebSocketAuth } from "@/utils/connectivity-telemetry";

import {
  handleAuthentication,
  handleTokenRefresh,
  scheduleSessionExpiry,
} from "./websocket-auth";

import type { AuthenticatedSocket } from "./websocket-types";

/**
 * Handle new client connection
 */
export function handleConnection(socket: AuthenticatedSocket): void {
  // Store connection
  connections.set(socket.id, socket);

  setupConnectionAuthentication(socket);

  socket.on("token:refresh", (data: { token?: string }) => {
    handleTokenRefresh(socket, data);
  });

  // Handle disconnection
  socket.on(WEBSOCKET_CONFIG.EVENTS.DISCONNECT, () => {
    handleDisconnection(socket);
  });

  // Handle errors
  socket.on(WEBSOCKET_CONFIG.EVENTS.ERROR, (error: Error) => {
    logger.error("[WebSocket] Socket error", error);
  });

  // Handle room subscriptions
  socket.on("subscribe", (data: { room: string }) => {
    handleRoomSubscription(socket, data.room);
  });

  socket.on("unsubscribe", (data: { room: string }) => {
    handleRoomUnsubscription(socket, data.room);
  });

  registerBreakappRealtimeHandlers(socket);

  // Send connection confirmation
  socket.emit(RealtimeEventType.CONNECTED, {
    socketId: socket.id,
    message: "Connected successfully",
    timestamp: new Date().toISOString(),
  });
}

function setupConnectionAuthentication(socket: AuthenticatedSocket): void {
  let authTimeout: NodeJS.Timeout | null = null;

  if (socket.authenticated === true && socket.userId) {
    trackWebSocketAuth("ws:auth:middleware_success", {
      socketId: socket.id,
      userId: socket.userId,
      authMethod: "middleware",
    });

    socket.emit(RealtimeEventType.AUTHENTICATED, {
      message: "Authenticated successfully",
      userId: socket.userId,
      timestamp: new Date().toISOString(),
    });

    if (socket.authExpiresAtMs) {
      scheduleSessionExpiry(socket, socket.authExpiresAtMs);
    }
    return;
  }

  authTimeout = setTimeout(() => {
    if (!socket.authenticated) {
      trackWebSocketAuth("ws:auth:timeout", {
        socketId: socket.id,
        reason: "auth_timeout",
      });
      logger.warn("[WebSocket] Authentication timeout");
      socket.emit("auth_error", {
        reason: "auth_timeout",
        message: "Connection timed out. Please reconnect.",
      });
      socket.disconnect(true);
    }
  }, WEBSOCKET_CONFIG.TIMEOUTS.AUTHENTICATION);

  socket.on("authenticate", (data: { token?: string; userId?: string }) => {
    if (authTimeout) {
      clearTimeout(authTimeout);
      authTimeout = null;
    }
    handleAuthentication(socket, data);
  });
}

function registerBreakappRealtimeHandlers(socket: AuthenticatedSocket): void {
  socket.on("runner:register", (data: { runnerId?: string }) => {
    if (!data?.runnerId) {
      return;
    }

    const room = `breakapp-runner:${data.runnerId}`;
    void socket.join(room);
    socket.emit("runner:registered", {
      runnerId: data.runnerId,
      room,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on(
    "runner:location",
    async (data: {
      runnerId?: string;
      lat?: number;
      lng?: number;
      timestamp?: number;
    }) => {
      if (
        !data?.runnerId ||
        typeof data.lat !== "number" ||
        typeof data.lng !== "number"
      ) {
        return;
      }

      await breakappService.updateRunnerLocation({
        runnerId: data.runnerId,
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp ?? Date.now(),
      });
    },
  );

  socket.on(
    "order:status",
    async (data: {
      orderId?: string;
      status?: "pending" | "processing" | "completed" | "cancelled";
    }) => {
      if (!data?.orderId || !data.status) {
        return;
      }

      await breakappService.updateOrderStatus(data.orderId, data.status);
      emitCustom("order:status:update", {
        orderId: data.orderId,
        status: data.status,
        timestamp: new Date().toISOString(),
      });
    },
  );

  socket.on(
    "batch:status",
    (data: {
      batchId?: string;
      vendorId?: string;
      status?: "pending" | "in-progress" | "completed";
    }) => {
      if (!data?.batchId || !data?.vendorId || !data.status) {
        return;
      }

      logger.info("[WebSocket] Batch status update received", {
        batchId: data.batchId,
        vendorId: data.vendorId,
        status: data.status,
      });

      emitCustom("batch:status:update", {
        batchId: data.batchId,
        vendorId: data.vendorId,
        status: data.status,
        timestamp: new Date().toISOString(),
      });
    },
  );
}

/**
 * Handle client disconnection
 */
export function handleDisconnection(socket: AuthenticatedSocket): void {
  logger.info("[WebSocket] Client disconnected");
  connections.delete(socket.id);

  if (socket.userId) {
    socket.emit(RealtimeEventType.DISCONNECTED, {
      message: "Disconnected",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle room subscription
 */
export function handleRoomSubscription(
  socket: AuthenticatedSocket,
  room: string,
): void {
  if (!socket.authenticated) {
    socket.emit(RealtimeEventType.UNAUTHORIZED, {
      message: "Must authenticate before subscribing to rooms",
    });
    return;
  }

  const currentRooms = Array.from(socket.rooms).length;
  if (currentRooms >= WEBSOCKET_CONFIG.LIMITS.MAX_ROOMS_PER_SOCKET) {
    socket.emit(RealtimeEventType.SYSTEM_ERROR, {
      message: "Maximum room limit reached",
    });
    return;
  }

  void socket.join(room);
  logger.info("[WebSocket] Socket joined room");
  socket.emit(RealtimeEventType.SYSTEM_INFO, {
    message: `Subscribed to room: ${room}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Handle room unsubscription
 */
export function handleRoomUnsubscription(
  socket: AuthenticatedSocket,
  room: string,
): void {
  void socket.leave(room);
  logger.info("[WebSocket] Socket left room");
  socket.emit(RealtimeEventType.SYSTEM_INFO, {
    message: `Unsubscribed from room: ${room}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Emit custom event (will be called from service)
 */
export function emitCustom(
  eventName: string,
  payload: Record<string, unknown>,
): void {
  // This will be called from service instance
  logger.info(`[WebSocket] Custom event: ${eventName}`, payload);
}

// Connections storage (will be moved to service instance)
const connections = new Map<string, AuthenticatedSocket>();

/**
 * Get connections (for service instance)
 */
export function getConnections(): Map<string, AuthenticatedSocket> {
  return connections;
}

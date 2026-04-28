import { env } from "@/config/env";
import { logger } from "@/lib/logger";
import {
  createRoomName,
  RealtimeEventType,
  WebSocketRoom,
} from "@/types/realtime.types";
import { trackWebSocketAuth } from "@/utils/connectivity-telemetry";

import { authService } from "./auth.service";

import type { AuthenticatedSocket } from "./websocket-types";

/**
 * Set authentication expiry on socket
 */
export function setAuthExpiry(
  socket: AuthenticatedSocket,
  expSeconds?: number,
): void {
  if (typeof expSeconds === "number") {
    socket.authExpiresAtMs = expSeconds * 1000;
    return;
  }

  delete socket.authExpiresAtMs;
}

/**
 * Handle client authentication
 *
 * JWT tokens are verified through authService. The development-only fallback
 * is restricted to loopback connections and is not reachable in production.
 */
export function handleAuthentication(
  socket: AuthenticatedSocket,
  data: { token?: string; userId?: string },
): void {
  if (data.token) {
    try {
      const verified = authService.verifyToken(data.token);
      socket.userId = verified.userId;
      socket.authenticated = true;
      setAuthExpiry(socket, verified.exp);

      const userRoom = createRoomName(WebSocketRoom.USER, verified.userId);
      void socket.join(userRoom);

      trackWebSocketAuth("ws:auth:event_success", {
        socketId: socket.id,
        userId: verified.userId,
        authMethod: "event",
      });

      if (socket.authExpiresAtMs) {
        scheduleSessionExpiry(socket, socket.authExpiresAtMs);
      }

      socket.emit(RealtimeEventType.AUTHENTICATED, {
        message: "Authenticated successfully",
        userId: verified.userId,
        timestamp: new Date().toISOString(),
      });
      return;
    } catch {
      trackWebSocketAuth("ws:auth:denied", {
        socketId: socket.id,
        reason: "invalid_token",
      });
      socket.emit("auth_error", {
        reason: "invalid_token",
        message: "Authentication failed. Please sign in again.",
      });
      socket.disconnect(true);
      return;
    }
  }

  const remoteAddress =
    socket.handshake.address || socket.conn.remoteAddress || "";
  const isLoopback =
    remoteAddress.includes("127.0.0.1") ||
    remoteAddress.includes("::1") ||
    remoteAddress.includes("localhost");

  if (env.NODE_ENV === "development" && data.userId && isLoopback) {
    socket.userId = data.userId;
    socket.authenticated = true;
    trackWebSocketAuth("ws:auth:dev_fallback", {
      socketId: socket.id,
      userId: data.userId,
      authMethod: "dev-fallback",
      reason: "dev_localhost_fallback",
    });

    // Join user-specific room
    const userRoom = createRoomName(WebSocketRoom.USER, data.userId);
    void socket.join(userRoom);

    logger.warn("[WebSocket] Development fallback auth used");

    socket.emit(RealtimeEventType.AUTHENTICATED, {
      message: "Authenticated successfully",
      userId: data.userId,
      timestamp: new Date().toISOString(),
    });
  } else {
    logger.warn("[WebSocket] Authentication failed");
    trackWebSocketAuth("ws:auth:denied", {
      socketId: socket.id,
      reason: "missing_token",
    });
    socket.emit("auth_error", {
      reason: "missing_token",
      message: "Authentication required.",
    });
    socket.disconnect(true);
  }
}

/**
 * Handle token refresh
 */
export function handleTokenRefresh(
  socket: AuthenticatedSocket,
  data: { token?: string },
): void {
  if (!data?.token) {
    socket.emit("auth_error", {
      reason: "missing_token",
      message: "Authentication required.",
    });
    return;
  }

  try {
    const verified = authService.verifyToken(data.token);
    socket.userId = verified.userId;
    socket.authenticated = true;
    setAuthExpiry(socket, verified.exp);

    if (socket.authExpiresAtMs) {
      scheduleSessionExpiry(socket, socket.authExpiresAtMs);
    }

    socket.emit("token:refreshed", {
      userId: verified.userId,
      message: "Token refreshed successfully",
      timestamp: new Date().toISOString(),
    });
  } catch {
    socket.emit("auth_error", {
      reason: "invalid_token",
      message: "Authentication failed. Please sign in again.",
    });
  }
}

/**
 * Schedule session expiry
 */
export function scheduleSessionExpiry(
  socket: AuthenticatedSocket,
  expiresAtMs: number,
): void {
  const timeoutMs = Math.max(expiresAtMs - Date.now(), 1000);
  clearSessionExpiry(socket.id);

  const timer = setTimeout(() => {
    socket.emit("auth_error", {
      reason: "session_expired",
      message: "Session expired. Please sign in again.",
    });
    socket.disconnect(true);
  }, timeoutMs);

  sessionTimers.set(socket.id, timer);
}

/**
 * Clear session expiry timer
 */
export function clearSessionExpiry(socketId: string): void {
  const timer = sessionTimers.get(socketId);
  if (timer) {
    clearTimeout(timer);
    sessionTimers.delete(socketId);
  }
}

// Session timers storage (will be moved to service instance)
const sessionTimers = new Map<string, NodeJS.Timeout>();

/**
 * Get session timers (for service instance)
 */
export function getSessionTimers(): Map<string, NodeJS.Timeout> {
  return sessionTimers;
}

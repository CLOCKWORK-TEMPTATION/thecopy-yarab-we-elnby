/**
 * WebSocket Client Service
 *
 * Handles real-time communication with backend for analysis progress updates
 */

import { io, Socket } from "socket.io-client";
import { logger } from "@/lib/ai/utils/logger";

// Event types matching backend
export enum RealtimeEventType {
  // Agent events
  AGENT_STARTED = "agent:started",
  AGENT_PROGRESS = "agent:progress",
  AGENT_COMPLETED = "agent:completed",
  AGENT_FAILED = "agent:failed",

  // Job events
  JOB_STARTED = "job:started",
  JOB_PROGRESS = "job:progress",
  JOB_COMPLETED = "job:completed",
  JOB_FAILED = "job:failed",

  // Step events
  STEP_PROGRESS = "step:progress",

  // Connection events
  CONNECTED = "connect",
  DISCONNECTED = "disconnect",
  UNAUTHORIZED = "unauthorized",
  ERROR = "error",
}

export interface AgentProgressPayload {
  agentId: string;
  agentName: string;
  progress: number;
  message: string;
  timestamp: string;
}

export interface JobProgressPayload {
  jobId: string;
  progress: number;
  currentStep?: string;
  message?: string;
}

export interface StepProgressPayload {
  step: string;
  status: "started" | "in_progress" | "completed" | "failed";
  message: string;
}

type EventCallback<T = unknown> = (data: T) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private maxReconnectAttempts = 5;

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket?.connected) {
      logger.warn("[WebSocket] Already connected");
      return;
    }

    const backendUrl = process.env["NEXT_PUBLIC_SOCKET_URL"];
    if (!backendUrl) {
      logger.error("[WebSocket] NEXT_PUBLIC_SOCKET_URL is not configured");
      return;
    }

    this.socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      withCredentials: true, // Needed to send cookies during handshake
    });

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on(RealtimeEventType.CONNECTED, () => {
      logger.info("[WebSocket] Connected");
      this.notifyListeners(RealtimeEventType.CONNECTED, {});
    });

    this.socket.on(RealtimeEventType.DISCONNECTED, (reason: string) => {
      logger.info("[WebSocket] Disconnected", { reason });
      this.notifyListeners(RealtimeEventType.DISCONNECTED, { reason });
    });

    this.socket.on(RealtimeEventType.ERROR, (error: unknown) => {
      logger.error("[WebSocket] Error", { error });
      this.notifyListeners(RealtimeEventType.ERROR, error);
    });

    this.socket.on(RealtimeEventType.UNAUTHORIZED, (data: unknown) => {
      logger.warn("[WebSocket] Unauthorized", { data });
      this.notifyListeners(RealtimeEventType.UNAUTHORIZED, data);
    });
  }

  /**
   * Subscribe to agent progress updates
   */
  onAgentProgress(callback: (data: AgentProgressPayload) => void): () => void {
    return this.on(RealtimeEventType.AGENT_PROGRESS, callback);
  }

  /**
   * Subscribe to job progress updates
   */
  onJobProgress(callback: (data: JobProgressPayload) => void): () => void {
    return this.on(RealtimeEventType.JOB_PROGRESS, callback);
  }

  /**
   * Subscribe to step progress updates
   */
  onStepProgress(callback: (data: StepProgressPayload) => void): () => void {
    return this.on(RealtimeEventType.STEP_PROGRESS, callback);
  }

  /**
   * Subscribe to job completion
   */
  onJobCompleted(callback: EventCallback): () => void {
    return this.on(RealtimeEventType.JOB_COMPLETED, callback);
  }

  /**
   * Subscribe to job failure
   */
  onJobFailed(callback: EventCallback): () => void {
    return this.on(RealtimeEventType.JOB_FAILED, callback);
  }

  /**
   * Generic event subscription
   */
  on<T = unknown>(eventType: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(callback as EventCallback);

    // Setup socket listener if not already set
    if (this.socket && this.socket.listeners(eventType).length === 0) {
      this.socket.on(eventType, (data: unknown) => {
        this.notifyListeners(eventType, data);
      });
    }

    // Return unsubscribe function
    return () => this.off(eventType, callback);
  }

  /**
   * Unsubscribe from event
   */
  off<T = unknown>(eventType: string, callback: EventCallback<T>): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback as EventCallback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
        if (this.socket) {
          this.socket.off(eventType);
        }
      }
    }
  }

  /**
   * Notify all listeners for an event
   */
  private notifyListeners(eventType: string, data: unknown): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`[WebSocket] Error in listener for ${eventType}`, {
            error,
          });
        }
      });
    }
  }

  /**
   * Join a room (e.g., for job-specific updates)
   */
  joinRoom(room: string): void {
    if (!this.socket) return;
    this.socket.emit("join", room);
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    if (!this.socket) return;
    this.socket.emit("leave", room);
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const websocketClient = new WebSocketClient();

// Auto-connect on client-side
if (typeof window !== "undefined") {
  // Connect after a short delay to allow app initialization
  setTimeout(() => {
    websocketClient.connect();
  }, 1000);
}

export default websocketClient;

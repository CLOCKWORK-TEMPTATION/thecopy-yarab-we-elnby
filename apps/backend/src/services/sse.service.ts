/**
 * Server-Sent Events (SSE) Service
 *
 * Real-time streaming service for long-running operations
 */

import { Response } from 'express';
import { logger } from '@/utils/logger';
import {
  RealtimeEvent,
  RealtimeEventType,
  RealtimePayload,
} from '@/types/realtime.types';

/**
 * SSE Client connection info
 */
interface SSEClient {
  id: string;
  response: Response;
  userId: string | undefined;
  subscriptions: Set<string>;
  connectedAt: Date;
  lastEventId: string | undefined;
}

/**
 * SSE Service Manager
 */
class SSEService {
  private clients: Map<string, SSEClient> = new Map();
  private clientsByUserId: Map<string, Set<string>> = new Map();
  private clientsByRoom: Map<string, Set<string>> = new Map();

  /**
   * Initialize SSE connection for a client
   */
  // eslint-disable-next-line max-lines-per-function
  initializeConnection(
    clientId: string,
    response: Response,
    userId?: string,
    lastEventId?: string
  ): void {
    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Enable CORS if needed
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Credentials', 'true');

    // Create client object
    const client: SSEClient = {
      id: clientId,
      response,
      userId,
      subscriptions: new Set(),
      connectedAt: new Date(),
      lastEventId,
    };

    // Store client
    this.clients.set(clientId, client);

    // Store by userId if provided
    if (userId) {
      if (!this.clientsByUserId.has(userId)) {
        this.clientsByUserId.set(userId, new Set());
      }
      this.clientsByUserId.get(userId)!.add(clientId);
    }

    logger.info('[SSE] Client connected');

    // Send initial connection event
    this.sendToClient(clientId, {
      event: RealtimeEventType.CONNECTED,
      payload: {
        timestamp: new Date().toISOString(),
        eventType: RealtimeEventType.CONNECTED,
        message: 'SSE connection established',
      },
    });

    // Keep-alive ping every 30 seconds
    const keepAliveInterval = setInterval(() => {
      if (this.clients.has(clientId)) {
        this.sendComment(clientId, 'keep-alive');
      } else {
        clearInterval(keepAliveInterval);
      }
    }, 30000);

    // Handle client disconnect
    response.on('close', () => {
      clearInterval(keepAliveInterval);
      this.handleDisconnection(clientId);
    });

    // Handle errors
    response.on('error', (error) => {
      logger.error('[SSE] Client stream error', error);
      clearInterval(keepAliveInterval);
      this.handleDisconnection(clientId);
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    logger.info('[SSE] Client disconnected');

    // Remove from user mapping
    if (client.userId) {
      const userClients = this.clientsByUserId.get(client.userId);
      if (userClients) {
        userClients.delete(clientId);
        if (userClients.size === 0) {
          this.clientsByUserId.delete(client.userId);
        }
      }
    }

    // Remove from room mappings
    client.subscriptions.forEach((room) => {
      const roomClients = this.clientsByRoom.get(room);
      if (roomClients) {
        roomClients.delete(clientId);
        if (roomClients.size === 0) {
          this.clientsByRoom.delete(room);
        }
      }
    });

    // Remove client
    this.clients.delete(clientId);
  }

  /**
   * Subscribe client to a room
   */
  subscribeToRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn('[SSE] Cannot subscribe: client not found');
      return;
    }

    client.subscriptions.add(room);

    if (!this.clientsByRoom.has(room)) {
      this.clientsByRoom.set(room, new Set());
    }
    this.clientsByRoom.get(room)!.add(clientId);

    logger.info('[SSE] Client subscribed to room');

    // Send confirmation
    this.sendToClient(clientId, {
      event: RealtimeEventType.SYSTEM_INFO,
      payload: {
        timestamp: new Date().toISOString(),
        eventType: RealtimeEventType.SYSTEM_INFO,
        level: 'info',
        message: `Subscribed to room: ${room}`,
      },
    });
  }

  /**
   * Unsubscribe client from a room
   */
  unsubscribeFromRoom(clientId: string, room: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.subscriptions.delete(room);

    const roomClients = this.clientsByRoom.get(room);
    if (roomClients) {
      roomClients.delete(clientId);
      if (roomClients.size === 0) {
        this.clientsByRoom.delete(room);
      }
    }

    logger.info('[SSE] Client unsubscribed from room');
  }

  /**
   * Send event to specific client
   */
  sendToClient<T extends RealtimePayload>(
    clientId: string,
    event: RealtimeEvent<T>,
    id?: string
  ): boolean {
    const client = this.clients.get(clientId);
    if (!client) {
      logger.warn('[SSE] Cannot send event: client not found');
      return false;
    }

    try {
      const eventData = this.formatSSEMessage(event, id);
      client.response.write(eventData);
      return true;
    } catch (error) {
      logger.error('[SSE] Error sending to client', error);
      this.handleDisconnection(clientId);
      return false;
    }
  }

  /**
   * Send event to all clients in a room
   */
  sendToRoom<T extends RealtimePayload>(
    room: string,
    event: RealtimeEvent<T>,
    id?: string
  ): number {
    const clients = this.clientsByRoom.get(room);
    if (!clients || clients.size === 0) {
      return 0;
    }

    let successCount = 0;
    clients.forEach((clientId) => {
      if (this.sendToClient(clientId, event, id)) {
        successCount++;
      }
    });

    logger.debug(`[SSE] Sent event to ${successCount}/${clients.size} clients in room: ${room}`);
    return successCount;
  }

  /**
   * Send event to all clients of a specific user
   */
  sendToUser<T extends RealtimePayload>(
    userId: string,
    event: RealtimeEvent<T>,
    id?: string
  ): number {
    const clients = this.clientsByUserId.get(userId);
    if (!clients || clients.size === 0) {
      return 0;
    }

    let successCount = 0;
    clients.forEach((clientId) => {
      if (this.sendToClient(clientId, event, id)) {
        successCount++;
      }
    });

    logger.debug(`[SSE] Sent event to ${successCount}/${clients.size} clients for user: ${userId}`);
    return successCount;
  }

  /**
   * Broadcast event to all connected clients
   */
  broadcast<T extends RealtimePayload>(event: RealtimeEvent<T>, id?: string): number {
    let successCount = 0;
    this.clients.forEach((_client, clientId) => {
      if (this.sendToClient(clientId, event, id)) {
        successCount++;
      }
    });

    logger.debug(`[SSE] Broadcasted event to ${successCount}/${this.clients.size} clients`);
    return successCount;
  }

  /**
   * Send comment (for keep-alive)
   */
  private sendComment(clientId: string, comment: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      client.response.write(`: ${comment}\n\n`);
    } catch (error) {
      logger.error(`[SSE] Error sending comment to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
    }
  }

  /**
   * Format message according to SSE protocol
   */
  private formatSSEMessage<T extends RealtimePayload>(
    event: RealtimeEvent<T>,
    id?: string
  ): string {
    let message = '';

    // Add event ID if provided
    if (id) {
      message += `id: ${id}\n`;
    }

    // Add event type
    message += `event: ${event.event}\n`;

    // Add data (JSON stringified)
    const data = JSON.stringify(event.payload);
    message += `data: ${data}\n\n`;

    return message;
  }

  /**
   * Stream data chunks (useful for logs or large responses)
   */
  streamData(clientId: string, data: string, event?: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    try {
      if (event) {
        client.response.write(`event: ${event}\n`);
      }
      client.response.write(`data: ${data}\n\n`);
      return true;
    } catch (error) {
      logger.error(`[SSE] Error streaming data to client ${clientId}:`, error);
      this.handleDisconnection(clientId);
      return false;
    }
  }

  /**
   * Get service statistics
   */
  getStats(): {
    totalClients: number;
    authenticatedClients: number;
    rooms: { name: string; clients: number }[];
    users: { userId: string; clients: number }[];
  } {
    const authenticatedCount = Array.from(this.clients.values()).filter(
      (client) => client.userId
    ).length;

    const rooms = Array.from(this.clientsByRoom.entries()).map(([name, clients]) => ({
      name,
      clients: clients.size,
    }));

    const users = Array.from(this.clientsByUserId.entries()).map(([userId, clients]) => ({
      userId,
      clients: clients.size,
    }));

    return {
      totalClients: this.clients.size,
      authenticatedClients: authenticatedCount,
      rooms,
      users,
    };
  }

  /**
   * Close specific client connection
   */
  closeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.response.end();
      this.handleDisconnection(clientId);
    }
  }

  /**
   * Shutdown SSE service (disconnect all clients)
   */
  shutdown(): void {
    logger.info('[SSE] Shutting down service...');

    this.clients.forEach((client, clientId) => {
      try {
        // Send final event
        this.sendToClient(clientId, {
          event: RealtimeEventType.DISCONNECTED,
          payload: {
            timestamp: new Date().toISOString(),
            eventType: RealtimeEventType.DISCONNECTED,
            message: 'Server shutting down',
          },
        });
        client.response.end();
      } catch (error) {
        logger.error(`[SSE] Error closing client ${clientId}:`, error);
      }
    });

    this.clients.clear();
    this.clientsByUserId.clear();
    this.clientsByRoom.clear();

    logger.info('[SSE] Service shut down successfully');
  }
}

// Export singleton instance
export const sseService = new SSEService();

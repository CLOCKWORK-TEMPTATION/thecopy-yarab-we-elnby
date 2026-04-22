/**
 * WebSocket Configuration
 *
 * Configuration for Socket.IO server
 */

import { ServerOptions } from 'socket.io';
import { env } from './env';

/**
 * Socket.IO Server Options
 */
export const socketIOOptions: Partial<ServerOptions> = {
  // CORS configuration
  cors: {
    origin: env.CORS_ORIGIN || 'http://localhost:5000',
    methods: ['GET', 'POST'],
    credentials: true,
  },

  // Connection settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  connectTimeout: 45000, // 45 seconds

  // Upgrade settings
  transports: ['websocket', 'polling'],
  allowUpgrades: true,

  // Performance settings
  maxHttpBufferSize: 1e6, // 1MB
  perMessageDeflate: true,

  // Security
  serveClient: false,
  allowEIO3: false,
};

/**
 * WebSocket configuration constants
 */
export const WEBSOCKET_CONFIG = {
  // Event names
  EVENTS: {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    ERROR: 'error',
    PING: 'ping',
    PONG: 'pong',
  },

  // Room prefixes
  ROOMS: {
    USER: 'user',
    PROJECT: 'project',
    QUEUE: 'queue',
    GLOBAL: 'global',
  },

  // Namespaces
  NAMESPACES: {
    ROOT: '/',
    JOBS: '/jobs',
    ANALYSIS: '/analysis',
    ADMIN: '/admin',
  },

  // Timeouts
  TIMEOUTS: {
    AUTHENTICATION: 5000, // 5 seconds to authenticate
    HEARTBEAT: 30000, // 30 seconds heartbeat
  },

  // Limits
  LIMITS: {
    MAX_LISTENERS_PER_ROOM: 100,
    MAX_ROOMS_PER_SOCKET: 10,
  },
} as const;

/**
 * Environment-specific configuration
 */
export const getWebSocketConfig = (): Partial<ServerOptions> => {
  const isDevelopment = env.NODE_ENV === 'development';
  const isProduction = env.NODE_ENV === 'production';

  return {
    ...socketIOOptions,
    // Enable debug in development
    ...(isDevelopment && {
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      },
    }),
    // Production optimizations
    ...(isProduction && {
      transports: ['websocket'] as const, // Prefer websocket in production
      perMessageDeflate: {
        threshold: 1024, // Only compress messages larger than 1KB
      },
    }),
  };
};

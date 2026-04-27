import type { Application } from 'express';
import { createServer as createNetServer } from 'net';
import type { Server } from 'http';

import { env } from '@/config/env';
import { isRedisEnabled } from '@/config/redis-gate';
import { closeDatabase, databaseAvailable, initializeDatabase } from '@/db';
import { registerEditorRuntimeRoutes } from '@/editor/runtime';
import { logger } from '@/lib/logger';
import { weaviateStore } from '@/memory';
import { errorHandler } from '@/middleware';
import {
  getAuthenticatedBullBoardRouter,
  setupBullBoard,
} from '@/middleware/bull-board.middleware';
import { sentryErrorHandler } from '@/middleware/sentry.middleware';
import { initializeWorkers, shutdownQueues } from '@/queues';
import { sseService } from '@/services/sse.service';
import { websocketService } from '@/services/websocket.service';
import { checkRedisHealth } from '@/utils/redis-health';

const startPort = Number(process.env.PORT) || env.PORT;
const DEVELOPMENT_PRIMARY_PORT_WAIT_MS =
  env.NODE_ENV === 'development' ? 10_000 : 0;
const PORT_PROBE_INTERVAL_MS = 250;
const OPTIONAL_BOOTSTRAP_TIMEOUT_MS =
  env.NODE_ENV === 'development' ? 15_000 : 30_000;

let runningServer: Server | null = null;

function probePortAvailability(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const probe = createNetServer();

    probe.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }
      reject(error);
    });

    probe.once('listening', () => {
      probe.close((closeError?: Error) => {
        if (closeError) {
          reject(closeError);
          return;
        }
        resolve(true);
      });
    });

    probe.listen(port, '0.0.0.0');
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withBootstrapTimeout<T>(
  promise: Promise<T>,
  label: string
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(
              `${label} timed out after ${OPTIONAL_BOOTSTRAP_TIMEOUT_MS}ms.`
            )
          );
        }, OPTIONAL_BOOTSTRAP_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

async function waitForPortAvailability(
  port: number,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await probePortAvailability(port)) {
      return true;
    }
    await delay(PORT_PROBE_INTERVAL_MS);
  }

  return probePortAvailability(port);
}

async function resolveListeningPort(initialPort: number): Promise<number> {
  let candidatePort = initialPort;

  for (;;) {
    const available = await probePortAvailability(candidatePort);
    if (available) {
      return candidatePort;
    }

    if (
      candidatePort === initialPort &&
      DEVELOPMENT_PRIMARY_PORT_WAIT_MS > 0
    ) {
      logger.warn(
        `Port ${candidatePort} is in use. Waiting for the dev restart window to release it...`
      );
      const becameAvailable = await waitForPortAvailability(
        candidatePort,
        DEVELOPMENT_PRIMARY_PORT_WAIT_MS
      );
      if (becameAvailable) {
        return candidatePort;
      }
    }

    const nextPort = candidatePort + 1;
    logger.warn(`Port ${candidatePort} is in use. Trying ${nextPort}...`);
    candidatePort = nextPort;
  }
}

async function startListening(httpServer: Server, port: number): Promise<void> {
  const listeningPort = await resolveListeningPort(port);

  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      httpServer.off('listening', onListening);
      reject(error);
    };

    const onListening = () => {
      httpServer.off('error', onError);
      resolve();
    };

    httpServer.once('error', onError);
    httpServer.once('listening', onListening);
    httpServer.listen(listeningPort, '0.0.0.0');
  });

  runningServer = httpServer;
  logger.info(`Server running on port ${listeningPort}`, {
    environment: env.NODE_ENV,
    port: listeningPort,
    websocket: 'enabled',
    sse: 'enabled',
  });
}

async function initializeDatabaseForBootstrap(
  startupWarnings: string[]
): Promise<void> {
  try {
    await initializeDatabase();
    if (databaseAvailable) {
      logger.info('Database schema is ready');
      return;
    }

    const message =
      'Database is unavailable. Backend will continue in degraded mode until PostgreSQL becomes reachable.';
    startupWarnings.push(message);
    logger.warn(message);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Database initialization failed.';
    startupWarnings.push(message);
    logger.warn('Database initialization failed; continuing in degraded mode', {
      errorMessage: message,
    });
  }
}

async function initializeQueueServices(
  app: Application,
  startupWarnings: string[]
): Promise<void> {
  if (!isRedisEnabled()) {
    logger.info('Queue workers skipped — Redis is disabled');
    return;
  }

  const redisOk = await checkRedisHealth();
  if (!redisOk) {
    const message =
      'Redis is required but not reachable. Queue workers and Bull Board are disabled until Redis becomes available.';
    startupWarnings.push(message);
    logger.warn(message);
    return;
  }

  logger.info('Redis is reachable');

  try {
    await initializeWorkers();
    logger.info('Background job workers initialized');
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to initialize job workers.';
    startupWarnings.push(message);
    logger.error('Failed to initialize job workers:', error);
  }

  try {
    setupBullBoard();
    const authenticatedBullBoardRouter = getAuthenticatedBullBoardRouter();
    app.use('/admin/queues', authenticatedBullBoardRouter);
    logger.info(
      'Bull Board dashboard available at /admin/queues (authenticated)'
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to setup Bull Board.';
    startupWarnings.push(message);
    logger.error('Failed to setup Bull Board:', error);
  }
}

async function registerRuntimeRoutesForBootstrap(
  app: Application,
  startupWarnings: string[]
): Promise<void> {
  try {
    await withBootstrapTimeout(
      Promise.resolve(registerEditorRuntimeRoutes(app)),
      'Editor runtime route registration'
    );
    logger.info('Editor runtime routes mounted through apps/backend');
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to register editor runtime routes.';
    startupWarnings.push(message);
    logger.error('Failed to register editor runtime routes:', error);
  }
}

async function bootstrapWeaviateForServer(
  startupWarnings: string[]
): Promise<void> {
  try {
    await withBootstrapTimeout(weaviateStore.bootstrap(), 'Weaviate bootstrap');
    logger.info('Weaviate bootstrap evaluated', weaviateStore.getStatus());

    const weaviateStatus = weaviateStore.getStatus();
    if (weaviateStatus.required && weaviateStatus.state !== 'connected') {
      const message =
        'Weaviate is required but not available. Memory routes will stay degraded until connectivity is restored.';
      startupWarnings.push(message);
      logger.warn(message, weaviateStatus);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Weaviate bootstrap failed.';
    startupWarnings.push(message);
    logger.error('Weaviate bootstrap failed:', error);
  }
}

export async function bootstrapServer(
  app: Application,
  httpServer: Server
): Promise<void> {
  try {
    const startupWarnings: string[] = [];

    await initializeDatabaseForBootstrap(startupWarnings);
    await initializeQueueServices(app, startupWarnings);
    await registerRuntimeRoutesForBootstrap(app, startupWarnings);
    await bootstrapWeaviateForServer(startupWarnings);

    // 404 handler
    app.use((_req, res) => {
      res.status(404).json({
        success: false,
        error: 'المسار غير موجود',
      });
    });

    // Sentry error handler (must be before other error handlers)
    app.use(sentryErrorHandler);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    await startListening(httpServer, startPort);

    if (startupWarnings.length > 0) {
      logger.warn('Backend started in degraded mode', {
        issues: startupWarnings,
      });
    }
  } catch (error) {
    logger.error('Failed to bootstrap backend server', {
      ...(error instanceof Error
        ? {
            errorMessage: error.message,
            errorName: error.name,
            errorStack: error.stack,
          }
        : {
            error,
          }),
    });
    process.exit(1);
  }
}

export function isServerEntryProcess(): boolean {
  const serverEntrypointPattern = /(?:^|[\\/])server\.(?:ts|js)$/;
  return process.argv.some((arg) =>
    serverEntrypointPattern.test(String(arg))
  );
}

export async function shutdownGracefully(
  signal: 'SIGTERM' | 'SIGINT'
): Promise<void> {
  logger.info(`${signal} received, shutting down gracefully`);

  // Shutdown real-time services
  try {
    sseService.shutdown();
    await websocketService.shutdown();
    logger.info('Real-time services shut down');
  } catch (error) {
    logger.error('Error shutting down real-time services:', error);
  }

  // Close queues
  try {
    await shutdownQueues();
  } catch (error) {
    logger.error('Error shutting down queues:', error);
  }

  // Disconnect Weaviate
  try {
    await weaviateStore.disconnect();
    logger.info('Weaviate disconnected');
  } catch (error) {
    logger.error('Error disconnecting Weaviate:', error);
  }

  // Close database connections
  await closeDatabase();

  if (runningServer) {
    runningServer.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
}

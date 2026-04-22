/**
 * Deep Health Checks Utilities
 *
 * Provides comprehensive health check functions for:
 * - Database connectivity
 * - Redis connectivity
 * - Disk space availability
 */

import { pool } from '@/db';
import { checkRedisHealth } from './redis-health';
import { logger } from './logger';
import { execSync } from 'child_process';
import * as os from 'os';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  metadata?: Record<string, unknown>;
}

export interface ReadinessCheckResult {
  status: 'ready' | 'not_ready';
  checks: {
    database: HealthCheckResult;
    redis: HealthCheckResult;
    diskSpace: HealthCheckResult;
  };
  timestamp: string;
}

/**
 * Check database connectivity
 */
export async function checkDatabaseHealth(): Promise<HealthCheckResult> {
  try {
    if (!pool) {
      return {
        status: 'unhealthy',
        message: 'Database pool not initialized',
      };
    }

    // Execute a simple query to verify connection
    const startTime = Date.now();
    await pool.query('SELECT 1');
    const responseTime = Date.now() - startTime;

    // Get connection pool stats
    const totalConnections = pool.totalCount;
    const idleConnections = pool.idleCount;
    const activeConnections = totalConnections - idleConnections;

    return {
      status: 'healthy',
      message: 'Database connection successful',
      metadata: {
        responseTime: `${responseTime}ms`,
        totalConnections,
        idleConnections,
        activeConnections,
      },
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Database connection failed',
    };
  }
}

/**
 * Check Redis connectivity
 */
export async function checkRedisConnectivity(): Promise<HealthCheckResult> {
  try {
    const isHealthy = await checkRedisHealth();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      message: isHealthy ? 'Redis connection successful' : 'Redis connection failed',
      metadata: {
        host: process.env['REDIS_HOST'] || 'localhost',
        port: parseInt(process.env['REDIS_PORT'] || '6379'),
      },
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Redis connection failed',
    };
  }
}

interface DiskUsage {
  total: number;
  free: number;
  used: number;
  percentage: number;
}

/**
 * Get disk usage from memory stats (fallback)
 */
function getMemoryBasedDiskUsage(): DiskUsage {
  const freemem = os.freemem();
  const totalmem = os.totalmem();
  return {
    total: totalmem,
    free: freemem,
    used: totalmem - freemem,
    percentage: Math.round(((totalmem - freemem) / totalmem) * 100),
  };
}

/**
 * Get disk usage from df command (Linux/macOS)
 */
function getUnixDiskUsage(): DiskUsage {
  const dfOutput = execSync('df -k / | tail -1').toString();
  const parts = dfOutput.split(/\s+/);

  const total = parseInt(parts[1] || '0') * 1024;
  const used = parseInt(parts[2] || '0') * 1024;
  const available = parseInt(parts[3] || '0') * 1024;
  const percentage = parseInt(parts[4] || '0');

  return { total, free: available, used, percentage };
}

/**
 * Determine health status from free disk percentage
 */
function getDiskHealthStatus(freePercentage: number): { status: 'healthy' | 'degraded' | 'unhealthy'; message: string } {
  if (freePercentage < 5) {
    return { status: 'unhealthy', message: 'Critical: Less than 5% disk space available' };
  }
  if (freePercentage < 10) {
    return { status: 'degraded', message: 'Warning: Less than 10% disk space available' };
  }
  return { status: 'healthy', message: 'Disk space is adequate' };
}

/**
 * Check disk space availability
 * Warns if available space is less than 10%
 */
export async function checkDiskSpace(): Promise<HealthCheckResult> {
  try {
    let diskUsage: DiskUsage;

    if (process.platform === 'linux' || process.platform === 'darwin') {
      try {
        diskUsage = getUnixDiskUsage();
      } catch {
        diskUsage = getMemoryBasedDiskUsage();
      }
    } else {
      diskUsage = getMemoryBasedDiskUsage();
    }

    const freePercentage = 100 - diskUsage.percentage;
    const totalGB = (diskUsage.total / (1024 ** 3)).toFixed(2);
    const freeGB = (diskUsage.free / (1024 ** 3)).toFixed(2);
    const usedGB = (diskUsage.used / (1024 ** 3)).toFixed(2);

    const { status, message } = getDiskHealthStatus(freePercentage);

    return {
      status,
      message,
      metadata: {
        total: `${totalGB} GB`,
        free: `${freeGB} GB`,
        used: `${usedGB} GB`,
        usedPercentage: `${diskUsage.percentage}%`,
        freePercentage: `${freePercentage.toFixed(2)}%`,
      },
    };
  } catch (error) {
    logger.error('Disk space check failed:', error);
    return {
      status: 'unhealthy',
      message: error instanceof Error ? error.message : 'Failed to check disk space',
    };
  }
}

/**
 * Perform comprehensive readiness check
 */
export async function performReadinessCheck(): Promise<ReadinessCheckResult> {
  // Run all checks in parallel
  const [database, redis, diskSpace] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisConnectivity(),
    checkDiskSpace(),
  ]);

  // Determine overall readiness status
  const isReady =
    database["status"] === 'healthy' &&
    (redis["status"] === 'healthy' || redis["status"] === 'degraded') &&
    diskSpace["status"] !== 'unhealthy';

  return {
    status: isReady ? 'ready' : 'not_ready',
    checks: {
      database,
      redis,
      diskSpace,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Security Logging Middleware
 *
 * Comprehensive security event logging and audit trail
 * Tracks:
 * - Failed authentication attempts
 * - Suspicious activity patterns
 * - Security violations
 * - Rate limit violations
 * - CORS violations
 *
 * Uses Redis for distributed IP tracking in production
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';
import { captureMessage } from '@/config/sentry';
import { cacheService } from '@/services/cache.service';

// Security event types
export enum SecurityEventType {
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_SUCCESS = 'AUTH_SUCCESS',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUSPICIOUS_INPUT = 'SUSPICIOUS_INPUT',
  CORS_VIOLATION = 'CORS_VIOLATION',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  PATH_TRAVERSAL_ATTEMPT = 'PATH_TRAVERSAL_ATTEMPT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
}

// IP tracking data structure
interface SuspiciousIPData {
  count: number;
  firstSeen: string;
  lastSeen: string;
  events: SecurityEventType[];
}

// Cache key prefix for suspicious IPs
const SUSPICIOUS_IP_PREFIX = 'security:suspicious_ip';
const IP_TRACKING_TTL = 24 * 60 * 60; // 24 hours in seconds

// In-memory fallback for when Redis is unavailable
const suspiciousIPsFallback = new Map<string, SuspiciousIPData>();

/**
 * Log security event with detailed context
 */
export function logSecurityEvent(
  type: SecurityEventType,
  req: Request,
  details?: Record<string, unknown>
): void {
  const clientIP = req.ip || req.socket?.remoteAddress || 'unknown';
  const userAgent = req.get?.('User-Agent') || 'unknown';

  const securityEvent = {
    type,
    timestamp: new Date().toISOString(),
    ip: clientIP,
    userAgent,
    path: req.path || 'unknown',
    method: req.method || 'unknown',
    userId: (req as unknown as Record<string, unknown>)['user'] ? ((req as unknown as Record<string, unknown>)['user'] as Record<string, unknown>)['id'] : null,
    ...details,
  };

  // Log to Winston logger
  logger.warn('🚨 Security Event', securityEvent);

  // Track suspicious IP and check for ban (async, fire-and-forget)
  void (async () => {
    try {
      await trackSuspiciousIP(clientIP, type);

      // Send to Sentry for critical events
      if (isCriticalEvent(type)) {
        captureMessage(
          `Security Event: ${type}`,
          'warning',
          securityEvent
        );
      }

      // Auto-ban logic for repeated violations
      const shouldBan = await shouldBanIP(clientIP);
      if (shouldBan) {
        logger.error(`🔒 IP ${clientIP} flagged for automatic blocking due to repeated security violations`);
        captureMessage(
          `IP Auto-Ban Triggered: ${clientIP}`,
          'error',
          { ip: clientIP }
        );
      }
    } catch (error) {
      logger.error('Error in security event tracking:', error);
    }
  })();
}

/**
 * Track suspicious IP addresses using Redis (with in-memory fallback)
 */
async function trackSuspiciousIP(ip: string, event: SecurityEventType): Promise<void> {
  const cacheKey = `${SUSPICIOUS_IP_PREFIX}:${ip}`;
  const now = new Date().toISOString();

  try {
    // Try to get existing data from Redis
    const existing = await cacheService.get<SuspiciousIPData>(cacheKey);

    if (existing) {
      // Update existing record
      const updated: SuspiciousIPData = {
        count: existing.count + 1,
        firstSeen: existing.firstSeen,
        lastSeen: now,
        events: [...existing.events.slice(-19), event], // Keep last 20 events
      };
      await cacheService.set(cacheKey, updated, IP_TRACKING_TTL);
    } else {
      // Create new record
      const newData: SuspiciousIPData = {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        events: [event],
      };
      await cacheService.set(cacheKey, newData, IP_TRACKING_TTL);
    }
  } catch (error) {
    // Fallback to in-memory tracking if Redis fails
    logger.warn('Redis tracking failed, using in-memory fallback:', error);

    const existing = suspiciousIPsFallback.get(ip);
    if (existing) {
      existing.count++;
      existing.lastSeen = now;
      existing.events.push(event);
      // Keep only last 20 events
      if (existing.events.length > 20) {
        existing.events = existing.events.slice(-20);
      }
    } else {
      suspiciousIPsFallback.set(ip, {
        count: 1,
        firstSeen: now,
        lastSeen: now,
        events: [event],
      });
    }

    // Clean old entries from fallback
    cleanOldFallbackEntries();
  }
}

/**
 * Clean old suspicious IP entries from fallback map
 */
function cleanOldFallbackEntries(): void {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  for (const [ip, data] of suspiciousIPsFallback.entries()) {
    if (data.lastSeen < oneDayAgo) {
      suspiciousIPsFallback.delete(ip);
    }
  }
}

/**
 * Check if event is critical
 */
function isCriticalEvent(type: SecurityEventType): boolean {
  return [
    SecurityEventType.SQL_INJECTION_ATTEMPT,
    SecurityEventType.XSS_ATTEMPT,
    SecurityEventType.PATH_TRAVERSAL_ATTEMPT,
  ].includes(type);
}

/**
 * Determine if IP should be banned (async for Redis support)
 */
async function shouldBanIP(ip: string): Promise<boolean> {
  const cacheKey = `${SUSPICIOUS_IP_PREFIX}:${ip}`;

  try {
    const data = await cacheService.get<SuspiciousIPData>(cacheKey);
    if (!data) {
      // Check fallback
      const fallbackData = suspiciousIPsFallback.get(ip);
      if (!fallbackData) return false;

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      return fallbackData.count > 10 && fallbackData.firstSeen > oneHourAgo;
    }

    // Ban if more than 10 violations in 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return data.count > 10 && data.firstSeen > oneHourAgo;
  } catch {
    // Fallback to in-memory
    const fallbackData = suspiciousIPsFallback.get(ip);
    if (!fallbackData) return false;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return fallbackData.count > 10 && fallbackData.firstSeen > oneHourAgo;
  }
}

/**
 * Middleware to log all authentication attempts
 */
export function logAuthAttempts(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);

  res.json = function (data: Record<string, unknown>) {
    // Check if this is an auth endpoint response
    if (req.path.includes('/auth/')) {
      if (data['success']) {
        logSecurityEvent(
          SecurityEventType.AUTH_SUCCESS,
          req,
          {
            userId: (data['data'] as Record<string, unknown> | undefined)?.['id'],
            // DO NOT log email - it's PII
            // email is now sanitized by the logger middleware
          }
        );
      } else if (res.statusCode === 401 || res.statusCode === 403) {
        logSecurityEvent(
          SecurityEventType.AUTH_FAILED,
          req,
          {
            // DO NOT log email - it's PII
            // Use userId if available, otherwise track by IP only
            userId: (req as unknown as Record<string, unknown>)['user'] ? ((req as unknown as Record<string, unknown>)['user'] as Record<string, unknown>)['id'] : null,
            reason: data['error'],
          }
        );
      }
    }

    return originalJson(data);
  };

  next();
}

/**
 * Middleware to detect and log rate limit violations
 */
export function logRateLimitViolations(req: Request, res: Response, next: NextFunction) {
  const originalSend = res.send.bind(res);

  res.send = function (data: unknown) {
    if (res.statusCode === 429) {
      logSecurityEvent(
        SecurityEventType.RATE_LIMIT_EXCEEDED,
        req,
        {
          path: req.path,
          limit: res.getHeader('X-RateLimit-Limit'),
          remaining: res.getHeader('X-RateLimit-Remaining'),
        }
      );
    }

    return originalSend(data);
  };

  next();
}

/**
 * Get suspicious IPs report (from fallback - Redis data is distributed)
 */
export function getSuspiciousIPsReport(): Array<{
  ip: string;
  totalViolations: number;
  firstSeen: string;
  lastSeen: string;
  recentEvents: SecurityEventType[];
}> {
  const report: Array<{
    ip: string;
    totalViolations: number;
    firstSeen: string;
    lastSeen: string;
    recentEvents: SecurityEventType[];
  }> = [];

  for (const [ip, data] of suspiciousIPsFallback.entries()) {
    report.push({
      ip,
      totalViolations: data.count,
      firstSeen: data.firstSeen,
      lastSeen: data.lastSeen,
      recentEvents: data.events.slice(-10), // Last 10 events
    });
  }

  return report.sort((a, b) => b.totalViolations - a.totalViolations);
}

/**
 * Clear suspicious IP tracking (for testing)
 */
export function clearSuspiciousIPs(): void {
  suspiciousIPsFallback.clear();
}

/**
 * WAF Core Check Functions
 *
 * Value extraction, regex testing, rule checking,
 * rate limiting, and helper utilities.
 */

import { Request, Response } from "express";

import { logger } from "@/lib/logger";

import {
  getWafConfig,
  rateLimitStore,
  blockedIPs,
  wafEvents,
  MAX_WAF_EVENTS,
} from "./state";

import type { WAFRule, WAFEvent } from "./config";

// ============================================================================
// IP / Path / User-Agent Helpers
// ============================================================================

/**
 * Get client IP address from request
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    if (forwardedValue) {
      const parts = forwardedValue.split(",");
      if (parts[0]) {
        return parts[0].trim();
      }
    }
  }
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function isIPWhitelisted(ip: string): boolean {
  return getWafConfig().whitelist.ips.includes(ip);
}

export function isIPBlacklisted(ip: string): boolean {
  return getWafConfig().blacklist.ips.includes(ip) || blockedIPs.has(ip);
}

export function isPathWhitelisted(path: string): boolean {
  return getWafConfig().whitelist.paths.some(
    (p) => path === p || path.startsWith(p + "/"),
  );
}

export function isUserAgentBlacklisted(userAgent: string): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return getWafConfig().blacklist.userAgents.some((blocked) =>
    ua.includes(blocked.toLowerCase()),
  );
}

function stringifyRequestValue(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    case "object":
      return value === null ? "" : (JSON.stringify(value) ?? "");
    default:
      return "";
  }
}

// ============================================================================
// WAF Event Logging
// ============================================================================

/**
 * Log WAF event
 */
export function logWAFEvent(event: WAFEvent): void {
  const wafConfig = getWafConfig();

  // Store event
  wafEvents.push(event);
  if (wafEvents.length > MAX_WAF_EVENTS) {
    wafEvents.shift();
  }

  // Log based on configured level
  const logData = {
    waf: true,
    eventType: event.eventType,
    ruleId: event.ruleId,
    ruleName: event.ruleName,
    severity: event.severity,
    method: event.method,
    action: event.action,
    ...(wafConfig.logLevel === "verbose" && {
      details: event.details,
    }),
  };

  if (event.severity === "critical" || event.severity === "high") {
    logger.warn("WAF Alert", logData);
  } else {
    logger.info("WAF Event", logData);
  }
}

export function extractValue(req: Request, location: string): string {
  switch (location) {
    case "body":
      return stringifyRequestValue(req.body);
    case "query":
      return stringifyRequestValue(req.query);
    case "headers":
      return JSON.stringify(req.headers);
    case "path":
      return req.path + (req.originalUrl || "");
    case "cookies":
      return JSON.stringify(req.cookies ?? {});
    default:
      return "";
  }
}

// ============================================================================
// Safe Regex Testing
// ============================================================================

const MAX_WAF_CHECK_LENGTH = 10000;

/**
 * Synchronous safe regex test with input length limit
 * SECURITY: Prevents ReDoS by limiting input size and using try-catch
 */
export function safeRegexTestSync(
  pattern: RegExp,
  text: unknown,
  maxLength: number = MAX_WAF_CHECK_LENGTH,
): boolean {
  const normalizedText =
    typeof text === "string"
      ? text
      : text == null
        ? ""
        : typeof text === "number" ||
            typeof text === "boolean" ||
            typeof text === "bigint" ||
            typeof text === "symbol"
          ? String(text)
          : (() => {
              try {
                return JSON.stringify(text) ?? "";
              } catch {
                return "";
              }
            })();

  const samples = [normalizedText];

  if (normalizedText.length > maxLength) {
    logger.warn("WAF: Input too large for regex test, truncating", {
      originalLength: normalizedText.length,
      maxLength,
    });
    samples.splice(
      0,
      samples.length,
      normalizedText.substring(0, maxLength),
      normalizedText.substring(Math.max(0, normalizedText.length - maxLength)),
    );
  }

  try {
    return samples.some((sample) => {
      pattern.lastIndex = 0;
      return pattern.test(sample);
    });
  } catch {
    return false;
  }
}

// ============================================================================
// Rule Checking (extracted helpers to reduce complexity)
// ============================================================================

/**
 * Validate that the rule's pattern is a compiled RegExp.
 */
function validateRulePattern(rule: WAFRule): boolean {
  if (!(rule.pattern instanceof RegExp)) {
    logger.warn("WAF: Invalid pattern type detected", {
      ruleId: rule.id,
      patternType: typeof rule.pattern,
    });
    return false;
  }
  return true;
}

/**
 * Extract a short match value from the pattern against the input.
 */
function extractMatchValue(pattern: RegExp, value: string): string {
  let matchedValue = value.substring(0, 100);
  try {
    const match = pattern.exec(value.substring(0, 1000));
    if (match?.[0]) {
      matchedValue = match[0].substring(0, 100);
    }
    pattern.lastIndex = 0;
  } catch {
    pattern.lastIndex = 0;
  }
  return matchedValue;
}

/**
 * Check request against a rule
 * SECURITY: Uses safe regex testing and limits input length
 */
export function checkRule(
  req: Request,
  rule: WAFRule,
): { matched: boolean; value: string } {
  if (!rule.enabled) {
    return { matched: false, value: "" };
  }

  for (const location of rule.locations) {
    const value = extractValue(req, location);
    if (value) {
      try {
        if (!validateRulePattern(rule)) {
          continue;
        }

        if (safeRegexTestSync(rule.pattern, value)) {
          rule.pattern.lastIndex = 0;
          const matchedValue = extractMatchValue(rule.pattern, value);
          return { matched: true, value: matchedValue };
        }
        rule.pattern.lastIndex = 0;
      } catch (error) {
        logger.warn("WAF: Rule check failed", { ruleId: rule.id, error });
        continue;
      }
    }
  }

  return { matched: false, value: "" };
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * Check rate limiting for IP
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
} {
  const wafConfig = getWafConfig();
  const now = Date.now();
  let record = rateLimitStore.get(ip);

  if (record && record.blocked && record.blockUntil > now) {
    return { allowed: false, remaining: 0 };
  }

  if (!record || record.resetTime < now) {
    record = {
      count: 0,
      resetTime: now + wafConfig.rateLimit.windowMs,
      blocked: false,
      blockUntil: 0,
    };
  }

  record.count++;

  if (record.count > wafConfig.rateLimit.maxRequests) {
    record.blocked = true;
    record.blockUntil = now + wafConfig.rateLimit.blockDurationMs;
    rateLimitStore.set(ip, record);
    return { allowed: false, remaining: 0 };
  }

  rateLimitStore.set(ip, record);
  return {
    allowed: true,
    remaining: wafConfig.rateLimit.maxRequests - record.count,
  };
}

// ============================================================================
// Block Response
// ============================================================================

/**
 * Block response helper
 */
export function sendBlockResponse(
  res: Response,
  statusCode = 403,
  message = "طلب محظور بواسطة جدار الحماية",
): void {
  res.status(statusCode).json({
    success: false,
    error: message,
    code: "WAF_BLOCKED",
  });
}

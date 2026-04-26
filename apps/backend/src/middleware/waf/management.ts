/**
 * WAF Management Functions
 *
 * Configuration updates, IP blocking, event retrieval,
 * stats, rate limit management, alert system.
 */

import { logger } from "@/lib/logger";

import { defaultWAFConfig } from "./config";
import { escapeRegex, isRegexSafe, createSafePattern } from "./regex-safety";
import {
  getWafConfig,
  setWafConfig,
  rateLimitStore,
  blockedIPs,
  wafEvents,
  alertCallbacks,
} from "./state";

import type {
  WAFConfig,
  WAFRule,
  WAFEvent,
  WAFEventType,
  WAFRuleInput,
} from "./config";

// Re-export for barrel
export { createSafePattern };

// ============================================================================
// Configuration Management
// ============================================================================

/**
 * Update WAF configuration
 */
export function updateWAFConfig(config: Partial<WAFConfig>): void {
  const newConfig = { ...config };

  // Validate and hydrate custom rules if present
  if (newConfig.customRules) {
    newConfig.customRules = (
      newConfig.customRules as unknown as WAFRuleInput[]
    ).map((rule: WAFRuleInput) => {
      let pattern: RegExp;
      if (typeof rule.pattern === "string") {
        if (rule.pattern.length > 500) {
          throw new Error(`Pattern too long for rule ${rule.id}`);
        }

        try {
          const patternSource = escapeRegex(rule.pattern);
          const patternFlags = "gi";
          const validFlags = /^[gimuy]*$/;
          if (!validFlags.test(patternFlags)) {
            throw new Error(`Invalid regex flags for rule ${rule.id}`);
          }
          pattern = new RegExp(patternSource, patternFlags);
        } catch {
          throw new Error(`Invalid regex pattern for rule ${rule.id}`);
        }
      } else if (rule.pattern instanceof RegExp) {
        pattern = rule.pattern;
      } else {
        throw new Error(`Invalid pattern type for rule ${rule.id}`);
      }

      if (!isRegexSafe(pattern)) {
        throw new Error(`Unsafe regex pattern detected for rule ${rule.id}`);
      }

      return { ...rule, pattern };
    });
  }

  const wafConfig = getWafConfig();
  setWafConfig({ ...wafConfig, ...newConfig });
  const updated = getWafConfig();
  logger.info("WAF configuration updated", {
    enabled: updated.enabled,
    mode: updated.mode,
    customRulesCount: updated.customRules.length,
  });
}

/**
 * Get current WAF configuration
 */
export function getWAFConfig(): WAFConfig {
  return { ...getWafConfig() };
}

// ============================================================================
// IP Management
// ============================================================================

export function blockIP(ip: string, reason?: string): void {
  blockedIPs.add(ip);
  logger.warn("IP blocked by WAF", { reason });
}

export function unblockIP(ip: string): void {
  blockedIPs.delete(ip);
  logger.info("IP unblocked from WAF");
}

export function getBlockedIPs(): string[] {
  return Array.from(blockedIPs);
}

// ============================================================================
// Custom Rules
// ============================================================================

export function addCustomRule(rule: WAFRule): void {
  if (!(rule.pattern instanceof RegExp)) {
    logger.error("WAF: Pattern must be a RegExp object", {
      ruleId: rule.id,
      patternType: typeof rule.pattern,
    });
    throw new Error("Pattern must be a pre-compiled RegExp object");
  }

  if (!isRegexSafe(rule.pattern)) {
    logger.warn("Rejected unsafe WAF rule pattern", {
      ruleId: rule.id,
      ruleName: rule.name,
      reason: "Pattern may cause ReDoS or contains dangerous constructs",
    });
    throw new Error("Unsafe regex pattern detected - rule rejected");
  }

  if (!rule.id || !rule.name || !rule.pattern) {
    throw new Error("Invalid rule: missing required fields");
  }

  const wafConfig = getWafConfig();
  if (wafConfig.customRules.some((r) => r.id === rule.id)) {
    throw new Error(`Rule with ID ${rule.id} already exists`);
  }

  wafConfig.customRules.push(rule);
  logger.info("Custom WAF rule added", {
    ruleId: rule.id,
    ruleName: rule.name,
  });
}

export function removeCustomRule(ruleId: string): void {
  const wafConfig = getWafConfig();
  wafConfig.customRules = wafConfig.customRules.filter(
    (r) => r.id !== ruleId
  );
  setWafConfig(wafConfig);
  logger.info("Custom WAF rule removed", { ruleId });
}

// ============================================================================
// Events and Stats
// ============================================================================

export function getWAFEvents(limit = 100): WAFEvent[] {
  return wafEvents.slice(-limit);
}

export function getWAFStats(): {
  totalEvents: number;
  blockedRequests: number;
  monitoredRequests: number;
  eventsByType: Record<WAFEventType, number>;
  eventsBySeverity: Record<string, number>;
  topBlockedIPs: { ip: string; count: number }[];
} {
  const eventsByType: Record<string, number> = {};
  const eventsBySeverity: Record<string, number> = {};
  const ipCounts: Record<string, number> = {};
  let blockedRequests = 0;
  let monitoredRequests = 0;

  for (const event of wafEvents) {
    eventsByType[event.eventType] = (eventsByType[event.eventType] ?? 0) + 1;
    eventsBySeverity[event.severity] =
      (eventsBySeverity[event.severity] ?? 0) + 1;

    if (event.action === "blocked") {
      blockedRequests++;
      ipCounts[event.ip] = (ipCounts[event.ip] ?? 0) + 1;
    } else {
      monitoredRequests++;
    }
  }

  const topBlockedIPs = Object.entries(ipCounts)
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    totalEvents: wafEvents.length,
    blockedRequests,
    monitoredRequests,
    eventsByType: eventsByType,
    eventsBySeverity,
    topBlockedIPs,
  };
}

// ============================================================================
// Rate Limit Management
// ============================================================================

export function clearRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
  logger.info("Rate limit cleared for IP");
}

export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  logger.info("All rate limits cleared");
}

export function resetWAFConfig(): void {
  setWafConfig({ ...defaultWAFConfig });
  logger.info("WAF configuration reset to defaults");
}

// ============================================================================
// Alert System
// ============================================================================

export function onWAFAlert(
  callback: (event: WAFEvent) => void
): void {
  alertCallbacks.push(callback);
}

export function triggerAlerts(event: WAFEvent): void {
  if (event.severity === "critical" || event.severity === "high") {
    for (const callback of alertCallbacks) {
      try {
        callback(event);
      } catch (error) {
        logger.error("WAF alert callback error", { error });
      }
    }
  }
}

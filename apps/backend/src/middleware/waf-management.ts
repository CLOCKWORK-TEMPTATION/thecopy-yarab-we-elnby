/**
 * WAF Management Functions
 * Configuration updates, IP blocking, stats, alerts, and custom rule management.
 */

import { logger } from "@/lib/logger";
import type { WAFConfig, WAFRule, WAFEvent, WAFEventType } from "./waf-types";
import { escapeRegex, isRegexSafe } from "./waf-helpers";
import {
  wafState,
  defaultWAFConfig,
  blockedIPs,
  wafEvents,
  rateLimitStore,
  alertCallbacks,
} from "./waf-state";
import type { AlertCallback } from "./waf-state";

interface CustomRuleInput {
  id: string;
  name: string;
  description: string;
  pattern: RegExp | string;
  locations: Array<"body" | "query" | "path" | "headers">;
  action: "block" | "allow" | "log";
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
}

export function updateWAFConfig(config: Partial<WAFConfig>): void {
  const newConfig = { ...config };

  if (newConfig.customRules) {
    newConfig.customRules = (newConfig.customRules as unknown as CustomRuleInput[]).map(
      (rule) => {
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
          throw new Error(
            `Unsafe regex pattern detected for rule ${rule.id}`
          );
        }

        return { ...rule, pattern };
      }
    );
  }

  wafState.config = { ...wafState.config, ...newConfig };
  logger.info("WAF configuration updated", {
    enabled: wafState.config.enabled,
    mode: wafState.config.mode,
    customRulesCount: wafState.config.customRules.length,
  });
}

export function getWAFConfig(): WAFConfig {
  return { ...wafState.config };
}

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

  if (wafState.config.customRules.some((r) => r.id === rule.id)) {
    throw new Error(`Rule with ID ${rule.id} already exists`);
  }

  wafState.config.customRules.push(rule);
  logger.info("Custom WAF rule added", {
    ruleId: rule.id,
    ruleName: rule.name,
  });
}

export function removeCustomRule(ruleId: string): void {
  wafState.config.customRules = wafState.config.customRules.filter(
    (r) => r.id !== ruleId
  );
  logger.info("Custom WAF rule removed", { ruleId });
}

export function getWAFEvents(limit: number = 100): WAFEvent[] {
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
    eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
    eventsBySeverity[event.severity] =
      (eventsBySeverity[event.severity] || 0) + 1;

    if (event.action === "blocked") {
      blockedRequests++;
      ipCounts[event.ip] = (ipCounts[event.ip] || 0) + 1;
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
    eventsByType: eventsByType as Record<WAFEventType, number>,
    eventsBySeverity,
    topBlockedIPs,
  };
}

export function clearRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
  logger.info("Rate limit cleared for IP");
}

export function clearAllRateLimits(): void {
  rateLimitStore.clear();
  logger.info("All rate limits cleared");
}

export function resetWAFConfig(): void {
  wafState.config = { ...defaultWAFConfig };
  logger.info("WAF configuration reset to defaults");
}

export function onWAFAlert(callback: AlertCallback): void {
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

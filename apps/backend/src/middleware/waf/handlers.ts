/**
 * WAF Check Handlers (Strategy Pattern)
 *
 * Contains all check handler implementations, the event factory,
 * rule categories, and the check pipeline.
 */

import { Request, Response } from "express";

import {
  isIPBlacklisted,
  isUserAgentBlacklisted,
  logWAFEvent,
  checkRule,
  checkRateLimit,
} from "./checks";
import {
  SQL_INJECTION_PATTERNS,
  XSS_PATTERNS,
  COMMAND_INJECTION_PATTERNS,
  PATH_TRAVERSAL_PATTERNS,
  PROTOCOL_ATTACK_PATTERNS,
  BOT_DETECTION_PATTERNS,
} from "./rules";
import { getWafConfig } from "./state";

import type { WAFConfig, WAFRule, WAFEvent, WAFEventType } from "./config";

// ============================================================================
// Types
// ============================================================================

export interface RequestContext {
  ip: string;
  userAgent: string;
  path: string;
  method: string;
}

export interface CheckResult {
  blocked: boolean;
  statusCode?: number;
  message?: string;
}

export type CheckHandler = (
  req: Request,
  res: Response,
  ctx: RequestContext
) => CheckResult;

// ============================================================================
// WAF Event Factory
// ============================================================================

interface WAFEventParams {
  eventType: WAFEventType;
  ruleId: string;
  ruleName: string;
  severity: WAFEvent["severity"];
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  matchedValue: string;
  details?: Record<string, unknown>;
}

function createWAFEvent(params: WAFEventParams): WAFEvent {
  const wafConfig = getWafConfig();
  return {
    timestamp: new Date(),
    eventType: params.eventType,
    ruleId: params.ruleId,
    ruleName: params.ruleName,
    severity: params.severity,
    ip: params.ip,
    method: params.method,
    path: params.path,
    userAgent: params.userAgent,
    matchedValue: params.matchedValue,
    action: wafConfig.mode === "block" ? "blocked" : "monitored",
    details: params.details || {},
  };
}

// ============================================================================
// Check Handlers
// ============================================================================

const checkIPBlacklist: CheckHandler = (_req, _res, ctx) => {
  if (!isIPBlacklisted(ctx.ip)) {
    return { blocked: false };
  }

  logWAFEvent(
    createWAFEvent({
      eventType: "IP_BLOCKED",
      ruleId: "IP_BL",
      ruleName: "IP Blacklist",
      severity: "high",
      ...ctx,
      matchedValue: ctx.ip,
    })
  );

  const wafConfig = getWafConfig();
  if (wafConfig.mode === "block") {
    return { blocked: true, statusCode: 403, message: "عنوان IP محظور" };
  }
  return { blocked: false };
};

const checkUserAgentBlacklist: CheckHandler = (_req, _res, ctx) => {
  if (!isUserAgentBlacklisted(ctx.userAgent)) {
    return { blocked: false };
  }

  logWAFEvent(
    createWAFEvent({
      eventType: "BOT_DETECTED",
      ruleId: "UA_BL",
      ruleName: "User-Agent Blacklist",
      severity: "medium",
      ...ctx,
      matchedValue: ctx.userAgent,
    })
  );

  const wafConfig = getWafConfig();
  if (wafConfig.mode === "block") {
    return { blocked: true, statusCode: 403, message: "طلب غير مصرح به" };
  }
  return { blocked: false };
};

const checkRateLimitHandler: CheckHandler = (_req, res, ctx) => {
  const wafConfig = getWafConfig();
  if (!wafConfig.rules.rateLimit) {
    return { blocked: false };
  }

  const rateCheck = checkRateLimit(ctx.ip);
  res.setHeader("X-RateLimit-Remaining", rateCheck.remaining.toString());

  if (rateCheck.allowed) {
    return { blocked: false };
  }

  logWAFEvent(
    createWAFEvent({
      eventType: "RATE_LIMIT_EXCEEDED",
      ruleId: "RL",
      ruleName: "Rate Limit",
      severity: "medium",
      ...ctx,
      matchedValue: `Exceeded ${wafConfig.rateLimit.maxRequests} requests`,
      details: {
        windowMs: wafConfig.rateLimit.windowMs,
        maxRequests: wafConfig.rateLimit.maxRequests,
      },
    })
  );

  if (wafConfig.mode === "block") {
    return {
      blocked: true,
      statusCode: 429,
      message: "تم تجاوز الحد المسموح من الطلبات",
    };
  }
  return { blocked: false };
};

// ============================================================================
// Rule Categories and Pattern Checking
// ============================================================================

interface RuleCategory {
  rules: WAFRule[];
  eventType: WAFEventType;
  configKey: keyof WAFConfig["rules"];
}

export const RULE_CATEGORIES: RuleCategory[] = [
  { rules: SQL_INJECTION_PATTERNS, eventType: "SQL_INJECTION", configKey: "sqlInjection" },
  { rules: XSS_PATTERNS, eventType: "XSS_ATTACK", configKey: "xss" },
  { rules: COMMAND_INJECTION_PATTERNS, eventType: "COMMAND_INJECTION", configKey: "commandInjection" },
  { rules: PATH_TRAVERSAL_PATTERNS, eventType: "PATH_TRAVERSAL", configKey: "pathTraversal" },
  { rules: PROTOCOL_ATTACK_PATTERNS, eventType: "PROTOCOL_ATTACK", configKey: "protocolAttack" },
  { rules: BOT_DETECTION_PATTERNS, eventType: "BOT_DETECTED", configKey: "botProtection" },
];

export function processRuleMatch(
  req: Request,
  rule: WAFRule,
  eventType: WAFEventType,
  ctx: RequestContext
): CheckResult {
  const wafConfig = getWafConfig();
  const result = checkRule(req, rule);
  if (!result.matched) {
    return { blocked: false };
  }

  const action =
    wafConfig.mode === "block" && rule.action === "block"
      ? "blocked"
      : "monitored";

  const event = createWAFEvent({
    eventType,
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    ...ctx,
    matchedValue: result.value,
    details: { description: rule.description },
  });
  event.action = action;

  logWAFEvent(event);

  if (wafConfig.mode === "block" && rule.action === "block") {
    return { blocked: true };
  }
  return { blocked: false };
}

const checkPatternRules: CheckHandler = (req, _res, ctx) => {
  const wafConfig = getWafConfig();
  for (const { rules, eventType, configKey } of RULE_CATEGORIES) {
    if (!wafConfig.rules[configKey]) continue;

    for (const rule of rules) {
      const result = processRuleMatch(req, rule, eventType, ctx);
      if (result.blocked) {
        return result;
      }
    }
  }
  return { blocked: false };
};

const checkCustomRules: CheckHandler = (req, _res, ctx) => {
  const wafConfig = getWafConfig();
  for (const rule of wafConfig.customRules) {
    const result = processRuleMatch(req, rule, "CUSTOM_RULE_MATCH", ctx);
    if (result.blocked) {
      return result;
    }
  }
  return { blocked: false };
};

// ============================================================================
// Pipeline
// ============================================================================

/**
 * Execute a pipeline of check handlers.
 * Stops at the first blocking result.
 */
export function executeCheckPipeline(
  handlers: CheckHandler[],
  req: Request,
  res: Response,
  ctx: RequestContext
): CheckResult | null {
  for (const handler of handlers) {
    const result = handler(req, res, ctx);
    if (result.blocked) {
      return result;
    }
  }
  return null;
}

/**
 * Check handlers pipeline - order matters for security
 * 1. IP blacklist (highest priority)
 * 2. User-Agent blacklist
 * 3. Rate limiting
 * 4. Pattern-based rules
 * 5. Custom rules
 */
export const WAF_CHECK_PIPELINE: CheckHandler[] = [
  checkIPBlacklist,
  checkUserAgentBlacklist,
  checkRateLimitHandler,
  checkPatternRules,
  checkCustomRules,
];

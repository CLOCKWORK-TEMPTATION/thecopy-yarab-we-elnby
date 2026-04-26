/**
 * WAF Configuration Types and Defaults
 */

import { env } from "@/config/env";

// ============================================================================
// WAF Configuration Interfaces
// ============================================================================

export interface WAFConfig {
  enabled: boolean;
  mode: "block" | "monitor"; // Block or just log
  logLevel: "minimal" | "standard" | "verbose";
  rules: {
    sqlInjection: boolean;
    xss: boolean;
    commandInjection: boolean;
    pathTraversal: boolean;
    protocolAttack: boolean;
    botProtection: boolean;
    rateLimit: boolean;
  };
  whitelist: {
    ips: string[];
    paths: string[];
    userAgents: string[];
  };
  blacklist: {
    ips: string[];
    countries: string[];
    userAgents: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    blockDurationMs: number;
  };
  customRules: WAFRule[];
}

export interface WAFRule {
  id: string;
  name: string;
  description: string;
  // SECURITY: Pattern must be a pre-compiled RegExp object, never a string
  // This prevents regex injection attacks
  pattern: RegExp;
  locations: ("body" | "query" | "path" | "headers")[];
  action: "block" | "allow" | "log";
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
}

/**
 * Input interface for rules that may come from JSON (pattern as string).
 * Used in updateWAFConfig to avoid `any`.
 */
export interface WAFRuleInput {
  id: string;
  name: string;
  description: string;
  pattern: string | RegExp;
  locations: ("body" | "query" | "path" | "headers")[];
  action: "block" | "allow" | "log";
  severity: "low" | "medium" | "high" | "critical";
  enabled: boolean;
}

export interface WAFEvent {
  timestamp: Date;
  eventType: WAFEventType;
  ruleId: string;
  ruleName: string;
  severity: "critical" | "high" | "medium" | "low";
  ip: string;
  method: string;
  path: string;
  userAgent: string;
  matchedValue: string;
  action: "blocked" | "monitored" | "challenged";
  details: Record<string, unknown>;
}

export type WAFEventType =
  | "SQL_INJECTION"
  | "XSS_ATTACK"
  | "COMMAND_INJECTION"
  | "PATH_TRAVERSAL"
  | "PROTOCOL_ATTACK"
  | "BOT_DETECTED"
  | "RATE_LIMIT_EXCEEDED"
  | "IP_BLOCKED"
  | "GEO_BLOCKED"
  | "CUSTOM_RULE_MATCH";

// ============================================================================
// Default WAF Configuration
// ============================================================================

export const defaultWAFConfig: WAFConfig = {
  enabled: true,
  mode: env.NODE_ENV === "production" ? "block" : "monitor",
  logLevel: "standard",
  rules: {
    sqlInjection: true,
    xss: true,
    commandInjection: true,
    pathTraversal: true,
    protocolAttack: true,
    botProtection: true,
    rateLimit: true,
  },
  whitelist: {
    ips: ["127.0.0.1", "::1"],
    paths: ["/health", "/health/live", "/health/ready", "/metrics"],
    userAgents: [],
  },
  blacklist: {
    ips: [],
    countries: [],
    userAgents: [
      "sqlmap",
      "nikto",
      "nmap",
      "masscan",
      "zgrab",
      "python-requests/2", // Often used for automated attacks
    ],
  },
  rateLimit: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    blockDurationMs: 5 * 60 * 1000, // 5 minutes block
  },
  customRules: [],
};

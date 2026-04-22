/**
 * WAF Type Definitions
 * Extracted from waf.middleware.ts to reduce file size (max-lines lint rule)
 */

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
  locations: Array<"body" | "query" | "path" | "headers">;
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

export interface WAFEventParams {
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

export interface RuleCategory {
  rules: WAFRule[];
  eventType: WAFEventType;
  configKey: keyof WAFConfig["rules"];
}

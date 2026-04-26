/**
 * WAF Shared State
 * Holds all mutable state and default configuration for the WAF system.
 */

import { env } from "@/config/env";

import type { WAFConfig, WAFEvent } from "./waf-types";

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
      "python-requests/2",
    ],
  },
  rateLimit: {
    windowMs: 60 * 1000,
    maxRequests: 100,
    blockDurationMs: 5 * 60 * 1000,
  },
  customRules: [],
};

export const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number; blocked: boolean; blockUntil: number }
>();

export const blockedIPs = new Set<string>();

export const wafEvents: WAFEvent[] = [];
export const MAX_WAF_EVENTS = 10000;

export const wafState = {
  config: { ...defaultWAFConfig },
};

export type AlertCallback = (event: WAFEvent) => void;
export const alertCallbacks: AlertCallback[] = [];

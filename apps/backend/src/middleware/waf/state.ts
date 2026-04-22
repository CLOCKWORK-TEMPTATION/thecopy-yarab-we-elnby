/**
 * WAF Shared Mutable State
 *
 * Centralizes all mutable state used across WAF modules.
 */

import type { WAFConfig, WAFEvent } from "./config";
import { defaultWAFConfig } from "./config";

// ============================================================================
// State stores
// ============================================================================

// Rate limiting store
export const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number; blocked: boolean; blockUntil: number }
>();

// Blocked IPs store (runtime)
export const blockedIPs = new Set<string>();

// WAF events store (in-memory, would typically be sent to SIEM)
export const wafEvents: WAFEvent[] = [];
export const MAX_WAF_EVENTS = 10000;

// Current WAF configuration (mutable singleton)
let wafConfig: WAFConfig = { ...defaultWAFConfig };

export function getWafConfig(): WAFConfig {
  return wafConfig;
}

export function setWafConfig(config: WAFConfig): void {
  wafConfig = config;
}

// Alert system
export type AlertCallback = (event: WAFEvent) => void;
export const alertCallbacks: AlertCallback[] = [];

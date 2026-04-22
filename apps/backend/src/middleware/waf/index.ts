/**
 * WAF Module Barrel - re-exports all public API
 */

// Types and interfaces
export type {
  WAFConfig,
  WAFRule,
  WAFRuleInput,
  WAFEvent,
  WAFEventType,
} from "./config";

// Rule patterns
export { WAF_PATTERNS } from "./rules";

// Main middleware
export { wafMiddleware } from "./middleware";

// Management functions
export {
  updateWAFConfig,
  getWAFConfig,
  blockIP,
  unblockIP,
  getBlockedIPs,
  createSafePattern,
  addCustomRule,
  removeCustomRule,
  getWAFEvents,
  getWAFStats,
  clearRateLimit,
  clearAllRateLimits,
  resetWAFConfig,
  onWAFAlert,
  triggerAlerts,
} from "./management";

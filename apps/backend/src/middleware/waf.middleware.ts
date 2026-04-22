/**
 * Web Application Firewall (WAF) Middleware - Barrel Re-export
 *
 * This file re-exports everything from the ./waf/ module so that
 * existing imports from './waf.middleware' and '@/middleware/waf.middleware'
 * continue to work unchanged.
 */

export {
  // Types
  type WAFConfig,
  type WAFRule,
  type WAFRuleInput,
  type WAFEvent,
  type WAFEventType,
  // Rule patterns
  WAF_PATTERNS,
  // Main middleware
  wafMiddleware,
  // Management functions
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
} from "./waf/index";

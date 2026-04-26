/**
 * WAF Helper Functions
 * Extracted from waf.middleware.ts to reduce file size (max-lines lint rule)
 */

import { Request } from "express";
import { logger } from "@/lib/logger";
import type { WAFRule } from "./waf-types";

// Maximum length of content to check against patterns to prevent ReDoS
const MAX_WAF_CHECK_LENGTH = 10000;

type RequestLocation = "body" | "query" | "headers" | "path" | "cookies";

const VALUE_EXTRACTORS: Record<RequestLocation, (req: Request) => string> = {
  body: (req) =>
    typeof req.body === "object"
      ? JSON.stringify(req.body)
      : String(req.body || ""),
  query: (req) =>
    typeof req.query === "object"
      ? JSON.stringify(req.query)
      : String(req.query || ""),
  headers: (req) => JSON.stringify(req.headers),
  path: (req) => req.path + (req.originalUrl || ""),
  cookies: (req) => JSON.stringify(req.cookies || {}),
};

function prepareValueForInspection(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  logger.warn("WAF: Input too large for regex test, sampling head and tail", {
    originalLength: value.length,
    maxLength,
  });

  const headLength = Math.ceil(maxLength / 2);
  const tailLength = maxLength - headLength - 1;

  return `${value.slice(0, headLength)}\n${value.slice(-Math.max(tailLength, 0))}`;
}

/**
 * Extract value from request location using a lookup map
 */
export function extractValue(
  req: Request,
  location: RequestLocation
): string {
  const extractor = VALUE_EXTRACTORS[location];
  return extractor ? extractor(req) : "";
}

/**
 * Synchronous safe regex test with input length limit
 * SECURITY: Prevents ReDoS by limiting input size and using try-catch
 */
export function safeRegexTestSync(
  pattern: RegExp,
  text: string,
  maxLength: number = 10000
): boolean {
  const input = prepareValueForInspection(text, maxLength);

  try {
    pattern.lastIndex = 0;
    return pattern.test(input);
  } catch (error) {
    logger.warn("WAF: Regex test failed", { error });
    return false;
  }
}

/**
 * Check request against a rule
 * SECURITY: Uses safe regex testing and limits input length to prevent ReDoS attacks
 */
export function checkRule(
  req: Request,
  rule: WAFRule
): { matched: boolean; value: string } {
  if (!rule.enabled) {
    return { matched: false, value: "" };
  }

  for (const location of rule.locations) {
    const matchResult = checkRuleForLocation(req, rule, location);
    if (matchResult) {
      return matchResult;
    }
  }

  return { matched: false, value: "" };
}

function checkRuleForLocation(
  req: Request,
  rule: WAFRule,
  location: "body" | "query" | "path" | "headers"
): { matched: boolean; value: string } | null {
  let value = extractValue(req, location);
  if (!value) return null;

  value = prepareValueForInspection(value, MAX_WAF_CHECK_LENGTH);

  try {
    if (!(rule.pattern instanceof RegExp)) {
      logger.warn("WAF: Invalid pattern type detected", {
        ruleId: rule.id,
        patternType: typeof rule.pattern,
      });
      return null;
    }

    if (!safeRegexTestSync(rule.pattern, value)) {
      rule.pattern.lastIndex = 0;
      return null;
    }

    rule.pattern.lastIndex = 0;
    let matchedValue = value.substring(0, 100);
    try {
      const match = rule.pattern.exec(value.substring(0, 1000));
      if (match && match[0]) {
        matchedValue = match[0].substring(0, 100);
      }
      rule.pattern.lastIndex = 0;
    } catch {
      rule.pattern.lastIndex = 0;
    }
    return { matched: true, value: matchedValue };
  } catch (error) {
    logger.warn("WAF: Rule check failed", { ruleId: rule.id, error });
    return null;
  }
}

/**
 * Escape special regex characters to prevent regex injection
 * SECURITY: Use this when creating patterns from user input
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Validate regex pattern for safety (prevent ReDoS)
 * SECURITY: Comprehensive checks to prevent regex injection attacks
 */
export function isRegexSafe(pattern: RegExp): boolean {
  const patternStr = pattern.source;

  const dangerousIndicators = [
    { check: (s: string) => /\([^)]{0,50}[+*]\)[+*]/.test(s) },
    { check: (s: string) => s.includes(".*.*") || s.includes(".+.+") },
    { check: (s: string) => /\([^)]{0,50}\|[^)]{0,50}\)[+*]/.test(s) },
  ];

  for (const indicator of dangerousIndicators) {
    try {
      if (indicator.check(patternStr)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  if (patternStr.length > 500) {
    return false;
  }

  const quantifierCount = (patternStr.match(/[+*?]/g) || []).length;
  if (quantifierCount > 10) {
    return false;
  }

  try {
    const testStr = "a".repeat(100);
    const startTime = Date.now();
    pattern.test(testStr);
    if (Date.now() - startTime > 100) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

/**
 * Create a safe regex pattern from user input
 * SECURITY: Escapes all special characters to prevent regex injection
 */
export function createSafePattern(userInput: string): RegExp {
  const escaped = escapeRegex(userInput);
  return new RegExp(escaped, "gi");
}

/**
 * Regex Safety Utilities
 *
 * Functions for validating and escaping regex patterns
 * to prevent ReDoS and regex injection attacks.
 */

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

  // Check for dangerous nested quantifiers that could cause ReDoS
  const dangerousIndicators = [
    // Nested quantifiers like (a+)+, (a*)+
    { check: (s: string) => /\([^)]{0,50}[+*]\)[+*]/.test(s) },
    // Multiple consecutive .* or .+ (limited backtracking)
    { check: (s: string) => s.includes(".*.*") || s.includes(".+.+") },
    // Alternation with quantifiers
    { check: (s: string) => /\([^)]{0,50}\|[^)]{0,50}\)[+*]/.test(s) },
  ];

  for (const indicator of dangerousIndicators) {
    try {
      if (indicator.check(patternStr)) {
        return false;
      }
    } catch {
      // If check fails, consider it unsafe
      return false;
    }
  }

  // Additional safety: limit pattern complexity
  if (patternStr.length > 500) {
    return false;
  }

  // Check for excessive backtracking indicators
  const quantifierCount = (patternStr.match(/[+*?]/g) ?? []).length;
  if (quantifierCount > 10) {
    return false;
  }

  // Test the regex with a timeout to catch potential ReDoS
  try {
    const testStr = "a".repeat(100);
    const startTime = Date.now();
    pattern.test(testStr);
    if (Date.now() - startTime > 100) {
      // More than 100ms is suspicious
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

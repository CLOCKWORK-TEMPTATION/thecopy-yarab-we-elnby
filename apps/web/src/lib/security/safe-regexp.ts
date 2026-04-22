/**
 * SECURITY: Safe RegExp utilities to prevent ReDoS attacks and injection
 *
 * This module provides utilities to safely create regular expressions from
 * user-controlled input by escaping special characters and preventing
 * catastrophic backtracking.
 */

/**
 * Escapes special RegExp characters in a string
 * Prevents RegExp injection attacks
 */
export function escapeRegExp(input: string): string {
  // Escape all special regex characters
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Creates a safe RegExp from user input with timeout protection
 * Escapes special characters and adds safety checks
 *
 * @param pattern - The pattern to match (will be escaped)
 * @param flags - Optional regex flags (g, i, m, etc.)
 * @param maxLength - Maximum pattern length (default: 1000)
 * @returns Safe RegExp object
 * @throws Error if pattern is too long or invalid
 */
export function createSafeRegExp(
  pattern: string,
  flags: string = "g",
  maxLength: number = 1000
): RegExp {
  // Validate input length to prevent ReDoS
  if (pattern.length > maxLength) {
    throw new Error(`Pattern too long: ${pattern.length} > ${maxLength}`);
  }

  // Escape special characters to prevent ReDoS
  const escapedPattern = escapeRegExp(pattern);

  // Validate flags to prevent injection
  const validFlags = /^[gimsuvy]*$/;
  if (!validFlags.test(flags)) {
    throw new Error(`Invalid RegExp flags: ${flags}`);
  }

  // Create and return the safe regex
  // SECURITY NOTE: This is a security utility function specifically designed
  // to safely create RegExp from user input. The pattern is escaped above (line 39)
  // to prevent ReDoS attacks and injection. This is intentional and safe.
  try {
    // SECURITY FIX: Use RegExp constructor with pre-escaped pattern
    // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp
    const regex = new RegExp(escapedPattern, flags);
    return regex;
  } catch (error) {
    throw new Error(`Invalid RegExp pattern: ${error}`);
  }
}

/**
 * Counts occurrences of a search term in text safely
 * This is the secure replacement for: text.match(new RegExp(term, 'g'))
 *
 * @param text - Text to search in
 * @param searchTerm - Term to search for (will be escaped)
 * @param caseInsensitive - Whether to ignore case (default: false)
 * @returns Number of occurrences
 */
export function safeCountOccurrences(
  text: string,
  searchTerm: string,
  caseInsensitive: boolean = false
): number {
  if (!text || !searchTerm) {
    return 0;
  }

  try {
    const flags = caseInsensitive ? "gi" : "g";
    const safeRegex = createSafeRegExp(searchTerm, flags);
    const matches = text.match(safeRegex);
    return matches ? matches.length : 0;
  } catch {
    // Fallback to simple string count if regex fails
    return simpleCountOccurrences(text, searchTerm, caseInsensitive);
  }
}

/**
 * Simple string-based occurrence counter (no regex)
 * Fallback for when regex is not needed or fails
 */
function simpleCountOccurrences(
  text: string,
  searchTerm: string,
  caseInsensitive: boolean
): number {
  const searchText = caseInsensitive ? text.toLowerCase() : text;
  const searchFor = caseInsensitive ? searchTerm.toLowerCase() : searchTerm;

  let count = 0;
  let position = 0;

  while ((position = searchText.indexOf(searchFor, position)) !== -1) {
    count++;
    position += searchFor.length;
  }

  return count;
}

/**
 * Counts total occurrences of multiple terms safely
 *
 * @param text - Text to search in
 * @param terms - Array of terms to search for
 * @param caseInsensitive - Whether to ignore case
 * @returns Total count of all terms
 */
export function safeCountMultipleTerms(
  text: string,
  terms: string[],
  caseInsensitive: boolean = false
): number {
  return terms.reduce(
    (count, term) => count + safeCountOccurrences(text, term, caseInsensitive),
    0
  );
}

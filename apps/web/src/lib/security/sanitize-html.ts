/**
 * SECURITY: HTML Sanitization utilities
 *
 * This module provides utilities to safely handle HTML content without
 * using dangerouslySetInnerHTML, preventing XSS attacks.
 */

/**
 * Allowed CSS properties for inline styles
 * Whitelist approach for security
 */
const ALLOWED_CSS_PROPERTIES = [
  "color",
  "background-color",
  "font-size",
  "font-weight",
  "text-align",
  "padding",
  "margin",
  "border",
  "display",
  "width",
  "height",
] as const;

/**
 * Sanitizes CSS property name
 * Only allows whitelisted CSS properties
 */
function isSafeCSSProperty(property: string): boolean {
  return ALLOWED_CSS_PROPERTIES.includes(
    property as (typeof ALLOWED_CSS_PROPERTIES)[number]
  );
}

/**
 * Sanitizes CSS value to prevent CSS injection
 * Removes dangerous patterns like url(), import, etc.
 */
function sanitizeCSSValue(value: string): string {
  // Remove potentially dangerous CSS functions
  const dangerous = /url\(|import|expression|behavior|@import|javascript:/gi;

  if (dangerous.test(value)) {
    return "";
  }

  return value.trim();
}

/**
 * Creates safe inline styles object from CSS string
 * Replaces dangerouslySetInnerHTML for style injection
 *
 * @param cssString - CSS string to parse
 * @returns Safe React style object
 */
export function createSafeStyleObject(cssString: string): React.CSSProperties {
  const styleObject: Record<string, string> = {};

  // Split by semicolon and process each property
  const declarations = cssString.split(";");

  for (const declaration of declarations) {
    const [property, value] = declaration.split(":").map((s) => s.trim());

    if (!property || !value) continue;

    // Convert kebab-case to camelCase for React
    const camelProperty = property.replace(
      /-([a-z])/g,
      (g) => g[1]?.toUpperCase() ?? g
    );

    // Only allow safe properties
    if (isSafeCSSProperty(property)) {
      const safeValue = sanitizeCSSValue(value);
      if (safeValue) {
        styleObject[camelProperty] = safeValue;
      }
    }
  }

  return styleObject as React.CSSProperties;
}

/**
 * Sanitizes text content by escaping HTML entities
 * Prevents XSS when displaying user content
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return text.replace(/[&<>"'/]/g, (char) => map[char] ?? char);
}

/**
 * Strips all HTML tags from a string
 * Safe alternative when you need plain text only
 * SECURITY: Uses iterative approach to handle nested/malformed tags
 * SECURITY: Escapes remaining angle brackets in a single pass to avoid
 *           incomplete multi-character sanitization issues.
 */
export function stripHtmlTags(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  let result = html;
  let previousResult = "";

  // Iteratively remove complete tags until no changes occur.
  // This handles nested attacks like <scr<script>ipt> by continuing until stable.
  const maxIterations = 100; // Prevent infinite loops
  let iterations = 0;

  while (result !== previousResult && iterations < maxIterations) {
    previousResult = result;
    // Remove complete tags - keep iterating until stable
    result = result.replace(/<[^>]*>/g, "");
    iterations++;
  }

  // After tag removal is complete, escape any remaining < or > characters
  // in a single operation so that no literal angle brackets remain.
  return result.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Creates a safe CSS rule string for <style> tags
 * Used to replace dangerouslySetInnerHTML in ChartStyle component
 *
 * @param selector - CSS selector (must be validated)
 * @param properties - CSS properties object
 * @returns Safe CSS rule string
 */
export function createSafeCSSRule(
  selector: string,
  properties: Record<string, string>
): string {
  // Validate selector doesn't contain dangerous content
  if (/<|>|javascript:|expression\(/.test(selector)) {
    throw new Error("Invalid CSS selector");
  }

  const safeProps = Object.entries(properties)
    .filter(([prop]) => isSafeCSSProperty(prop))
    .map(([prop, value]) => `  ${prop}: ${sanitizeCSSValue(value)};`)
    .join("\n");

  return `${selector} {\n${safeProps}\n}`;
}

/**
 * Validates and sanitizes a data-attribute value
 * Prevents attribute injection attacks
 */
export function sanitizeDataAttribute(value: string): string {
  // Remove any characters that could break out of the attribute
  return value.replace(/[<>"'`]/g, "");
}

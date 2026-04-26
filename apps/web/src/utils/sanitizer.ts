/**
 * Content sanitization utilities for security
 */

import DOMPurify from "dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["p", "div", "span", "br", "strong", "em", "u"],
    ALLOWED_ATTR: ["class", "style", "dir"],
    KEEP_CONTENT: true,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * Sanitize text content for contenteditable elements
 */
export function sanitizeContentEditable(content: string): string {
  // Remove potentially dangerous elements while preserving Arabic text
  const cleaned = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["div", "p", "br", "span"],
    ALLOWED_ATTR: ["class", "style", "dir"],
    FORBID_TAGS: ["script", "object", "embed", "link", "style", "meta"],
    FORBID_ATTR: ["onclick", "onload", "onerror", "onmouseover"],
  });

  return cleaned;
}

/**
 * Validate and sanitize user input
 */
export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  // Remove null bytes and control characters except newlines and tabs
  const lowControlCharactersRange = `${String.fromCharCode(0)}-${String.fromCharCode(8)}`;
  const highControlCharactersRange = `${String.fromCharCode(14)}-${String.fromCharCode(31)}`;
  const unsafeControlCharacters = new RegExp(
    `[${lowControlCharactersRange}${String.fromCharCode(11)}${String.fromCharCode(12)}${highControlCharactersRange}${String.fromCharCode(127)}]`,
    "g"
  );
  let cleaned = input.replace(unsafeControlCharacters, "");

  // Limit length to prevent DoS
  if (cleaned.length > 100000) {
    cleaned = cleaned.substring(0, 100000);
  }

  return cleaned.trim();
}

/**
 * Sanitize filename for safe file operations
 */
export function sanitizeFilename(filename: string): string {
  if (!filename) return "untitled";

  const controlCharactersRange = `${String.fromCharCode(0)}-${String.fromCharCode(31)}`;
  const unsafeFilenameCharacters = new RegExp(
    `[<>:"/\\\\|?*${controlCharactersRange}]`,
    "g"
  );

  // Remove dangerous characters
  return (
    filename
      .replace(unsafeFilenameCharacters, "")
      .replace(/^\.+/, "")
      .substring(0, 255)
      .trim() || "untitled"
  );
}

/**
 * Content Security Policy configuration
 */
export const CSP_CONFIG = {
  "default-src": "'self'",
  "script-src": "'self'",
  "style-src": "'self' fonts.googleapis.com",
  "font-src": "'self' fonts.gstatic.com",
  "img-src": "'self' data: blob:",
  "connect-src": "'self' generativelanguage.googleapis.com",
  "frame-src": "'none'",
  "object-src": "'none'",
  "base-uri": "'self'",
  "form-action": "'self'",
};

/**
 * Generate CSP header string
 */
export function generateCSPHeader(): string {
  return Object.entries(CSP_CONFIG)
    .map(([directive, value]) => `${directive} ${value}`)
    .join("; ");
}

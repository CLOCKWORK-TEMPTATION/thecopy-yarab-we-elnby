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
  let cleaned = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

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

  // Remove dangerous characters
  return (
    filename
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
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

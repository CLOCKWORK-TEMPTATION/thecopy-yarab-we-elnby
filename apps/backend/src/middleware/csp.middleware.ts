/**
 * Content Security Policy Middleware
 * حماية من XSS والهجمات الأخرى
 */

import { randomBytes } from "crypto";

import { logger } from "@/lib/logger";

import type { Request, Response, NextFunction } from "express";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/**
 * CSP Configuration
 */
const CSP_DIRECTIVES = {
  // Default: only same origin
  "default-src": ["'self'"],

  // Scripts: self + nonces (no inline scripts allowed)
  "script-src": ["'self'", "'nonce-{NONCE}'"],

  // Styles: self + nonces
  "style-src": ["'self'", "'nonce-{NONCE}'", "'unsafe-inline'"], // unsafe-inline for Tailwind

  // Images: self + data URIs + external CDNs
  "img-src": ["'self'", "data:", "https:"],

  // Fonts: self
  "font-src": ["'self'", "data:"],

  // Connections: self + API endpoints
  "connect-src": [
    "'self'",
    "https://api.openai.com",
    "https://api.anthropic.com",
    "https://generativelanguage.googleapis.com",
  ],

  // Frames: none (prevent clickjacking)
  "frame-ancestors": ["'none'"],

  // Forms: only to self
  "form-action": ["'self'"],

  // Base URI: self only
  "base-uri": ["'self'"],

  // Object: none (no Flash, Java, etc.)
  "object-src": ["'none'"],

  // Media: self
  "media-src": ["'self'"],

  // Upgrade insecure requests
  "upgrade-insecure-requests": [],
};

/**
 * توليد nonce عشوائي
 */
function generateNonce(): string {
  return randomBytes(16)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * بناء CSP header string
 */
function buildCSPHeader(nonce: string): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      const sourcesStr = sources
        .map((s) => s.replace("{NONCE}", nonce))
        .join(" ");
      return `${directive} ${sourcesStr}`;
    })
    .join("; ");
}

/**
 * CSP Middleware
 */
export function cspMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // توليد nonce لكل طلب
  const nonce = generateNonce();

  // إضافة nonce إلى res.locals للوصول إليه في templates
  res.locals["cspNonce"] = nonce;

  // بناء CSP header
  const cspHeader = buildCSPHeader(nonce);

  // تطبيق CSP
  res.setHeader("Content-Security-Policy", cspHeader);

  // CSP Report-Only (للاختبار)
  // res.setHeader('Content-Security-Policy-Report-Only', cspHeader);

  next();
}

/**
 * Additional Security Headers
 */
export function securityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  // Prevent MIME sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=()",
  );

  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }

  next();
}

/**
 * CSP Violation Reporter
 */
export function cspViolationReporter(req: Request, res: Response) {
  const body: unknown = req.body;
  const report = isRecord(body) ? body["csp-report"] : undefined;

  if (isRecord(report)) {
    logger.warn("CSP Violation:", {
      documentUri: asOptionalString(report["document-uri"]),
      violatedDirective: asOptionalString(report["violated-directive"]),
      blockedUri: asOptionalString(report["blocked-uri"]),
      disposition: asOptionalString(report["disposition"]),
    });

    // في الإنتاج: يمكن إرسال التقارير إلى خدمة monitoring
  }

  res.status(204).end();
}

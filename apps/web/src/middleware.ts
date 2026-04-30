/**

 * @fileoverview Next.js Middleware — يضيف رؤوس الحماية الأساسية (CSP، HSTS،

 * X-Frame-Options، X-Content-Type-Options، Referrer-Policy، إلخ).

 *

 * ملاحظة: في Next.js 16، `proxy.ts` هو الاسم الرسمي لطبقة الإدخال هذه،

 * بديلًا عن `middleware.ts` القديم. يعمل Proxy كحدود شبكة أمام التطبيق.

 */

import { NextRequest, NextResponse } from "next/server";

interface ContentSecurityPolicyOptions {
  isDevelopment: boolean;

  allowedDevOrigin?: string;

  sentryOrigin?: string;

  cdnOrigin?: string;

  connectOrigins?: string[];
}

function getOriginFromUrl(url: string | undefined): string {
  if (!url) {
    return "";
  }

  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

export function buildContentSecurityPolicy({
  isDevelopment,

  allowedDevOrigin,

  sentryOrigin,

  cdnOrigin,

  connectOrigins = [],
}: ContentSecurityPolicyOptions): string | null {
  if (isDevelopment) {
    return null;
  }

  const connectSrcParts = Array.from(
    new Set(
      [
        "'self'",

        "https://apis.google.com",

        "https://*.googleapis.com",

        "https://identitytoolkit.googleapis.com",

        "https://securetoken.googleapis.com",

        "https://www.googleapis.com",

        ...connectOrigins,

        sentryOrigin,

        cdnOrigin,
      ].filter(Boolean)
    )
  );

  const frameAncestors = allowedDevOrigin
    ? `frame-ancestors 'self' ${allowedDevOrigin}`
    : "frame-ancestors 'none'";

  return [
    "default-src 'self'",

    [
      "script-src",

      "'self'",

      // Preserve static prerendering while allowing Next.js bootstrap and hydration.

      "'unsafe-inline'",

      "https://apis.google.com",

      "https://www.gstatic.com",

      "https://*.googleapis.com",

      "https://*.sentry.io",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    "worker-src 'self' blob:",

    "child-src 'self' blob:",

    [
      "style-src",

      "'self'",

      // Next.js emits inline styles during streaming and hydration.

      "'unsafe-inline'",

      "https://fonts.googleapis.com",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    [
      "font-src",

      "'self'",

      "https://fonts.gstatic.com",

      "https://r2cdn.perplexity.ai",

      "data:",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    [
      "img-src",

      "'self'",

      "data:",

      "blob:",

      "https:",

      "https://placehold.co",

      "https://images.unsplash.com",

      "https://picsum.photos",

      "https://www.gstatic.com",

      "https://*.googleapis.com",

      cdnOrigin,
    ]

      .filter(Boolean)

      .join(" "),

    "media-src 'self' https://cdn.pixabay.com https://*.pixabay.com blob: data:",

    `connect-src ${connectSrcParts.join(" ")}`,

    "frame-src 'self' https://apis.google.com https://*.googleapis.com",

    "object-src 'none'",

    "base-uri 'self'",

    "form-action 'self'",

    frameAncestors,

    "upgrade-insecure-requests",
  ].join("; ");
}

function collectAllowedConnectOrigins(urls: (string | undefined)[]): string[] {
  return Array.from(
    new Set(
      urls

        .map((url) => getOriginFromUrl(url))

        .filter((origin): origin is string => Boolean(origin))
    )
  );
}

/**

 * نقطة الدخول الرسمية لطبقة Next.js Proxy. تُحسب رؤوس CSP الديناميكية

 * وتُلصق بكل استجابة قبل تسليمها للمتصفح.

 *

 * @param _request - طلب Next.js الوارد (غير مستخدم حاليًا، حقوق التوسعة لاحقًا).

 * @returns NextResponse مع رؤوس الحماية.

 */

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();

  // Development mode detection

  const isDevelopment = process.env.NODE_ENV === "development";

  const allowedDevOrigin = process.env["ALLOWED_DEV_ORIGIN"] ?? "";

  const sentryOrigin = getOriginFromUrl(process.env["NEXT_PUBLIC_SENTRY_DSN"]);

  const cdnOrigin = getOriginFromUrl(process.env["NEXT_PUBLIC_CDN_URL"]);

  const connectOrigins = collectAllowedConnectOrigins([
    process.env["NEXT_PUBLIC_API_URL"],

    process.env["NEXT_PUBLIC_BACKEND_URL"],

    process.env["BACKEND_URL"],

    process.env["EDITOR_RUNTIME_BASE_URL"],

    process.env["FILE_IMPORT_BACKEND_URL"],

    process.env.NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL,

    process.env["NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL"],
  ]);

  const contentSecurityPolicy = buildContentSecurityPolicy({
    isDevelopment,

    allowedDevOrigin,

    sentryOrigin,

    cdnOrigin,

    connectOrigins,
  });

  if (contentSecurityPolicy) {
    response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  }

  // Additional security headers

  if (!isDevelopment) {
    response.headers.set(
      "Strict-Transport-Security",

      "max-age=31536000; includeSubDomains; preload"
    );
  }

  response.headers.set("X-Content-Type-Options", "nosniff");

  response.headers.set("X-Frame-Options", "DENY");

  response.headers.set("X-XSS-Protection", "1; mode=block");

  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

export const config = {
  matcher: [
    /*

     * Match all request paths except:

     * - _next/static (static files)

     * - _next/image (image optimization files)

     * - favicon.ico (favicon file)

     * - public files (public folder)

     */

    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

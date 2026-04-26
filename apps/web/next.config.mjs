import path from "path";

import bundleAnalyzer from "@next/bundle-analyzer";
import { withSentryConfig } from "@sentry/nextjs";

const isWindowsHost = process.platform === "win32";
const enableStandaloneOutput =
  process.env["NEXT_OUTPUT_MODE"] === "standalone" || !isWindowsHost;

const parsePositiveInt = (value) => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

const buildCpuCount = parsePositiveInt(process.env["NEXT_BUILD_CPUS"]);
const staticGenerationConcurrency = parsePositiveInt(
  process.env["NEXT_STATIC_GENERATION_MAX_CONCURRENCY"]
);
const enableWebpackMemoryOptimizations =
  process.env["NEXT_WEBPACK_MEMORY_OPTIMIZATIONS"] === "true";

// Remote image patterns configuration
const remoteImagePatterns = process.env["NEXT_IMAGE_REMOTE_PATTERNS"]
  ? JSON.parse(process.env["NEXT_IMAGE_REMOTE_PATTERNS"])
  : [
      {
        protocol: "https",
        hostname: "hebbkx1anhila5yf.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
    ];

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env["ANALYZE"] === "true",
});

// CDN Configuration
const cdnUrl = process.env["NEXT_PUBLIC_CDN_URL"];
const enableCdn = process.env["NEXT_PUBLIC_ENABLE_CDN"] === "true";
const assetPrefix = enableCdn && cdnUrl ? cdnUrl : undefined;

const nextConfig = {
  ...(enableStandaloneOutput ? { output: "standalone" } : {}),
  reactStrictMode: true,
  transpilePackages: ["@the-copy/breakapp", "@the-copy/prompt-engineering"],
  poweredByHeader: false,
  compress: true,

  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // Force @google/genai to only be loaded server-side
  serverExternalPackages: ["@google/genai", "puppeteer", "sharp"],

  // Source maps must be generated so Sentry's bundler plugin can upload them
  // (otherwise Sentry shows minified stack traces in production).
  // الأمان محفوظ عبر `hideSourceMaps: true` داخل `withSentryConfig` أدناه،
  // والذي يحذف `//# sourceMappingURL=...` من bundles المنتجة بعد الرفع،
  // فلا تنكشف source maps للمتصفح رغم توليدها أثناء البناء.
  productionBrowserSourceMaps: true,

  // Ensure correct root when multiple lockfiles exist (silences Next.js warning)
  // يؤشر إلى جذر الـ monorepo لتتبع الملفات من packages/ و apps/ معًا
  outputFileTracingRoot: path.join(process.cwd(), "../.."),

  // CDN support for static assets
  assetPrefix,

  // Performance optimizations
  typescript: {
    ignoreBuildErrors: false,
  },
  compiler: {
    removeConsole: process.env["NODE_ENV"] === "production",
  },

  // Suppress middleware deprecation warning (using middleware.ts instead of proxy.ts due to Next.js 16.2.3 bug)
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  experimental: {
    ...(buildCpuCount ? { cpus: buildCpuCount } : {}),
    ...(staticGenerationConcurrency
      ? { staticGenerationMaxConcurrency: staticGenerationConcurrency }
      : {}),
    ...(enableWebpackMemoryOptimizations
      ? { webpackMemoryOptimizations: true }
      : {}),
    // SRI disabled: incompatible with standalone output in Next.js 16
    // sri: { algorithm: "sha256" },
    optimizePackageImports: [
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-collapsible",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-menubar",
      "@radix-ui/react-popover",
      "@radix-ui/react-progress",
      "@radix-ui/react-radio-group",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slider",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-toast",
      "@radix-ui/react-tooltip",
      "lucide-react",
      "recharts",
    ],
  },

  async rewrites() {
    return [
      {
        source: "/api/__health",
        destination: "/api/healthz",
      },
    ];
  },

  async headers() {
    const isDev = process.env["NODE_ENV"] !== "production";

    // In development: force no-cache on all routes so browser always fetches fresh content
    if (isDev) {
      return [
        {
          source: "/(.*)",
          headers: [
            {
              key: "Cache-Control",
              value: "no-store, no-cache, must-revalidate, proxy-revalidate",
            },
            {
              key: "Pragma",
              value: "no-cache",
            },
            {
              key: "Expires",
              value: "0",
            },
          ],
        },
      ];
    }

    // Production headers — security + aggressive caching
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            // Permissions-Policy: السماح لنفس الـ origin فقط بالوصول إلى الكاميرا والموقع
            // السبب: مسار BreakApp QR login يحتاج getUserMedia للكاميرا، وخريطة BreakApp تحتاج geolocation
            // الحظر السابق "camera=()" كان يمنع تشغيل الكاميرا نهائياً في الإنتاج — السبب الجذري للعطل
            // الصيغة "(self)" تسمح للـ origin الحالي فقط، وتمنع أي iframe خارجي من الاستفادة
            key: "Permissions-Policy",
            value: [
              "camera=(self)",
              "microphone=()",
              "geolocation=(self)",
              "interest-cohort=()",
              "payment=()",
              "usb=()",
            ].join(", "),
          },
        ],
      },
      // Keep font access permissive without overriding framework cache policy.
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cross-Origin-Resource-Policy",
            value: "cross-origin",
          },
        ],
      },
    ];
  },

  images: {
    remotePatterns: remoteImagePatterns,
  },

  // Turbopack configuration for Next.js 16
  turbopack: {
    resolveAlias: {
      "@editor/*": "./src/app/(main)/editor/src/*",
    },
  },

  // Webpack configuration for handling Node.js built-in modules and critical dependency warnings
  // Note: In Next.js 16, Turbopack is default. Webpack config is kept for fallback compatibility.
  webpack: (config, { isServer }) => {
    // حذف config.devtool اليدوي - الاعتماد على إدارة Next.js الداخلية عبر productionBrowserSourceMaps

    if (!isServer) {
      // Don't resolve Node.js modules on client side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        http2: false,
        child_process: false,
        stream: false,
        crypto: false,
        path: false,
        os: false,
        dgram: false,
        async_hooks: false,
        "node:async_hooks": false,
        "graceful-fs": false,
      };
    }

    // فحص ignoreWarnings عنصرًا بعنصر حسب المعايير الصريحة
    config.ignoreWarnings = [
      // OpenTelemetry instrumentation warnings - third-party معروفة، non-actionable
      {
        module: /@opentelemetry\/instrumentation/,
        message:
          /Critical dependency: the request of a dependency is an expression/,
      },
      // require-in-the-middle - third-party معروفة، non-actionable
      {
        module: /require-in-the-middle/,
        message:
          /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      },
      // ESLint configuration warnings - third-party معروفة، non-actionable
      {
        message: /Unknown options: useEslintrc, extensions/,
      },
    ];

    // إزالة إخفاء التحذيرات المحظور - إصلاح إضعاف الفحص
    config.stats = {
      ...config.stats,
      // إزالة warnings: false و warningsFilter
    };

    return config;
  },
};

// Sentry configuration
const sentryOrg = process.env["SENTRY_ORG"];
const sentryProject = process.env["SENTRY_PROJECT"];
const sentryConfig =
  sentryOrg && sentryProject
    ? {
        org: sentryOrg,
        project: sentryProject,
        silent: !process.env["CI"],
        widenClientFileUpload: true, // إبقاء مع assets whitelist
        hideSourceMaps: process.env["NODE_ENV"] === "production",
        tunnelRoute: "/monitoring",
        sourcemaps: {
          disable: false,
          assets: [ // whitelist صريح، لا blacklist
            ".next/static/chunks/**/*.js",
            ".next/static/chunks/**/*.js.map",
            ".next/server/**/*.js",
            ".next/server/**/*.js.map",
          ],
          ignore: [
            "**/*manifest*.js",
            "**/*reference-manifest*.js",
            "**/node_modules/**",
          ],
          filesToDeleteAfterUpload: true,
        },
      }
    : null;

// Export config with Sentry wrapper if configured
const configWithAnalyzer = withBundleAnalyzer(nextConfig);
export default sentryConfig
  ? withSentryConfig(configWithAnalyzer, sentryConfig)
  : configWithAnalyzer;

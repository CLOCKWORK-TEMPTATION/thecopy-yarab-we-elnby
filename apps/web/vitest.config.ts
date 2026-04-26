import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    server: {
      deps: {
        inline: [/jsdom/],
      },
    },
    include: [
      "src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
      "../../qa/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/e2e/**",
      "**/tests/e2e/**",
    ],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "json-summary"],
      reportsDirectory: "./reports/coverage",
      exclude: [
        "coverage/**",
        "reports/**",
        "dist/**",
        "**/node_modules/**",
        "**/[.]**",
        "packages/*/test{,s}/**",
        "**/*.d.ts",
        "**/virtual:*",
        "**/__x00__*",
        "**/\\x00*",
        "cypress/**",
        ".next/**",
        ".test/**",
        "test{,s}/**",
        "test{,-*}.{js,cjs,mjs,ts,tsx,jsx}",
        "**/*{.,-}test.{js,cjs,mjs,ts,tsx,jsx}",
        "**/*{.,-}spec.{js,cjs,mjs,ts,tsx,jsx}",
        "**/__tests__/**",
        "**/__smoke__/**",
        "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
        "**/vitest.{workspace,projects}.[jt]s?(on)",
        "**/.{eslint,mocha,prettier}rc.{?(c|m)js,yml}",
        "next.config.*",
        "tailwind.config.*",
        "postcss.config.*",
        ".env*",
      ],
      skipFull: false,
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
        each: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "~": path.resolve(__dirname, "src"),
      "@qa": path.resolve(__dirname, "../../qa"),
      "@core": path.resolve(__dirname, "src/lib/drama-analyst"),
      "@agents": path.resolve(__dirname, "src/lib/drama-analyst/agents"),
      "@services": path.resolve(__dirname, "src/lib/drama-analyst/services"),
      "@orchestration": path.resolve(
        __dirname,
        "src/lib/drama-analyst/orchestration"
      ),
      "@shared": path.resolve(
        __dirname,
        "src/app/(main)/directors-studio/shared"
      ),
      "@components": path.resolve(__dirname, "src/components"),
    },
  },
});

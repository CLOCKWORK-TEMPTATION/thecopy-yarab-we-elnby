import path from "node:path";

import { defineConfig } from "vitest/config";

const nodeTestGlobs = [
  "tests/harness/**/*.test.ts",
  "tests/integration/server/**/*.test.ts",
  "tests/unit/server/**/*.test.ts",
  "tests/integration/pdf-ocr-agent.integration.test.ts",
];

const editorAlias = {
  "@": path.resolve(__dirname, "./src"),
  "@tests": path.resolve(__dirname, "./tests"),
};

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 15_000,
    setupFiles: ["./tests/config/vitest-setup.ts"],
    alias: editorAlias,
    projects: [
      {
        extends: true,
        test: {
          name: "editor-node",
          environment: "node",
          include: nodeTestGlobs,
          exclude: ["tests/e2e/**"],
        },
      },
      {
        extends: true,
        test: {
          name: "editor-jsdom",
          environment: "jsdom",
          include: ["tests/**/*.test.ts"],
          exclude: ["tests/e2e/**", ...nodeTestGlobs],
        },
      },
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      reportsDirectory: "./test-results/coverage",
      exclude: ["tests/**", "node_modules/**", "**/*.d.ts"],
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
    alias: editorAlias,
  },
});

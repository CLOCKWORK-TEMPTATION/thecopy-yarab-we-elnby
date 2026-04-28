import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    typecheck: {
      tsconfig: "./tsconfig.vitest.json",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      lines: 95,
      functions: 95,
      branches: 95,
      statements: 95,
      exclude: [
        "coverage/**",
        "dist/**",
        "**/node_modules/**",
        "**/*.d.ts",
        "**/test/**",
        "**/test/**/*.ts",
        "**/*.config.*",
        "**/*.mock.*",
        "**/mcp-server.ts",
        "src/db/migrations/**",
      ],
      all: true,
      perFile: true,
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
      "@": path.resolve(currentDir, "./src"),
      "@core": path.resolve(currentDir, "./src/services/agents/core"),
    },
  },
});

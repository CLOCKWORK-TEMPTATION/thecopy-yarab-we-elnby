import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**"],
    globals: true,
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "~": path.resolve(__dirname, "src"),
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

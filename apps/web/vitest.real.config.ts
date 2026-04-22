import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/integration/**/*.real.test.ts"],
    globals: true,
    testTimeout: 180_000,
    hookTimeout: 180_000,
    reporters: ["default"],
  },
});

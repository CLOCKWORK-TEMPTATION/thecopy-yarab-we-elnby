import "@testing-library/jest-dom/vitest";

import { vi } from "vitest";

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Mock environment variables
if (process.env["NODE_ENV"] !== "test") {
  Object.defineProperty(process.env, "NODE_ENV", {
    value: "test",
    configurable: true,
    writable: true,
  });
}

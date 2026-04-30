"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";

import { NotificationProvider } from "@/components/providers/notification-provider";

interface E2EDiagnosticsSnapshot {
  url: string;
  consoleErrors: { message: string; timestamp: number }[];
  networkEvents: {
    url: string;
    method: string;
    status: number | null;
    ok: boolean;
    timestamp: number;
  }[];
  localStorageKeys: string[];
  sessionStorageKeys: string[];
}

interface E2EDiagnosticsApi {
  getSnapshot: () => E2EDiagnosticsSnapshot;
  clear: () => void;
  restore: () => void;
}

declare global {
  interface Window {
    __THE_COPY_E2E_DIAGNOSTICS__?: E2EDiagnosticsApi;
  }
}

function safeConsoleMessage(value: unknown): string {
  if (typeof value !== "string") {
    return "[non-string console error]";
  }

  return value.slice(0, 240);
}

function safeRequestUrl(input: RequestInfo | URL): string {
  const rawUrl =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;

  try {
    const url = new URL(rawUrl, window.location.origin);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "/unknown-request";
  }
}

function requestMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) {
    return init.method.toUpperCase();
  }

  if (typeof input === "object" && "method" in input && input.method) {
    return input.method.toUpperCase();
  }

  return "GET";
}

function installE2EDiagnostics(): void {
  if (typeof window === "undefined") return;
  if (process.env["NEXT_PUBLIC_E2E_DIAGNOSTICS"] !== "1") return;
  if (window.__THE_COPY_E2E_DIAGNOSTICS__) return;

  const consoleErrors: E2EDiagnosticsSnapshot["consoleErrors"] = [];
  const networkEvents: E2EDiagnosticsSnapshot["networkEvents"] = [];
  const originalConsoleError = console.error;
  const originalFetch = window.fetch.bind(window);

  console.error = (...args: unknown[]) => {
    consoleErrors.push({
      message: safeConsoleMessage(args[0]),
      timestamp: Date.now(),
    });
    originalConsoleError(...args);
  };

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const event = {
      url: safeRequestUrl(input),
      method: requestMethod(input, init),
      status: null,
      ok: false,
      timestamp: Date.now(),
    };

    try {
      const response = await originalFetch(input, init);
      networkEvents.push({
        ...event,
        status: response.status,
        ok: response.ok,
      });
      return response;
    } catch (error) {
      networkEvents.push(event);
      throw error;
    }
  };

  window.__THE_COPY_E2E_DIAGNOSTICS__ = {
    getSnapshot: () => ({
      url: `${window.location.origin}${window.location.pathname}`,
      consoleErrors: consoleErrors.slice(-50),
      networkEvents: networkEvents.slice(-100),
      localStorageKeys: Object.keys(window.localStorage),
      sessionStorageKeys: Object.keys(window.sessionStorage),
    }),
    clear: () => {
      consoleErrors.length = 0;
      networkEvents.length = 0;
    },
    restore: () => {
      console.error = originalConsoleError;
      window.fetch = originalFetch;
      delete window.__THE_COPY_E2E_DIAGNOSTICS__;
    },
  };
}

/**
 * Providers Component
 *
 * Wraps the application with necessary providers:
 * - QueryClientProvider: for React Query state management
 * - NotificationProvider: for global notifications
 * - OpenTelemetry Browser Tracing (lazy-loaded only when enabled)
 *
 * This component must use 'use client' directive since it manages client-side state
 */
function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            gcTime: 5 * 60 * 1000, // 5 minutes (previously cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  // Initialize browser tracing lazily — avoids bundling heavy OTel SDK into the
  // initial JS chunk when tracing is disabled (the common production case).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light");
    root.classList.add("dark");
    root.style.colorScheme = "dark";
    window.localStorage.setItem("filmlane.theme", "dark");
  }, []);

  useEffect(() => {
    installE2EDiagnostics();
  }, []);

  useEffect(() => {
    if (process.env["NEXT_PUBLIC_TRACING_ENABLED"] !== "true") return;
    const id = setTimeout(() => {
      import("@/lib/tracing")
        .then(({ initBrowserTracing }) => {
          initBrowserTracing();
        })
        .catch(() => {
          // لا نعطل التطبيق إذا فشل تحميل التتبع الاختياري.
        });
    }, 3000);
    return () => clearTimeout(id);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationProvider>{children}</NotificationProvider>
    </QueryClientProvider>
  );
}

export { Providers };
export default Providers;

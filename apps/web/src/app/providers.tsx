"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState, useEffect } from "react";
import { NotificationProvider } from "@/components/providers/notification-provider";

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
    if (process.env["NEXT_PUBLIC_TRACING_ENABLED"] !== "true") return;
    const id = setTimeout(() => {
      import("@/lib/tracing").then(({ initBrowserTracing }) => {
        initBrowserTracing();
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

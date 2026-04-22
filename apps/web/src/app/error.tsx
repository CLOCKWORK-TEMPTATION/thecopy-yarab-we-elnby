"use client";

import { logger } from "@/lib/ai/utils/logger";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console or send to error tracking service (e.g., Sentry)
    logger.error("Error boundary caught:", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">حدث خطأ غير متوقع</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          حاول إعادة المحاولة. إن استمر الخطأ، راجع السجلات.
        </p>
        {error.message && (
          <details className="mb-6 rounded border bg-muted p-4 text-sm">
            <summary className="cursor-pointer font-medium">
              تفاصيل الخطأ
            </summary>
            <p className="mt-2 text-muted-foreground">{error.message}</p>
          </details>
        )}
        <Button onClick={reset} className="w-full sm:w-auto" variant="default">
          إعادة المحاولة
        </Button>
      </div>
    </main>
  );
}

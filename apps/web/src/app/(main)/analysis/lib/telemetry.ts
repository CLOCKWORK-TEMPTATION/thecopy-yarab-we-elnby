/**
 * Best-effort telemetry sink. The backend exposes a tiny endpoint that
 * accepts arbitrary { event, payload } pairs and drops them at debug level.
 * We never block the UI on a telemetry failure.
 */

export function reportTelemetry(event: string, payload?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    void fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ event, payload: payload ?? {} }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* swallow */
  }
}

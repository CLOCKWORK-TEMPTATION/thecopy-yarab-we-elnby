/**
 * Thin EventSource wrapper that records the latest received event id so the
 * browser's native EventSource can resume cleanly via `Last-Event-ID` on
 * reconnect. Exposes a typed event stream callback.
 */

import type { StreamEvent } from "./types";

export interface SseHandle {
  close(): void;
}

export interface OpenSseOptions {
  url: string;
  onEvent: (event: StreamEvent) => void;
  onError?: (err: Event) => void;
  onOpen?: () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function openSse(opts: OpenSseOptions): SseHandle {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return { close: () => undefined };
  }

  const es = new EventSource(opts.url, { withCredentials: true });
  // Backend uses named events (event: pipeline.started, etc). Listen to them
  // explicitly so the browser's lastEventId tracking remains correct.
  const eventNames: readonly StreamEvent["type"][] = [
    "pipeline.started",
    "pipeline.warning",
    "pipeline.completed",
    "station.started",
    "station.progress",
    "station.token",
    "station.completed",
    "station.error",
  ];

  const eventTypes = new Set<string>(eventNames);
  const isStreamEvent = (value: unknown): value is StreamEvent =>
    isRecord(value) &&
    typeof value["type"] === "string" &&
    eventTypes.has(value["type"]);

  const handlers = new Map<string, (e: MessageEvent<string>) => void>();
  for (const name of eventNames) {
    const h = (e: MessageEvent<string>) => {
      try {
        const payload: unknown = JSON.parse(e.data);
        if (isStreamEvent(payload)) {
          opts.onEvent(payload);
        }
      } catch {
        // ignore malformed payloads
      }
    };
    handlers.set(name, h);
    es.addEventListener(name, h as EventListener);
  }

  if (opts.onOpen) es.addEventListener("open", opts.onOpen);
  if (opts.onError) es.addEventListener("error", opts.onError);

  return {
    close() {
      for (const [name, h] of handlers) {
        es.removeEventListener(name, h as EventListener);
      }
      es.close();
    },
  };
}

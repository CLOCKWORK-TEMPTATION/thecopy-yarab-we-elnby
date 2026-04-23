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

export function openSse(opts: OpenSseOptions): SseHandle {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return { close: () => undefined };
  }

  const es = new EventSource(opts.url, { withCredentials: true });
  // Backend uses named events (event: pipeline.started, etc). Listen to them
  // explicitly so the browser's lastEventId tracking remains correct.
  const eventNames: ReadonlyArray<StreamEvent["type"]> = [
    "pipeline.started",
    "pipeline.warning",
    "pipeline.completed",
    "station.started",
    "station.progress",
    "station.token",
    "station.completed",
    "station.error",
  ];

  const handlers = new Map<string, (e: MessageEvent) => void>();
  for (const name of eventNames) {
    const h = (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as StreamEvent;
        opts.onEvent(payload);
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

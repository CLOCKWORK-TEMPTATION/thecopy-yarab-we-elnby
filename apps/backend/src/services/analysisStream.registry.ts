/**
 * In-memory registry of active streaming analysis sessions.
 *
 * Each session keeps:
 *  - a monotonic event id (stable across reconnects within process lifetime)
 *  - a ring buffer of recent events for Last-Event-ID replay
 *  - a snapshot of the current pipeline state (source of truth for the client)
 *  - a set of currently attached SSE writers
 *
 * Persistence beyond process lifetime is intentionally out of scope here —
 * snapshots fall back to in-memory state and clients reconcile via the
 * /snapshot endpoint when a session has expired.
 */

import { randomUUID } from 'crypto';

import { logger } from '@/lib/logger';

export type StationId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type StationStatus =
  | 'idle'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed';

export interface StationState {
  id: StationId;
  name: string;
  status: StationStatus;
  progress: number; // 0..1
  startedAt: string | null;
  completedAt: string | null;
  output: unknown;
  error: string | null;
  confidence: number | null;
}

export interface PipelineWarning {
  id: string;
  stationId: StationId | null;
  message: string;
  severity: 'info' | 'warn' | 'error';
  at: string;
}

export interface StreamSessionSnapshot {
  analysisId: string;
  projectId: string | null;
  projectName: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  textLength: number;
  stations: StationState[];
  warnings: PipelineWarning[];
  finalReport: string | null;
  metadata: Record<string, unknown>;
}

export type StreamEvent =
  | { type: 'pipeline.started'; analysisId: string; projectName: string; capabilities: { exports: string[] } }
  | { type: 'pipeline.warning'; warning: PipelineWarning }
  | { type: 'pipeline.completed'; status: 'completed' | 'failed'; durationMs: number }
  | { type: 'station.started'; stationId: StationId; name: string; at: string }
  | { type: 'station.progress'; stationId: StationId; progress: number }
  | { type: 'station.token'; stationId: StationId; token: string }
  | { type: 'station.completed'; stationId: StationId; output: unknown; confidence: number | null; durationMs: number }
  | { type: 'station.error'; stationId: StationId; message: string }
  | { type: 'snapshot'; snapshot: StreamSessionSnapshot };

export interface SerializedEvent {
  id: number;
  event: string;
  data: string;
}

const STATION_NAMES: Record<StationId, string> = {
  1: 'التحليل العميق للشخصيات',
  2: 'التحليل المتقدم للحوار',
  3: 'التحليل البصري والسينمائي',
  4: 'تحليل الموضوعات والرسائل',
  5: 'التحليل الثقافي والتاريخي',
  6: 'تحليل قابلية الإنتاج',
  7: 'تحليل الجمهور والتقرير النهائي',
};

const MAX_BUFFER = 1024;
const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes
const STATION_IDS: StationId[] = [1, 2, 3, 4, 5, 6, 7];

interface InternalSession {
  snapshot: StreamSessionSnapshot;
  buffer: SerializedEvent[];
  nextId: number;
  writers: Set<(chunk: string) => void>;
  expiresAt: number;
}

class AnalysisStreamRegistry {
  private sessions = new Map<string, InternalSession>();

  create(input: { projectName: string; projectId: string | null; textLength: number; ownerId: string }): InternalSession {
    const analysisId = randomUUID();
    const now = new Date().toISOString();
    const stations: StationState[] = STATION_IDS.map((id) => ({
      id,
      name: STATION_NAMES[id],
      status: 'idle',
      progress: 0,
      startedAt: null,
      completedAt: null,
      output: null,
      error: null,
      confidence: null,
    }));

    const session: InternalSession = {
      snapshot: {
        analysisId,
        projectId: input.projectId,
        projectName: input.projectName,
        status: 'idle',
        startedAt: now,
        completedAt: null,
        textLength: input.textLength,
        stations,
        warnings: [],
        finalReport: null,
        metadata: { ownerId: input.ownerId },
      },
      buffer: [],
      nextId: 1,
      writers: new Set(),
      expiresAt: Date.now() + SESSION_TTL_MS,
    };

    this.sessions.set(analysisId, session);
    return session;
  }

  get(analysisId: string): InternalSession | undefined {
    const session = this.sessions.get(analysisId);
    if (!session) return undefined;
    session.expiresAt = Date.now() + SESSION_TTL_MS;
    return session;
  }

  getSnapshot(analysisId: string): StreamSessionSnapshot | undefined {
    return this.get(analysisId)?.snapshot;
  }

  emit(analysisId: string, event: StreamEvent): void {
    const session = this.sessions.get(analysisId);
    if (!session) return;

    this.applyToSnapshot(session, event);

    const id = session.nextId++;
    const serialized: SerializedEvent = {
      id,
      event: event.type,
      data: JSON.stringify(event),
    };
    session.buffer.push(serialized);
    if (session.buffer.length > MAX_BUFFER) {
      session.buffer.splice(0, session.buffer.length - MAX_BUFFER);
    }
    const chunk = formatSse(serialized);
    for (const writer of session.writers) {
      try {
        writer(chunk);
      } catch (err) {
        logger.warn('SSE writer threw on emit', { analysisId, err });
      }
    }
  }

  attach(
    analysisId: string,
    writer: (chunk: string) => void,
    lastEventId: number | null
  ): { ok: true; replay: SerializedEvent[] } | { ok: false; reason: 'not-found' } {
    const session = this.get(analysisId);
    if (!session) return { ok: false, reason: 'not-found' };

    const replay = lastEventId == null
      ? session.buffer.slice()
      : session.buffer.filter((e) => e.id > lastEventId);

    session.writers.add(writer);
    return { ok: true, replay };
  }

  detach(analysisId: string, writer: (chunk: string) => void): void {
    const session = this.sessions.get(analysisId);
    if (!session) return;
    session.writers.delete(writer);
  }

  pruneExpired(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions) {
      if (session.expiresAt < now && session.writers.size === 0) {
        this.sessions.delete(id);
      }
    }
  }

  private applyToSnapshot(session: InternalSession, event: StreamEvent): void {
    const snap = session.snapshot;
    switch (event.type) {
      case 'pipeline.started':
        snap.status = 'running';
        break;
      case 'pipeline.completed':
        snap.status = event.status;
        snap.completedAt = new Date().toISOString();
        break;
      case 'pipeline.warning':
        snap.warnings.push(event.warning);
        break;
      case 'station.started': {
        const s = snap.stations.find((x) => x.id === event.stationId);
        if (s) {
          s.status = 'running';
          s.startedAt = event.at;
          s.progress = 0;
          s.error = null;
        }
        break;
      }
      case 'station.progress': {
        const s = snap.stations.find((x) => x.id === event.stationId);
        if (s) s.progress = Math.max(0, Math.min(1, event.progress));
        break;
      }
      case 'station.completed': {
        const s = snap.stations.find((x) => x.id === event.stationId);
        if (s) {
          s.status = 'completed';
          s.progress = 1;
          s.completedAt = new Date().toISOString();
          s.output = event.output;
          s.confidence = event.confidence;
        }
        break;
      }
      case 'station.error': {
        const s = snap.stations.find((x) => x.id === event.stationId);
        if (s) {
          s.status = 'failed';
          s.error = event.message;
          s.completedAt = new Date().toISOString();
        }
        break;
      }
      case 'snapshot':
      case 'station.token':
        break;
    }

    // Derive finalReport when station 7 completes
    const station7 = snap.stations.find((x) => x.id === 7);
    if (station7?.status === 'completed' && station7.output && typeof station7.output === 'object') {
      const details = (station7.output as { details?: { finalReport?: unknown } }).details;
      if (details && typeof details.finalReport === 'string') {
        snap.finalReport = details.finalReport;
      }
    }
  }
}

function formatSse(e: SerializedEvent): string {
  return `id: ${e.id}\nevent: ${e.event}\ndata: ${e.data}\n\n`;
}

export const analysisStreamRegistry = new AnalysisStreamRegistry();
export { STATION_NAMES };

// Periodic prune (best-effort)
setInterval(() => analysisStreamRegistry.pruneExpired(), 60_000).unref?.();

"use client";

import { Loader2, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import type { StationId, StationState } from "../lib/types";
import { QualityBadge } from "./QualityBadge";

interface Props {
  station: StationState;
  canRetry: boolean;
  onRetry: (stationId: StationId) => void;
}

export function StationCard({ station, canRetry, onRetry }: Props) {
  const summary = summarizeOutput(station.output);
  const statusLabel = labelFor(station.status);
  const statusColor = colorFor(station.status);

  return (
    <article
      className="flex h-full flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-right shadow-sm"
      aria-label={station.name}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <p className="text-[11px] tracking-[0.2em] text-white/40">
            المحطة {station.id}
          </p>
          <h3 className="text-sm font-semibold text-white/90">{station.name}</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] ${statusColor}`}
        >
          {station.status === "running" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : station.status === "completed" ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : station.status === "failed" ? (
            <AlertCircle className="h-3 w-3" />
          ) : null}
          {statusLabel}
        </span>
      </header>

      {(station.status === "running" || station.status === "queued") && (
        <Progress value={Math.round(station.progress * 100)} className="h-1.5" />
      )}

      {station.confidence != null && station.status === "completed" && (
        <QualityBadge confidence={station.confidence} />
      )}

      {station.error && (
        <p className="rounded-md border border-rose-500/20 bg-rose-500/5 px-2 py-1.5 text-xs text-rose-200">
          {station.error}
        </p>
      )}

      {summary && (
        <p className="line-clamp-4 text-xs leading-relaxed text-white/65">
          {summary}
        </p>
      )}

      {canRetry && (station.status === "failed" || station.status === "completed") && (
        <div className="mt-auto pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRetry(station.id)}
            className="w-full gap-2"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            إعادة تشغيل المحطة
          </Button>
        </div>
      )}
    </article>
  );
}

function labelFor(status: StationState["status"]): string {
  switch (status) {
    case "idle": return "في الانتظار";
    case "queued": return "في الطابور";
    case "running": return "قيد التنفيذ";
    case "completed": return "مكتملة";
    case "failed": return "فشل";
  }
}

function colorFor(status: StationState["status"]): string {
  switch (status) {
    case "running": return "bg-sky-500/15 text-sky-200 border border-sky-500/25";
    case "completed": return "bg-emerald-500/15 text-emerald-200 border border-emerald-500/25";
    case "failed": return "bg-rose-500/15 text-rose-200 border border-rose-500/25";
    case "queued": return "bg-violet-500/15 text-violet-200 border border-violet-500/25";
    default: return "bg-white/5 text-white/55 border border-white/10";
  }
}

function summarizeOutput(output: unknown): string | null {
  if (!output || typeof output !== "object") return null;
  const o = output as { details?: { fullAnalysis?: unknown }; finalReport?: unknown };
  const text =
    (typeof o.details?.fullAnalysis === "string" && o.details.fullAnalysis) ||
    (typeof o.finalReport === "string" && o.finalReport) ||
    null;
  if (!text) return null;
  return text.length > 320 ? `${text.slice(0, 320)}…` : text;
}

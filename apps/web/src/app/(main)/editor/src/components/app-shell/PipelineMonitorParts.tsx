"use client";

import React from "react";

export interface StageEntry {
  stage: string;
  lineCount: number;
  changes: number;
  latencyMs: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
  activeFiles: string[];
}

const STAGE_META: Record<string, { label: string; icon: string }> = {
  "engine-bridge": { label: "البريدج", icon: "🌉" },
  "schema-style-classify": { label: "تصنيف Schema", icon: "📐" },
  "forward-pass": { label: "التمرير الأمامي", icon: "➡️" },
  retroactive: { label: "التصحيح الرجعي", icon: "🔄" },
  "reverse-pass": { label: "التمرير العكسي", icon: "⬅️" },
  viterbi: { label: "Viterbi", icon: "🧬" },
  "render-first": { label: "العرض الأول", icon: "🖥️" },
  "gemini-context": { label: "Gemini سياق", icon: "🤖" },
  "final-review": { label: "المراجعة النهائية", icon: "🧠" },
};

export const getStageMeta = (stage: string) =>
  STAGE_META[stage] ?? { label: stage, icon: "⚙️" };

export const KNOWN_STAGES = [
  "schema-style-classify",
  "forward-pass",
  "retroactive",
  "reverse-pass",
  "viterbi",
  "render-first",
  "gemini-context",
  "final-review",
];

export const ProgressBar: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/18">
      <div
        className="h-full rounded-full bg-gradient-to-l from-cyan-400 to-blue-600 transition-all duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
};

const StageRow: React.FC<{
  entry: StageEntry;
  isActive: boolean;
  isLast: boolean;
}> = ({ entry, isActive, isLast }) => {
  const meta = getStageMeta(entry.stage);
  return (
    <>
      <div
        className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors ${isActive ? "border border-cyan-700/40 bg-cyan-950/60" : isLast ? "bg-black/18" : "bg-transparent"}`}
      >
        <span className="shrink-0 text-sm">{meta.icon}</span>
        <span className="min-w-[100px] font-medium text-white">
          {meta.label}
        </span>
        <span className="text-white/45 tabular-nums">
          {entry.lineCount} سطر
        </span>
        {entry.changes > 0 && (
          <span className="text-amber-400 tabular-nums">Δ{entry.changes}</span>
        )}
        {entry.latencyMs > 0 && (
          <span className="ms-auto text-white/55 tabular-nums">
            {entry.latencyMs}ms
          </span>
        )}
        {isActive && (
          <span className="relative ms-1 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
          </span>
        )}
      </div>
      {entry.activeFiles.length > 0 && (
        <div className="-mt-0.5 flex flex-wrap gap-1 px-3 pb-1">
          {entry.activeFiles.map((f) => (
            <span
              key={f}
              className="rounded bg-black/18 px-1.5 py-0.5 font-mono text-[9px] text-cyan-400/70"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </>
  );
};

export const RunStagesPanel: React.FC<{
  stages: StageEntry[];
  finished: boolean;
  activeStageIndex: number;
  completedStages: string[];
}> = ({ stages, finished, activeStageIndex, completedStages }) => (
  <div className="max-h-[220px] space-y-1 overflow-y-auto border-b border-white/8 px-3 py-2">
    {KNOWN_STAGES.map((stageKey, idx) => {
      const entry = stages.find((s) => s.stage === stageKey);
      const isActive = idx === activeStageIndex;
      const isPending = !entry && !finished;
      const isSkipped = !entry && finished;

      if (entry) {
        return (
          <StageRow
            key={stageKey}
            entry={entry}
            isActive={isActive}
            isLast={idx === completedStages.length - 1}
          />
        );
      }

      const meta = getStageMeta(stageKey);
      return (
        <div
          key={stageKey}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ${isActive ? "border border-cyan-800/30 bg-cyan-950/30" : ""}`}
        >
          <span
            className={`shrink-0 text-sm ${isPending ? "opacity-30" : "opacity-20"}`}
          >
            {meta.icon}
          </span>
          <span
            className={`min-w-[100px] font-medium ${isPending ? "text-white/55" : "text-white/68 line-through"}`}
          >
            {meta.label}
          </span>
          {isSkipped && <span className="text-[10px] text-white/68">تخطي</span>}
          {isActive && (
            <span className="relative ms-auto flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
            </span>
          )}
        </div>
      );
    })}
  </div>
);

const TYPE_COLORS: Record<string, string> = {
  action: "bg-emerald-500",
  dialogue: "bg-blue-500",
  character: "bg-purple-500",
  scene_header_1: "bg-amber-500",
  scene_header_2: "bg-orange-500",
  scene_header_3: "bg-yellow-500",
  transition: "bg-red-500",
  parenthetical: "bg-pink-500",
  basmala: "bg-teal-500",
};

export const TypeDistBar: React.FC<{ dist: Record<string, number> }> = ({
  dist,
}) => {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  const entries = Object.entries(dist).sort(([, a], [, b]) => b - a);
  return (
    <div className="space-y-1">
      <div className="flex h-2 gap-px overflow-hidden rounded-full">
        {entries.map(([type, count]) => (
          <div
            key={type}
            className={`${TYPE_COLORS[type] ?? "bg-white/45"} transition-all duration-500`}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${type}: ${count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-white/45">
        {entries.map(([type, count]) => (
          <span key={type} className="flex items-center gap-1">
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${TYPE_COLORS[type] ?? "bg-white/45"}`}
            />
            {type.replace(/_/g, " ")} ({count})
          </span>
        ))}
      </div>
    </div>
  );
};

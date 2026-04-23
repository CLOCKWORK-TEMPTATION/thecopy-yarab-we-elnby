"use client";

import type { PipelineWarning } from "../lib/types";

interface Props {
  warnings: PipelineWarning[];
}

export function WarningsPanel({ warnings }: Props) {
  if (warnings.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-right">
      <h3 className="mb-2 text-sm font-semibold text-amber-200">تنبيهات</h3>
      <ul className="space-y-1.5 text-xs text-amber-100/85">
        {warnings.map((w) => (
          <li key={w.id} className="leading-relaxed">
            <span className="opacity-60">[{w.severity}]</span> {w.message}
          </li>
        ))}
      </ul>
    </div>
  );
}

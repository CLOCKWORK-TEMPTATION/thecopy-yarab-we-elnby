"use client";

import { useMemo } from "react";

import type { StationState } from "../lib/types";

interface Props {
  stations: StationState[];
}

interface RawRelationship {
  character1?: unknown;
  character2?: unknown;
  relationshipType?: unknown;
  strength?: unknown;
}

interface Edge {
  source: string;
  target: string;
  kind: string;
  weight: number;
}

export function RelationshipGraph({ stations }: Props) {
  const edges = useMemo(() => extractRelationships(stations), [stations]);

  if (edges.length === 0) return null;

  const nodes = Array.from(
    new Set(edges.flatMap((e) => [e.source, e.target]))
  );
  const radius = 130;
  const cx = 180;
  const cy = 180;
  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    positions.set(n, {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    });
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-right">
      <h3 className="mb-3 text-sm font-semibold text-white/85">
        خريطة العلاقات
      </h3>
      <svg
        viewBox="0 0 360 360"
        className="mx-auto block w-full max-w-md"
        role="img"
        aria-label="خريطة علاقات الشخصيات"
      >
        {edges.map((e, i) => {
          const a = positions.get(e.source);
          const b = positions.get(e.target);
          if (!a || !b) return null;
          return (
            <line
              key={`e-${i}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="rgba(180,200,255,0.4)"
              strokeWidth={Math.max(0.6, e.weight * 2.4)}
            >
              <title>{`${e.source} ↔ ${e.target} — ${e.kind}`}</title>
            </line>
          );
        })}
        {nodes.map((n) => {
          const p = positions.get(n)!;
          return (
            <g key={n}>
              <circle cx={p.x} cy={p.y} r={6} fill="#60a5fa" />
              <text
                x={p.x}
                y={p.y - 10}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(255,255,255,0.85)"
              >
                {n}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function extractRelationships(stations: StationState[]): Edge[] {
  const station1 = stations.find((s) => s.id === 1);
  const out = station1?.output as { relationships?: RawRelationship[] } | null;
  const raw = Array.isArray(out?.relationships) ? out.relationships : [];
  const edges: Edge[] = [];
  for (const r of raw) {
    const a = typeof r.character1 === "string" ? r.character1.trim() : "";
    const b = typeof r.character2 === "string" ? r.character2.trim() : "";
    if (!a || !b) continue;
    const kind = typeof r.relationshipType === "string" ? r.relationshipType : "—";
    const weight = typeof r.strength === "number" && Number.isFinite(r.strength) ? r.strength : 0.5;
    edges.push({ source: a, target: b, kind, weight });
  }
  return edges;
}

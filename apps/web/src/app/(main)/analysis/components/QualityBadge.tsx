"use client";

interface Props {
  confidence: number | null;
}

export function QualityBadge({ confidence }: Props) {
  if (confidence == null || !Number.isFinite(confidence)) return null;
  const pct = Math.round(confidence * 100);
  const tier =
    pct >= 80 ? "high" : pct >= 55 ? "mid" : "low";
  const colors: Record<string, string> = {
    high: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    mid: "bg-amber-500/15 text-amber-200 border-amber-500/30",
    low: "bg-rose-500/15 text-rose-200 border-rose-500/30",
  };
  const label = tier === "high" ? "جودة عالية" : tier === "mid" ? "جودة متوسطة" : "جودة منخفضة";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors[tier]}`}
      title={`الثقة: ${pct}%`}
    >
      <span aria-hidden="true">●</span>
      {label} · {pct}%
    </span>
  );
}

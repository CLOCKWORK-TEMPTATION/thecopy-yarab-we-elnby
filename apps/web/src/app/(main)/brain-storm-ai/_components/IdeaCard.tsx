"use client";

interface RubricScores {
  originality: number;
  thematicDepth: number;
  audienceFit: number;
  conflictComplexity: number;
  producibility: number;
  culturalResonance: number;
  composite: number;
}

interface IdeaCardProps {
  ideaStrId: string;
  headline: string;
  premise: string;
  technique: string;
  status: "alive" | "eliminated" | "critiqued" | "promoted";
  scores?: RubricScores;
}

const TECHNIQUE_LABELS: Record<string, string> = {
  scamper: "SCAMPER",
  whatif: "ماذا لو؟",
  reversal: "انعكاس",
  mashup: "مزج",
  constraint_removal: "رفع قيود",
};

const STATUS_STYLES: Record<string, string> = {
  alive: "border-white/15 bg-white/5 text-white",
  eliminated: "border-red-500/20 bg-red-500/5 text-white/40 line-through",
  critiqued: "border-amber-500/30 bg-amber-500/8 text-white",
  promoted: "border-green-500/40 bg-green-500/10 text-white",
};

const STATUS_LABELS: Record<string, string> = {
  alive: "قيد التقييم",
  eliminated: "مُستبعد",
  critiqued: "مُنتقد",
  promoted: "مُرشّح",
};

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 text-white/50 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 70
              ? "bg-green-400"
              : score >= 50
                ? "bg-amber-400"
                : "bg-red-400"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-8 text-right text-white/60">{score}</span>
    </div>
  );
}

export function IdeaCard({
  ideaStrId,
  headline,
  premise,
  technique,
  status,
  scores,
}: IdeaCardProps) {
  return (
    <div
      dir="rtl"
      data-testid={`idea-card-${ideaStrId}`}
      className={`rounded-2xl border p-4 space-y-3 transition-all ${STATUS_STYLES[status] ?? STATUS_STYLES["alive"]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-white/30">{ideaStrId}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
              {TECHNIQUE_LABELS[technique] ?? technique}
            </span>
          </div>
          <h3 className="font-semibold text-sm leading-snug">{headline}</h3>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
            status === "promoted"
              ? "bg-green-500/20 text-green-300"
              : status === "eliminated"
                ? "bg-red-500/20 text-red-300"
                : status === "critiqued"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-white/10 text-white/50"
          }`}
        >
          {STATUS_LABELS[status] ?? status}
        </span>
      </div>

      <p className="text-xs text-white/60 leading-relaxed line-clamp-3">
        {premise}
      </p>

      {scores && (
        <div className="space-y-1.5 pt-1 border-t border-white/8">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/40">Scores</span>
            <span
              className={`text-xs font-bold ${
                scores.composite >= 70
                  ? "text-green-400"
                  : scores.composite >= 50
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {scores.composite.toFixed(0)} / 100
            </span>
          </div>
          <ScoreBar label="أصالة" score={scores.originality} />
          <ScoreBar label="ملاءمة جمهور" score={scores.audienceFit} />
          <ScoreBar label="صدى ثقافي" score={scores.culturalResonance} />
        </div>
      )}
    </div>
  );
}

"use client";

const PHASES = [
  { id: "divergent", label: "تفريع", en: "Divergent", icon: "🌿" },
  { id: "convergent", label: "تقاطع", en: "Convergent", icon: "🎯" },
  { id: "critique", label: "نقد", en: "Critique", icon: "⚔️" },
  { id: "synthesis", label: "تركيب", en: "Synthesis", icon: "✨" },
] as const;

type PhaseId = (typeof PHASES)[number]["id"];

type SessionStatus =
  | "planning"
  | "divergent"
  | "convergent"
  | "critique"
  | "synthesis"
  | "done"
  | "error";

function getPhaseState(
  phaseId: PhaseId,
  sessionStatus: SessionStatus
): "pending" | "active" | "done" {
  const order: (SessionStatus | PhaseId)[] = [
    "planning",
    "divergent",
    "convergent",
    "critique",
    "synthesis",
    "done",
  ];
  const phaseIdx = order.indexOf(phaseId);
  const statusIdx = order.indexOf(sessionStatus);
  if (statusIdx < phaseIdx) return "pending";
  if (statusIdx === phaseIdx) return "active";
  return "done";
}

interface PhaseProgressProps {
  status: SessionStatus;
  ideasCount?: number;
  survivorsCount?: number;
  conceptsCount?: number;
}

export function PhaseProgress({
  status,
  ideasCount = 0,
  survivorsCount = 0,
  conceptsCount = 0,
}: PhaseProgressProps) {
  return (
    <div
      dir="rtl"
      className="flex items-center gap-2 overflow-x-auto pb-2"
      data-testid="phase-progress"
    >
      {PHASES.map((phase, idx) => {
        const state = getPhaseState(phase.id, status);
        return (
          <div key={phase.id} className="flex items-center gap-2 shrink-0">
            <div
              className={`flex flex-col items-center gap-1 rounded-2xl border px-4 py-3 min-w-[90px] transition-all ${
                state === "done"
                  ? "border-green-500/40 bg-green-500/10 text-green-400"
                  : state === "active"
                    ? "border-blue-500/60 bg-blue-500/15 text-blue-300 shadow-[0_0_16px_rgba(59,130,246,0.2)]"
                    : "border-white/10 bg-white/5 text-white/40"
              }`}
            >
              <span className="text-xl">{phase.icon}</span>
              <span className="text-xs font-medium">{phase.label}</span>
              {state === "done" && phase.id === "divergent" && (
                <span className="text-[10px] opacity-70">
                  {ideasCount} فكرة
                </span>
              )}
              {state === "done" && phase.id === "convergent" && (
                <span className="text-[10px] opacity-70">
                  {survivorsCount} ناجٍ
                </span>
              )}
              {state === "done" && phase.id === "synthesis" && (
                <span className="text-[10px] opacity-70">
                  {conceptsCount} concept
                </span>
              )}
              {state === "active" && (
                <div className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
              )}
            </div>
            {idx < PHASES.length - 1 && (
              <div
                className={`h-px w-8 ${state === "done" ? "bg-green-500/40" : "bg-white/10"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

import { IdeaCard } from "../../_components/IdeaCard";
import { PhaseProgress } from "../../_components/PhaseProgress";

interface RubricScores {
  originality: number;
  thematicDepth: number;
  audienceFit: number;
  conflictComplexity: number;
  producibility: number;
  culturalResonance: number;
  composite: number;
}

interface Idea {
  id: string;
  ideaStrId: string;
  headline: string;
  premise: string;
  technique: string;
  status: "alive" | "eliminated" | "critiqued" | "promoted";
  scores: RubricScores;
}

interface Session {
  id: string;
  briefId: string;
  status:
    | "planning"
    | "divergent"
    | "convergent"
    | "critique"
    | "synthesis"
    | "done"
    | "error";
}

interface Brief {
  id: string;
  title: string;
  body: string;
}

interface SessionData {
  session: Session;
  brief: Brief;
  ideas: Idea[];
  concepts: { concept: { id: string }; idea: { ideaStrId: string } }[];
}

type PhaseAction = "divergent" | "convergent" | "critique" | "synthesis" | null;

const NEXT_PHASE: Record<string, PhaseAction> = {
  planning: "divergent",
  divergent: "convergent",
  convergent: "critique",
  critique: "synthesis",
  synthesis: null,
  done: null,
  error: null,
};

const PHASE_LABELS: Record<string, string> = {
  divergent: "تشغيل مرحلة التفريع",
  convergent: "تشغيل مرحلة التقاطع",
  critique: "تشغيل مرحلة النقد",
  synthesis: "تشغيل مرحلة التركيب",
};

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [data, setData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/brainstorm/sessions/${id}`, {
        credentials: "same-origin",
      });
      const payload = (await res.json()) as {
        success: boolean;
        data?: SessionData;
        error?: string;
      };
      if (!payload.success || !payload.data) {
        throw new Error(payload.error ?? "فشل تحميل الجلسة");
      }
      setData(payload.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تحميل الجلسة");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  async function runPhase(phase: PhaseAction) {
    if (!phase) return;
    setIsRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/brainstorm/sessions/${id}/${phase}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
      });
      const payload = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? `فشل تشغيل مرحلة ${phase}`);
      }
      await loadSession();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تشغيل المرحلة");
    } finally {
      setIsRunning(false);
    }
  }

  if (isLoading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-black/90 flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-white/50 text-sm">جاري تحميل الجلسة...</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-black/90 p-6 flex items-center justify-center"
      >
        <div className="text-red-400 text-sm">
          {error ?? "الجلسة غير موجودة"}
        </div>
      </main>
    );
  }

  const { session, brief, ideas, concepts } = data;
  const nextPhase = NEXT_PHASE[session.status] ?? null;
  const survivorsCount = ideas.filter(
    (i) =>
      i.status === "alive" ||
      i.status === "critiqued" ||
      i.status === "promoted"
  ).length;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black/90 p-6"
      data-testid="session-page"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/brain-storm-ai"
              className="text-white/40 hover:text-white/70 text-xs mb-2 block transition-colors"
            >
              ← العصف الذهني
            </Link>
            <h1 className="text-2xl font-bold text-white">{brief.title}</h1>
            <p className="text-white/50 text-sm mt-1 line-clamp-2">
              {brief.body}
            </p>
          </div>

          {session.status === "done" && (
            <Link
              href={`/brain-storm-ai/sessions/${id}/concepts`}
              data-testid="view-concepts-link"
              className="shrink-0 rounded-xl bg-green-600 hover:bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              عرض الـ Concepts ({concepts.length})
            </Link>
          )}
        </div>

        <PhaseProgress
          status={session.status}
          ideasCount={ideas.length}
          survivorsCount={survivorsCount}
          conceptsCount={concepts.length}
        />

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {nextPhase && (
          <button
            onClick={() => runPhase(nextPhase)}
            disabled={isRunning}
            data-testid={`run-phase-${nextPhase}`}
            className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-white font-medium text-sm transition-colors"
          >
            {isRunning ? "جاري التشغيل..." : PHASE_LABELS[nextPhase]}
          </button>
        )}

        {ideas.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-white mb-4">
              الأفكار ({ideas.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ideas.map((idea) => (
                <IdeaCard
                  key={idea.id}
                  ideaStrId={idea.ideaStrId}
                  headline={idea.headline}
                  premise={idea.premise}
                  technique={idea.technique}
                  status={idea.status}
                  scores={idea.scores}
                />
              ))}
            </div>
          </div>
        )}

        {session.status === "planning" && ideas.length === 0 && (
          <div className="text-center py-16 text-white/40 text-sm">
            ابدأ بتشغيل مرحلة التفريع لتوليد الأفكار
          </div>
        )}
      </div>
    </main>
  );
}

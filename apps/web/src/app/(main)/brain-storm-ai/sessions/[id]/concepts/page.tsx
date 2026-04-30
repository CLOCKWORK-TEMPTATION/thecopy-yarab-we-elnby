"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { DossierViewer } from "../../../_components/DossierViewer";

interface DossierSections {
  logline: string;
  premise: string;
  themes: string;
  characters: string;
  conflictMap: string;
  plotArc: string;
  audienceGenre: string;
  producibilityBrief: string;
  productionNotes: string;
}

interface ConceptEntry {
  concept: {
    id: string;
    dossierMd: string;
    dossierJson: DossierSections;
  };
  idea: {
    id: string;
    ideaStrId: string;
    headline: string;
  };
}

export default function ConceptsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [concepts, setConcepts] = useState<ConceptEntry[]>([]);
  const [briefTitle, setBriefTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/brainstorm/sessions/${id}/concepts`, {
          credentials: "same-origin",
        });
        const payload = (await res.json()) as {
          success: boolean;
          data?: {
            concepts: ConceptEntry[];
            brief?: { title: string };
            message?: string;
          };
          error?: string;
        };
        if (!payload.success || !payload.data) {
          throw new Error(payload.error ?? "فشل تحميل الـ concepts");
        }
        setConcepts(payload.data.concepts);
        setBriefTitle(payload.data.brief?.title ?? "");
        if (payload.data.concepts[0]) {
          setSelected(payload.data.concepts[0].concept.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل التحميل");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-black/90 flex items-center justify-center"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </main>
    );
  }

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-black/90 p-6">
        <div className="text-red-400 text-sm">{error}</div>
      </main>
    );
  }

  const selectedConcept = concepts.find((c) => c.concept.id === selected);

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black/90"
      data-testid="concepts-page"
    >
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-72 border-l border-white/10 bg-black/40 flex flex-col shrink-0">
          <div className="p-4 border-b border-white/10">
            <Link
              href={`/brain-storm-ai/sessions/${id}`}
              className="text-white/40 hover:text-white/70 text-xs block mb-2 transition-colors"
            >
              ← الجلسة
            </Link>
            <h1 className="text-sm font-bold text-white line-clamp-2">
              {briefTitle || "Concept Dossiers"}
            </h1>
            <p className="text-xs text-white/40 mt-0.5">
              {concepts.length} concept
            </p>
          </div>

          <div className="overflow-y-auto flex-1 p-3 space-y-2">
            {concepts.map(({ concept, idea }) => (
              <button
                key={concept.id}
                onClick={() => setSelected(concept.id)}
                data-testid={`concept-tab-${idea.ideaStrId}`}
                className={`w-full text-right rounded-xl p-3 text-xs transition-all ${
                  selected === concept.id
                    ? "bg-green-500/15 border border-green-500/30 text-white"
                    : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/8"
                }`}
              >
                <div className="font-mono text-[10px] text-white/30 mb-1">
                  {idea.ideaStrId}
                </div>
                <div className="font-medium line-clamp-2">{idea.headline}</div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-8">
          {selectedConcept ? (
            <DossierViewer
              ideaStrId={selectedConcept.idea.ideaStrId}
              headline={selectedConcept.idea.headline}
              dossierMd={selectedConcept.concept.dossierMd}
              dossierJson={selectedConcept.concept.dossierJson}
              mode="full"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-white/40 text-sm">
              اختر concept من القائمة
            </div>
          )}
        </main>
      </div>
    </main>
  );
}

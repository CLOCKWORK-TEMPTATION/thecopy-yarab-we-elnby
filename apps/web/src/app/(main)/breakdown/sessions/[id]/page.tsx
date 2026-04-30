"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";

interface SceneHeader {
  sceneNumber: number;
  type: string;
  location: string;
  timeOfDay: string;
  raw: string;
}

interface Scene {
  sceneId: string;
  header: string;
  headerData: SceneHeader;
  analysis?: {
    cast: { name: string; role: string }[];
    warnings: string[];
  };
}

interface ProjectReport {
  id: string;
  projectId: string;
  title?: string;
  scenes: Scene[];
  generatedAt?: string;
}

export default function BreakdownSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<ProjectReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");

  const loadReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/breakdown/sessions/${id}`, {
        credentials: "same-origin",
      });
      const payload = (await res.json()) as {
        success: boolean;
        data?: ProjectReport;
        error?: string;
      };
      if (payload.success && payload.data) {
        setReport(payload.data);
        setTitle(payload.data.title ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحميل");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  async function runAnalysis() {
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/breakdown/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ projectId: id }),
      });
      const payload = (await res.json()) as {
        success: boolean;
        error?: string;
      };
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "فشل التحليل");
      }
      await loadReport();
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل التحليل");
    } finally {
      setIsAnalyzing(false);
    }
  }

  if (isLoading) {
    return (
      <main
        dir="rtl"
        className="min-h-screen bg-black/90 flex items-center justify-center"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </main>
    );
  }

  const scenes: Scene[] = report?.scenes ?? [];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black/90 p-6"
      data-testid="breakdown-session-page"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/breakdown"
              className="text-white/40 hover:text-white/70 text-xs mb-2 block transition-colors"
            >
              ← Breakdown
            </Link>
            <h1 className="text-2xl font-bold text-white">
              {title || "جلسة Breakdown"}
            </h1>
            <p className="text-white/50 text-sm mt-1">{scenes.length} مشهد</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              data-testid="run-analysis-btn"
              className="rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
            >
              {isAnalyzing ? "جاري التحليل..." : "تشغيل التحليل الكامل"}
            </button>

            <Link
              href={`/breakdown/sessions/${id}/reports`}
              data-testid="view-reports-link"
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm font-medium text-white/70 transition-colors"
            >
              التقارير
            </Link>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </div>
        )}

        {scenes.length === 0 && !isLoading && (
          <div className="text-center py-16 text-white/40 text-sm">
            لا توجد مشاهد بعد. اضغط "تشغيل التحليل الكامل" لبدء التفكيك.
          </div>
        )}

        <div className="space-y-3">
          {scenes.map((scene) => (
            <Link
              key={scene.sceneId}
              href={`/breakdown/sessions/${id}/scenes/${scene.sceneId}`}
              data-testid={`scene-card-${scene.sceneId}`}
              className="block rounded-2xl border border-white/10 bg-white/5 hover:bg-white/8 p-4 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-white/30">
                      #{scene.headerData.sceneNumber}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        scene.headerData.type === "INT"
                          ? "bg-blue-500/20 text-blue-300"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {scene.headerData.type}
                    </span>
                    <span className="text-xs text-white/40">
                      {scene.headerData.timeOfDay}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {scene.headerData.location}
                  </p>
                  {scene.analysis?.cast && scene.analysis.cast.length > 0 && (
                    <p className="text-xs text-white/40">
                      {scene.analysis.cast
                        .map((c) => c.name)
                        .slice(0, 3)
                        .join(" · ")}
                      {scene.analysis.cast.length > 3 &&
                        ` +${scene.analysis.cast.length - 3}`}
                    </p>
                  )}
                </div>

                {scene.analysis?.warnings &&
                  scene.analysis.warnings.length > 0 && (
                    <span className="text-xs text-amber-400 shrink-0">
                      ⚠️ {scene.analysis.warnings.length}
                    </span>
                  )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

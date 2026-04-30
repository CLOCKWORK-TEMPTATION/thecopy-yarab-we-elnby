"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { BreakdownSheet } from "../../../../_components/BreakdownSheet";

interface SceneHeader {
  sceneNumber: number;
  type: string;
  location: string;
  timeOfDay: string;
  raw: string;
}

interface CastMember {
  name: string;
  role: string;
  age?: string;
  description?: string;
}

interface BreakdownElement {
  id: string;
  type: string;
  category: string;
  description: string;
  notes?: string;
}

interface SceneAnalysis {
  cast: CastMember[];
  props: string[];
  handProps: string[];
  costumes: string[];
  makeup: string[];
  vehicles: string[];
  stunts: string[];
  spfx: string[];
  vfx: string[];
  setDressing: string[];
  locations: string[];
  extras: string[];
  summary: string;
  warnings: string[];
  elements: BreakdownElement[];
}

interface ReportScene {
  reportSceneId: string;
  sceneId: string;
  header: string;
  content: string;
  headerData: SceneHeader;
  analysis: SceneAnalysis;
}

interface ProjectReport {
  id: string;
  projectId: string;
  title?: string;
  scenes: ReportScene[];
}

export default function SceneDetailPage({
  params,
}: {
  params: Promise<{ id: string; sceneId: string }>;
}) {
  const { id, sceneId } = use(params);
  const [scene, setScene] = useState<ReportScene | null>(null);
  const [projectTitle, setProjectTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/breakdown/sessions/${id}`, {
          credentials: "same-origin",
        });
        const payload = (await res.json()) as {
          success: boolean;
          data?: ProjectReport;
          error?: string;
        };
        if (!payload.success || !payload.data) {
          throw new Error(payload.error ?? "فشل التحميل");
        }
        const found = payload.data.scenes.find((s) => s.sceneId === sceneId);
        if (!found) {
          throw new Error("المشهد غير موجود");
        }
        setScene(found);
        setProjectTitle(payload.data.title ?? "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "فشل التحميل");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, sceneId]);

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

  if (error || !scene) {
    return (
      <main dir="rtl" className="min-h-screen bg-black/90 p-6">
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300"
        >
          {error ?? "المشهد غير موجود"}
        </div>
      </main>
    );
  }

  const emptyAnalysis: SceneAnalysis = {
    cast: [],
    props: [],
    handProps: [],
    costumes: [],
    makeup: [],
    vehicles: [],
    stunts: [],
    spfx: [],
    vfx: [],
    setDressing: [],
    locations: [],
    extras: [],
    summary: "",
    warnings: [],
    elements: [],
  };

  const analysis: SceneAnalysis = scene.analysis ?? emptyAnalysis;

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black/90 p-6"
      data-testid="scene-detail-page"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <Link
            href={`/breakdown/sessions/${id}`}
            className="text-white/40 hover:text-white/70 text-xs mb-2 block transition-colors"
          >
            ← {projectTitle || "الجلسة"}
          </Link>
          <div className="flex items-center gap-3">
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
            <h1 className="text-xl font-bold text-white">
              {scene.headerData.location}
            </h1>
            <span className="text-sm text-white/40">
              {scene.headerData.timeOfDay}
            </span>
          </div>
        </div>

        {scene.content && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-sm text-white/60 whitespace-pre-wrap leading-relaxed">
              {scene.content}
            </p>
          </div>
        )}

        <BreakdownSheet sceneHeader={scene.header} analysis={analysis} />
      </div>
    </main>
  );
}

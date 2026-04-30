"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";

import { ReportTabs } from "../../../_components/ReportTabs";

interface SceneHeader {
  sceneNumber: number;
  type: string;
  location: string;
  timeOfDay: string;
  raw: string;
}

interface ReportScene {
  sceneId: string;
  header: string;
  headerData: SceneHeader;
  analysis?: {
    cast?: { name: string; role: string; age?: string; description?: string }[];
    props?: string[];
    handProps?: string[];
    locations?: string[];
    warnings?: string[];
  };
}

interface ShootingDay {
  day: number;
  date?: string;
  scenes: {
    sceneNumber: number;
    location: string;
    type: string;
    timeOfDay: string;
  }[];
}

interface ProjectReport {
  id: string;
  projectId: string;
  title?: string;
  scenes: ReportScene[];
  schedule?: ShootingDay[];
}

export default function ReportsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<ProjectReport | null>(null);
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
        setReport(payload.data);
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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </main>
    );
  }

  if (error) {
    return (
      <main dir="rtl" className="min-h-screen bg-black/90 p-6">
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </div>
      </main>
    );
  }

  const scenes = report?.scenes ?? [];

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black/90 p-6"
      data-testid="reports-page"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <Link
            href={`/breakdown/sessions/${id}`}
            className="text-white/40 hover:text-white/70 text-xs mb-2 block transition-colors"
          >
            ← الجلسة
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {report?.title ? `تقارير: ${report.title}` : "التقارير"}
          </h1>
          <p className="text-white/50 text-sm mt-1">{scenes.length} مشهد</p>
        </div>

        {scenes.length === 0 ? (
          <div className="text-center py-16 text-white/40 text-sm">
            لا توجد مشاهد محللة بعد. ارجع إلى الجلسة وشغّل التحليل الكامل.
          </div>
        ) : (
          <ReportTabs scenes={scenes} schedule={report?.schedule ?? []} />
        )}
      </div>
    </main>
  );
}

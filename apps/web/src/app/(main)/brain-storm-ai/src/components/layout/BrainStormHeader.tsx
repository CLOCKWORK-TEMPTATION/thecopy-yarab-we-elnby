"use client";

/**
 * الصفحة: brain-storm-ai / BrainStormHeader
 * الهوية: رأس تحليلي شبكي مع إبراز إحصائي واضح ضمن نفس لغة المنصة الداكنة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات الصفحة المحقونة من الغلاف الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import type { BrainstormAgentStats, Session } from "../../types";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface BrainStormHeaderProps {
  agentStats: BrainstormAgentStats;
  error: string | null;
  currentSession: Session | null;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/8 bg-white/6 px-4 py-2 text-center">
      <p className="text-[11px] text-white/42">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

export default function BrainStormHeader({
  agentStats,
  error,
  currentSession,
}: BrainStormHeaderProps) {
  return (
    <CardSpotlight className="mb-8 overflow-hidden rounded-[28px] border border-white/8 bg-black/24 p-6 text-center shadow-[0_18px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl md:p-8">
      <div className="space-y-5">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold tracking-[0.32em] text-white/38">
            MULTI-AGENT IDEATION
          </p>
          <h1 className="bg-gradient-to-r from-blue-400 via-violet-300 to-pink-300 bg-clip-text text-4xl font-bold text-transparent md:text-5xl">
            منصة العصف الذهني الذكي
          </h1>
          <p className="mx-auto max-w-3xl text-base leading-8 text-white/68 md:text-lg">
            طبقة موحدة للحوار بين الوكلاء، تخطيط الأطوار، واستعادة الجلسات ضمن
            نفس الهوية الداكنة للمنصة مع نبرة شبكية أكثر حيوية.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <StatPill label="إجمالي الوكلاء" value={String(agentStats.total)} />
          <StatPill label="وكلاء RAG" value={String(agentStats.withRAG)} />
          <StatPill
            label="متوسط التعقيد"
            value={`${(agentStats.averageComplexity * 100).toFixed(0)}%`}
          />
          <StatPill
            label="ذاكرة/استرجاع"
            value={String(agentStats.withMemory)}
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-right text-sm leading-7 text-red-100">
            {error}
          </div>
        ) : null}

        {currentSession ? (
          <div className="rounded-2xl border border-blue-400/14 bg-blue-400/10 p-4 text-right">
            <p className="text-sm font-semibold text-white">
              الجلسة الحالية: {currentSession.brief}
            </p>
            <p className="mt-2 text-sm leading-7 text-white/62">
              الحالة: {currentSession.status} | المرحلة: {currentSession.phase}
            </p>
          </div>
        ) : null}
      </div>
    </CardSpotlight>
  );
}

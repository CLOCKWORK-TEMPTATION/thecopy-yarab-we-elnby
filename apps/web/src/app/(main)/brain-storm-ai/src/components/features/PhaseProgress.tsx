"use client";

/**
 * @module PhaseProgress
 * @description مؤشر تقدم المراحل مع تفاصيل الوكلاء النشطين
 *
 * السبب: يوفر تغذية راجعة بصرية واضحة للمستخدم
 * عن تقدم جلسة العصف الذهني عبر المراحل الخمسة
 */

import type { PhaseDisplayInfo, BrainstormPhase } from "../../types";

interface PhaseProgressProps {
  phases: PhaseDisplayInfo[];
  activePhase: BrainstormPhase;
  progressPercent: string;
  isLoading: boolean;
}

export function PhaseProgress({
  phases,
  activePhase,
  progressPercent,
  isLoading,
}: PhaseProgressProps) {
  return (
    <div className="space-y-4">
      {/* شريط التقدم الكلي */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground font-cairo">
            التقدم الكلي
          </span>
          <span className="text-sm text-white/55 font-cairo">
            {progressPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-white/6 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* مراحل فردية */}
      <div className="space-y-1.5">
        {phases.map((phase) => {
          const isActive = phase.id === activePhase;
          const isCompleted = phase.id < activePhase;
          const isPending = phase.id > activePhase;

          return (
            <div
              key={phase.id}
              className={`flex items-center gap-3 p-2.5 rounded-[22px] transition ${
                isActive
                  ? "bg-primary/10 border border-primary/30"
                  : isCompleted
                    ? "bg-green-50 dark:bg-green-950/20"
                    : "bg-white/6"
              }`}
            >
              {/* مؤشر الحالة */}
              <div
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isCompleted
                      ? "bg-green-500 text-white"
                      : "bg-white/6 text-white/55"
                }`}
              >
                {isCompleted ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  phase.id
                )}
              </div>

              {/* معلومات المرحلة */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium font-cairo ${
                      isPending ? "text-white/55" : "text-foreground"
                    }`}
                  >
                    {phase.name}
                  </span>
                  {isActive && isLoading && (
                    <div className="inline-block animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-primary" />
                  )}
                </div>
                <span className="text-xs text-white/55 font-cairo">
                  {phase.agentCount} وكيل
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

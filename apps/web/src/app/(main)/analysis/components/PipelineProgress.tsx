"use client";

import { Progress } from "@/components/ui/progress";

interface Props {
  progress: number;
  status: "idle" | "running" | "completed" | "failed" | "cancelled";
}

export function PipelineProgress({ progress, status }: Props) {
  const label =
    status === "running"
      ? "قيد التحليل"
      : status === "completed"
        ? "اكتمل"
        : status === "failed"
          ? "فشل"
          : status === "cancelled"
            ? "تم الإلغاء"
            : "لم يبدأ";
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-headline text-base font-medium text-white/90">
          خط أنابيب التحليل
        </h3>
        <span className="text-xs text-white/55">
          {label} · {progress}%
        </span>
      </div>
      <Progress value={progress} className="w-full" />
    </div>
  );
}

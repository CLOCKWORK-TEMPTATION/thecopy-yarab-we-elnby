"use client";

/**
 * الصفحة: directors-studio / ProjectStats
 * الهوية: بطاقات إحصائية تنفيذية ذات طابع زجاجي داكن متسق مع shell الإخراجي
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات PageLayout المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { memo, useMemo, type ReactNode } from "react";
import { Film, Users, Camera, CheckCircle } from "lucide-react";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
}

const StatCard = memo(function StatCard({
  title,
  value,
  icon,
  description,
}: StatCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[26px] border border-white/8 bg-black/22 p-5 backdrop-blur-xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-[var(--page-accent)]">
            {icon}
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white/55">{title}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-4xl font-bold tracking-tight text-white">
            {value}
          </div>
          {description ? (
            <p className="mt-2 text-xs leading-6 text-white/48">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </CardSpotlight>
  );
});

interface ProjectStatsProps {
  totalScenes: number;
  totalCharacters: number;
  totalShots: number;
  completedScenes: number;
}

function ProjectStats({
  totalScenes,
  totalCharacters,
  totalShots,
  completedScenes,
}: ProjectStatsProps) {
  const completionPercentage = useMemo(() => {
    if (totalScenes === 0) return 0;
    return Math.round((completedScenes / totalScenes) * 100);
  }, [completedScenes, totalScenes]);

  return (
    <div
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      data-testid="project-stats"
    >
      <StatCard
        title="إجمالي المشاهد"
        value={totalScenes}
        icon={<Film className="w-5 h-5" />}
        description="في السيناريو الحالي"
      />
      <StatCard
        title="الشخصيات"
        value={totalCharacters}
        icon={<Users className="w-5 h-5" />}
        description="شخصيات رئيسية وثانوية"
      />
      <StatCard
        title="اللقطات المخططة"
        value={totalShots}
        icon={<Camera className="w-5 h-5" />}
        description="لقطة تم تخطيطها"
      />
      <StatCard
        title="مشاهد مكتملة"
        value={`${completedScenes}/${totalScenes}`}
        icon={<CheckCircle className="w-5 h-5" />}
        description={`${completionPercentage}% مكتمل`}
      />
    </div>
  );
}

export default memo(ProjectStats);

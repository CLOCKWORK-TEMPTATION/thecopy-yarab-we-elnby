"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

import { useApp } from "../../context/AppContext";

export function DashboardView() {
  const { user, scripts, recordings } = useApp();

  const averageScore =
    recordings.length > 0
      ? Math.round(
          recordings.reduce((sum, recording) => sum + recording.score, 0) /
            recordings.length
        )
      : 0;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white">
          📊 مرحباً، {user?.name ?? "ضيف"}!
        </h2>
        <Badge
          variant="secondary"
          className="mt-2 bg-white/8 text-white/85 border-white/8"
        >
          عضو منذ أكتوبر 2025
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/[0.04] border-white/8">
          <CardHeader>
            <CardTitle className="text-lg text-white">📝 النصوص</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-400">{scripts.length}</p>
            <p className="text-white/55 text-sm">نص تم تحليله</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/8">
          <CardHeader>
            <CardTitle className="text-lg text-white">🎤 التسجيلات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-green-400">
              {recordings.length}
            </p>
            <p className="text-white/55 text-sm">تسجيل محفوظ</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/8">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              ⭐ متوسط التقييم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-purple-400">
              {averageScore}%
            </p>
            <p className="text-white/55 text-sm">من تحليل الأداء</p>
          </CardContent>
        </Card>

        <Card className="bg-white/[0.04] border-white/8">
          <CardHeader>
            <CardTitle className="text-lg text-white">
              ⏱️ ساعات التدريب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-orange-400">12.5</p>
            <p className="text-white/55 text-sm">ساعة تدريب</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

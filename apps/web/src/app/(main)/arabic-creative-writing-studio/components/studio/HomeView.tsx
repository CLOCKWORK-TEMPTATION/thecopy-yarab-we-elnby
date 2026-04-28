"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import {
  FEATURED_DAILY_PROMPT,
  ACTIVE_WEEKLY_CHALLENGE,
} from "../../lib/featured-content";

import type { CreativeProject } from "../../types";

interface HomeViewProps {
  projects: CreativeProject[];
  onCreateNewProject: () => void;
  onOpenProject: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onStartDailyPrompt: () => void;
  onStartWeeklyChallenge: () => void;
  onNavigateToLibrary: () => void;
}

export function HomeView({
  projects,
  onCreateNewProject,
  onOpenProject,
  onDeleteProject,
  onStartDailyPrompt,
  onStartWeeklyChallenge,
  onNavigateToLibrary,
}: HomeViewProps) {
  return (
    <div className="text-center py-10 md:py-12 text-white">
      <h2 className="text-4xl font-bold mb-6">مرحباً بك في عالم الإبداع</h2>
      <p className="text-xl text-white/62 mb-8">
        ابدأ رحلتك الإبداعية مع أكثر من 114 محفز كتابة احترافي
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className="cursor-pointer hover:shadow-xl transition-shadow border-white/8 bg-black/14 text-right"
          onClick={onNavigateToLibrary}
        >
          <CardContent className="p-6">
            <div className="text-4xl mb-4">📚</div>
            <CardTitle className="mb-2 text-white">مكتبة المحفزات</CardTitle>
            <CardDescription className="text-white/55">
              استكشف مجموعة متنوعة من المحفزات الإبداعية
            </CardDescription>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:shadow-xl transition-shadow border-white/8 bg-black/14 text-right"
          onClick={onCreateNewProject}
        >
          <CardContent className="p-6">
            <div className="text-4xl mb-4">✍️</div>
            <CardTitle className="mb-2 text-white">ابدأ الكتابة</CardTitle>
            <CardDescription className="text-white/55">
              أنشئ مشروع جديد وابدأ رحلة الإبداع
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-black/14 text-right">
          <CardContent className="p-6">
            <div className="text-4xl mb-4">📝</div>
            <CardTitle className="mb-2 text-white">محفز اليوم</CardTitle>
            <CardDescription className="text-white/55">
              {FEATURED_DAILY_PROMPT.prompt.title}
            </CardDescription>
            <p className="mt-3 text-sm leading-6 text-white/68">
              {FEATURED_DAILY_PROMPT.prompt.description}
            </p>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={onStartDailyPrompt}
            >
              افتح محفز اليوم
            </Button>
          </CardContent>
        </Card>
        <Card className="border-white/8 bg-black/14 text-right">
          <CardContent className="p-6">
            <div className="text-4xl mb-4">🏆</div>
            <CardTitle className="mb-2 text-white">التحدي الأسبوعي</CardTitle>
            <CardDescription className="text-white/55">
              {ACTIVE_WEEKLY_CHALLENGE.title}
            </CardDescription>
            <p className="mt-3 text-sm leading-6 text-white/68">
              {ACTIVE_WEEKLY_CHALLENGE.description}
            </p>
            <Button
              className="mt-4 w-full"
              variant="outline"
              onClick={onStartWeeklyChallenge}
            >
              ابدأ التحدي الآن
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 max-w-5xl mx-auto text-right">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-white">المشاريع المحفوظة</h3>
          <span className="text-sm text-white/45">
            {projects.length} مشروع محفوظ على الخادم المحلي
          </span>
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects
              .slice()
              .sort(
                (left, right) =>
                  right.updatedAt.getTime() - left.updatedAt.getTime()
              )
              .slice(0, 4)
              .map((project) => (
                <Card
                  key={project.id}
                  className="text-right border-white/8 bg-black/14"
                >
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">
                          {project.title}
                        </h4>
                        <p className="text-sm text-white/45">
                          آخر تحديث: {project.updatedAt.toLocaleString("ar-EG")}
                        </p>
                      </div>
                      <span className="text-xs rounded-full bg-purple-500/15 text-purple-200 px-3 py-1">
                        {project.wordCount} كلمة
                      </span>
                    </div>

                    <p className="text-sm text-white/62 line-clamp-3">
                      {project.content || "لم يبدأ المستخدم الكتابة بعد."}
                    </p>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => onDeleteProject(project.id)}
                      >
                        حذف
                      </Button>
                      <Button onClick={() => onOpenProject(project.id)}>
                        فتح المشروع
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : (
          <Card className="max-w-3xl mx-auto border-white/8 bg-black/14">
            <CardContent className="p-6 text-center text-white/52">
              أول مشروع تحفظه سيظهر هنا تلقائياً لتستعيده من أي إعادة تحميل
              للصفحة.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

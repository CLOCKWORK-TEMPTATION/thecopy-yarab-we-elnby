"use client";

import {
  Clapperboard,
  Camera,
  Film,
  Users,
  Layers,
  Move3D,
  Sparkles,
  Play,
  Plus,
  Settings,
  LayoutDashboard,
  Video,
  Lightbulb,
  Palette,
  BookOpen,
  Clock,
  ArrowLeft,
} from "lucide-react";
import dynamic from "next/dynamic";
import React, { useState, useMemo } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProjects } from "@/hooks/useProject";

import type { Project } from "@/types/api";

// Dynamically import heavy components
const SpatialScenePlanner = dynamic(
  () => import("@/components/ui/spatial-scene-planner"),
  {
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-[var(--app-surface)] rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-accent)] mx-auto mb-4"></div>
          <p className="text-[var(--app-text-muted)]">
            جاري تحميل مخطط المشهد...
          </p>
        </div>
      </div>
    ),
    ssr: false,
  }
);

const AIShotLibrary = dynamic(() => import("@/components/ui/ai-shot-library"), {
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-[var(--app-surface)] rounded-lg">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--app-accent)] mx-auto mb-4"></div>
        <p className="text-[var(--app-text-muted)]">
          جاري تحميل مكتبة اللقطات...
        </p>
      </div>
    </div>
  ),
  ssr: false,
});

// Feature cards data
const FEATURES = [
  {
    id: "scene-planner",
    title: "مخطط المشهد المكاني",
    titleEn: "Spatial Scene Planner",
    description: "تخطيط ثلاثي الأبعاد للمشاهد مع محاكاة الكاميرا",
    icon: Move3D,
    color: "from-[var(--app-accent)] to-[var(--app-accent)]/70",
    status: "available",
  },
  {
    id: "shot-library",
    title: "مكتبة اللقطات الذكية",
    titleEn: "AI Shot Library",
    description: "بحث ذكي في اللقطات المرجعية من أفلام عالمية",
    icon: Film,
    color: "from-[var(--app-accent)]/80 to-[var(--app-accent)]/50",
    status: "available",
  },
  {
    id: "storyboard",
    title: "لوحة القصة",
    titleEn: "Storyboard",
    description: "إنشاء وتحرير لوحات القصة بالذكاء الاصطناعي",
    icon: Layers,
    color: "from-[var(--app-accent)]/60 to-[var(--app-accent)]/40",
    status: "coming-soon",
  },
  {
    id: "actors",
    title: "إدارة الممثلين",
    titleEn: "Actor Management",
    description: "ملاحظات الأداء وتوجيهات الإخراج",
    icon: Users,
    color: "from-[var(--app-accent)]/70 to-[var(--app-accent)]/50",
    status: "coming-soon",
  },
  {
    id: "lighting",
    title: "تصميم الإضاءة",
    titleEn: "Lighting Design",
    description: "محاكاة الإضاءة ومخططات الإنارة",
    icon: Lightbulb,
    color: "from-[var(--app-accent)]/80 to-[var(--app-accent)]/60",
    status: "coming-soon",
  },
  {
    id: "color",
    title: "لوحة الألوان",
    titleEn: "Color Palette",
    description: "تصميم المزاج البصري والألوان",
    icon: Palette,
    color: "from-[var(--app-accent)]/90 to-[var(--app-accent)]/70",
    status: "coming-soon",
  },
];

// Stats are computed dynamically inside the component from real API data

function renderFeatureContent(activeFeature: string): React.ReactNode {
  switch (activeFeature) {
    case "scene-planner":
      return (
        <div className="h-[calc(100vh-200px)]">
          <SpatialScenePlanner sceneName="مشهد 1 - الافتتاحية" />
        </div>
      );
    case "shot-library":
      return (
        <div className="h-[calc(100vh-200px)]">
          <AIShotLibrary />
        </div>
      );
    default:
      return null;
  }
}

function ActiveFeatureHeader({
  activeFeature,
  onBack,
}: {
  activeFeature: string;
  onBack: () => void;
}) {
  const feature = FEATURES.find((f) => f.id === activeFeature);
  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            العودة
          </Button>
          <div className="h-6 w-px bg-border" />
          {feature && (
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-lg bg-gradient-to-br ${feature.color}`}
              >
                <feature.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-semibold">{feature.title}</h1>
                <p className="text-xs text-white/55">{feature.titleEn}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function DashboardTab({
  projects,
  onFeatureSelect,
}: {
  projects: Project[];
  onFeatureSelect: (id: string) => void;
}) {
  return (
    <TabsContent value="dashboard" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.filter((f) => f.status === "available").map((feature) => (
          <Card
            key={feature.id}
            className="group cursor-pointer card-interactive hover:shadow-xl transition-all duration-300"
            onClick={() => onFeatureSelect(feature.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <Badge
                  variant="secondary"
                  className="bg-[var(--app-accent)]/20 text-[var(--app-accent)]"
                >
                  <Play className="h-3 w-3 ml-1" />
                  متاح
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg mb-1">{feature.title}</CardTitle>
              <CardDescription className="text-xs mb-2">
                {feature.titleEn}
              </CardDescription>
              <p className="text-sm text-white/55">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-[var(--app-border)] bg-[var(--app-surface)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[var(--app-text)]">
                <Clock className="h-5 w-5 text-[var(--app-text-muted)]" />
                النشاط الأخير
              </CardTitle>
              <CardDescription>آخر التحديثات على مشاريعك</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              عرض الكل
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projects.length === 0 ? (
              <div className="text-center py-8 text-[var(--app-text-muted)]">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>لا يوجد نشاط حتى الآن</p>
                <p className="text-xs mt-1">ابدأ بإنشاء مشروع جديد</p>
              </div>
            ) : (
              projects.slice(0, 3).map((project) => (
                <div
                  key={project.id}
                  className="flex items-center gap-4 p-3 rounded-lg hover:bg-[var(--app-surface)]/50 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-[var(--app-accent)]/10">
                    <Clapperboard className="h-4 w-4 text-[var(--app-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--app-text)]">
                      {project.title}
                    </p>
                    <p className="text-sm text-[var(--app-text-muted)]">
                      آخر تحديث:{" "}
                      {new Date(project.updatedAt).toLocaleDateString("ar-EG")}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--app-text-muted)]">
                    {new Date(project.createdAt).toLocaleDateString("ar-EG")}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

function ToolsTab({
  onFeatureSelect,
}: {
  onFeatureSelect: (id: string) => void;
}) {
  return (
    <TabsContent value="tools" className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {FEATURES.map((feature) => (
          <Card
            key={feature.id}
            className={`group cursor-pointer transition-all duration-300 ${feature.status === "available" ? "card-interactive hover:shadow-xl" : "opacity-70"}`}
            onClick={() =>
              feature.status === "available" && onFeatureSelect(feature.id)
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg ${feature.status === "available" ? "group-hover:scale-110" : ""} transition-transform duration-300`}
                >
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                {feature.status === "available" ? (
                  <Badge
                    variant="secondary"
                    className="bg-[var(--app-accent)]/20 text-[var(--app-accent)]"
                  >
                    <Play className="h-3 w-3 ml-1" />
                    متاح
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 ml-1" />
                    قريباً
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-lg mb-1">{feature.title}</CardTitle>
              <CardDescription className="text-xs mb-2">
                {feature.titleEn}
              </CardDescription>
              <p className="text-sm text-[var(--app-text-muted)]">
                {feature.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </TabsContent>
  );
}

function ProjectsTab({
  projects,
  projectsLoading,
}: {
  projects: Project[];
  projectsLoading: boolean;
}) {
  return (
    <TabsContent value="projects" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--app-text)]">مشاريعك</h2>
          <p className="text-[var(--app-text-muted)]">
            إدارة مشاريع الأفلام والمسلسلات
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 ml-2" />
          مشروع جديد
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectsLoading ? (
          <div className="col-span-full text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--app-accent)] mx-auto mb-4" />
            <p className="text-[var(--app-text-muted)]">
              جاري تحميل المشاريع...
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Clapperboard className="h-12 w-12 mx-auto mb-4 text-[var(--app-text-muted)] opacity-50" />
            <p className="text-lg font-medium text-[var(--app-text)]">
              لا توجد مشاريع بعد
            </p>
            <p className="text-sm text-[var(--app-text-muted)] mt-1">
              اضغط على &quot;مشروع جديد&quot; للبدء
            </p>
          </div>
        ) : (
          projects.map((project) => (
            <Card key={project.id} className="card-interactive">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>
                      تم الإنشاء:{" "}
                      {new Date(project.createdAt).toLocaleDateString("ar-EG")}
                    </CardDescription>
                  </div>
                  <Badge variant="default">نشط</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-sm text-[var(--app-text-muted)]">
                    آخر تحديث:{" "}
                    {new Date(project.updatedAt).toLocaleDateString("ar-EG")}
                  </p>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Camera className="h-4 w-4 ml-1" />
                      المشاهد
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Video className="h-4 w-4 ml-1" />
                      اللقطات
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </TabsContent>
  );
}

function StudioHeroHeader({
  stats,
}: {
  stats: { label: string; value: string; icon: React.ElementType }[];
}) {
  return (
    <header className="relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/90 via-indigo-900/80 to-violet-900/90" />
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px),
                             radial-gradient(circle at 75% 75%, white 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div className="relative container mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-right">
            <div className="flex items-center gap-4 justify-center md:justify-start mb-4">
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-xl">
                <Clapperboard className="h-12 w-12 text-white" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                  استوديو المخرجين
                </h1>
                <p className="text-xl text-white/80">Directors Studio</p>
              </div>
            </div>
            <p className="text-lg text-white/70 max-w-2xl">
              أدوات متقدمة للإخراج السينمائي - تخطيط المشاهد، مكتبة اللقطات
              الذكية، وأكثر
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat) => (
              <Card
                key={stat.label}
                className="bg-white/10 backdrop-blur-sm border-white/20 text-white"
              >
                <CardContent className="p-4 text-center">
                  <stat.icon className="h-5 w-5 mx-auto mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs opacity-70">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}

export const DirectorsStudio: React.FC = () => {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  const { data: projectsData, isLoading: projectsLoading } = useProjects();
  const projects: Project[] = useMemo(() => projectsData ?? [], [projectsData]);

  const STATS = useMemo(
    () => [
      {
        label: "المشاريع النشطة",
        value: String(projects.length),
        icon: Clapperboard,
      },
      { label: "المشاهد", value: "—", icon: Camera },
      { label: "اللقطات", value: "—", icon: Video },
      { label: "ساعات العمل", value: "—", icon: Clock },
    ],
    [projects]
  );

  if (activeFeature) {
    return (
      <div className="min-h-screen bg-background">
        <ActiveFeatureHeader
          activeFeature={activeFeature}
          onBack={() => setActiveFeature(null)}
        />
        <main>{renderFeatureContent(activeFeature)}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-[var(--app-surface)]">
      <StudioHeroHeader stats={STATS} />

      <main className="container mx-auto px-4 py-8">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="bg-card border">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              لوحة التحكم
            </TabsTrigger>
            <TabsTrigger value="tools" className="gap-2">
              <Sparkles className="h-4 w-4" />
              الأدوات
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Clapperboard className="h-4 w-4" />
              المشاريع
            </TabsTrigger>
          </TabsList>

          <DashboardTab
            projects={projects}
            onFeatureSelect={setActiveFeature}
          />
          <ToolsTab onFeatureSelect={setActiveFeature} />
          <ProjectsTab projects={projects} projectsLoading={projectsLoading} />
        </Tabs>
      </main>

      <footer className="border-t mt-8">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[var(--app-text-muted)]">
            <p>استوديو المخرجين - أدوات إخراج سينمائي متقدمة</p>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm">
                <BookOpen className="h-4 w-4 ml-2" />
                الدليل
              </Button>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 ml-2" />
                الإعدادات
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DirectorsStudio;

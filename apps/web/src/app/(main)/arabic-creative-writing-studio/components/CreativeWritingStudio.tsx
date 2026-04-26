"use client";

/**
 * الصفحة: arabic-creative-writing-studio / CreativeWritingStudio
 * الهوية: قلب الاستوديو الأدبي داخل قشرة إبداعية داكنة متسقة مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-surface, --page-border
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";

import { GeminiService } from "@/ai/gemini-service";
import {
  exportProjectDocument,
  type ExportFormat,
} from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import {
  ACTIVE_WEEKLY_CHALLENGE,
  FEATURED_DAILY_PROMPT,
  type FeaturedWeeklyChallenge,
} from "@/app/(main)/arabic-creative-writing-studio/lib/featured-content";
import {
  CreativePrompt,
  CreativeProject,
  TextAnalysis,
  AppSettings,
  CreativeGenre,
  WritingTechnique,
} from "@/app/(main)/arabic-creative-writing-studio/types";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import type { PromptLibraryProps } from "./PromptLibrary";
import type { WritingEditorProps } from "./WritingEditor";
import type { SettingsPanelProps } from "./SettingsPanel";
import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const PromptLibrary = dynamic<PromptLibraryProps>(
  () =>
    import("./PromptLibrary").then((mod) => ({ default: mod.PromptLibrary })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

const WritingEditor = dynamic<WritingEditorProps>(
  () =>
    import("./WritingEditor").then((mod) => ({ default: mod.WritingEditor })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

const SettingsPanel = dynamic<SettingsPanelProps>(
  () =>
    import("./SettingsPanel").then((mod) => ({ default: mod.SettingsPanel })),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

interface CreativeWritingStudioProps {
  initialSettings?: Partial<AppSettings>;
}

type StudioView = "home" | "library" | "editor" | "analysis" | "settings";

interface PersistedCreativeProject extends Omit<
  CreativeProject,
  "createdAt" | "updatedAt"
> {
  createdAt: string;
  updatedAt: string;
}

interface CreativeWritingStudioSnapshot {
  currentView: StudioView;
  currentProject: PersistedCreativeProject | null;
  selectedPrompt: CreativePrompt | null;
  projects: PersistedCreativeProject[];
  settings: AppSettings;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: "ar",
  theme: "dark",
  textDirection: "rtl",
  fontSize: "medium",
  autoSave: true,
  autoSaveInterval: 30000,
  geminiModel: "gemini-2.5-pro",
  geminiTemperature: 0.7,
  geminiMaxTokens: 8192,
};

function restoreProject(
  project: PersistedCreativeProject | null | undefined
): CreativeProject | null {
  if (!project) return null;
  return {
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
}

function persistProject(project: CreativeProject): PersistedCreativeProject {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

function buildSettings(initialSettings?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  };
}

export const CreativeWritingStudio: React.FC<CreativeWritingStudioProps> = ({
  initialSettings,
}) => {
  const [currentView, setCurrentView] = useState<StudioView>("home");
  const [currentProject, setCurrentProject] = useState<CreativeProject | null>(
    null
  );
  const [selectedPrompt, setSelectedPrompt] = useState<CreativePrompt | null>(
    null
  );
  const [projects, setProjects] = useState<CreativeProject[]>([]);
  const [activeChallenge, setActiveChallenge] =
    useState<FeaturedWeeklyChallenge | null>(null);
  const [settings, setSettings] = useState<AppSettings>(() =>
    buildSettings(initialSettings)
  );
  const [isRemoteStateReady, setIsRemoteStateReady] = useState(false);
  const [geminiService, setGeminiService] = useState<GeminiService | null>(
    null
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
  } | null>(null);
  const geminiApiKey = settings.geminiApiKey?.trim() ?? "";
  const isGeminiConfigured = geminiApiKey.length > 0;
  const analysisBlockedReason =
    "تحليل النص يحتاج مفتاح Gemini صالحاً. أضفه من الإعدادات أولاً ثم عُد إلى المحرر.";

  useEffect(() => {
    if (isGeminiConfigured) {
      const service = new GeminiService(geminiApiKey);
      setGeminiService(service);
      return;
    }

    setGeminiService(null);
  }, [geminiApiKey, isGeminiConfigured, settings.geminiModel]);

  const showNotification = useCallback(
    (type: "success" | "error" | "warning" | "info", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    void loadRemoteAppState<CreativeWritingStudioSnapshot>(
      "arabic-creative-writing-studio"
    )
      .then((snapshot) => {
        if (cancelled || !snapshot) return;

        setCurrentView(snapshot.currentView ?? "home");
        setProjects(
          (snapshot.projects ?? [])
            .map((project) => restoreProject(project))
            .filter((project): project is CreativeProject => Boolean(project))
        );
        setCurrentProject(restoreProject(snapshot.currentProject));
        setSelectedPrompt(snapshot.selectedPrompt ?? null);
        setSettings(buildSettings(snapshot.settings));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setIsRemoteStateReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRemoteStateReady) return;

    const timeoutId = window.setTimeout(() => {
      void persistRemoteAppState<CreativeWritingStudioSnapshot>(
        "arabic-creative-writing-studio",
        {
          currentView,
          currentProject: currentProject
            ? persistProject(currentProject)
            : null,
          selectedPrompt,
          projects: projects.map(persistProject),
          settings,
        }
      ).catch(() => {});
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentView,
    currentProject,
    isRemoteStateReady,
    projects,
    selectedPrompt,
    settings,
  ]);

  const saveProject = useCallback(
    (project: CreativeProject) => {
      const projectToSave = {
        ...project,
        updatedAt: new Date(),
      };

      setProjects((previous) => {
        const existingIndex = previous.findIndex((p) => p.id === project.id);
        if (existingIndex >= 0) {
          const nextProjects = [...previous];
          nextProjects[existingIndex] = projectToSave;
          return nextProjects;
        }
        return [...previous, projectToSave];
      });
      setCurrentProject(projectToSave);
      showNotification("success", "تم حفظ المشروع بنجاح 🎉");
    },
    [showNotification]
  );

  const createNewProject = useCallback((prompt?: CreativePrompt) => {
    const newProject: CreativeProject = {
      id: `project_${Date.now()}`,
      title: prompt ? prompt.title : "مشروع جديد",
      content: "",
      promptId: prompt?.id ?? "",
      genre: prompt?.genre ?? "cross_genre",
      wordCount: 0,
      characterCount: 0,
      paragraphCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: prompt?.tags ?? [],
      isCompleted: false,
    };

    setCurrentProject(newProject);
    setSelectedPrompt(prompt ?? null);
    setActiveChallenge(null);
    setCurrentView("editor");
  }, []);

  const startDailyPrompt = useCallback(() => {
    createNewProject(FEATURED_DAILY_PROMPT.prompt);
    showNotification(
      "info",
      `تم فتح محرر جديد بمحفز اليوم: ${FEATURED_DAILY_PROMPT.prompt.title}`
    );
  }, [createNewProject, showNotification]);

  const startWeeklyChallenge = useCallback(() => {
    const prompt = ACTIVE_WEEKLY_CHALLENGE.prompt;
    const challengeProject: CreativeProject = {
      id: `challenge_${Date.now()}`,
      title: prompt.title,
      content: "",
      promptId: prompt.id,
      genre: prompt.genre,
      wordCount: 0,
      characterCount: 0,
      paragraphCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [...prompt.tags, ACTIVE_WEEKLY_CHALLENGE.id],
      isCompleted: false,
    };

    setCurrentProject(challengeProject);
    setSelectedPrompt(prompt);
    setActiveChallenge(ACTIVE_WEEKLY_CHALLENGE);
    setCurrentView("editor");
    showNotification(
      "info",
      `تم فتح ${ACTIVE_WEEKLY_CHALLENGE.title} مع المتطلبات داخل المحرر.`
    );
  }, [showNotification]);

  const openProject = useCallback(
    (projectId: string) => {
      const project = projects.find((item) => item.id === projectId);
      if (!project) {
        showNotification("error", "المشروع المطلوب لم يعد متوفراً");
        return;
      }

      setCurrentProject(project);
      setSelectedPrompt(null);
      setActiveChallenge(null);
      setCurrentView("editor");
      showNotification("info", "تم فتح المشروع المحفوظ");
    },
    [projects, showNotification]
  );

  const deleteProject = useCallback(
    (projectId: string) => {
      setProjects((previous) =>
        previous.filter((project) => project.id !== projectId)
      );

      if (currentProject?.id === projectId) {
        setCurrentProject(null);
        setActiveChallenge(null);
      }

      showNotification("info", "تم حذف المشروع من الأرشيف المحلي للمساحة");
    },
    [currentProject?.id, showNotification]
  );

  const analyzeText = useCallback(
    async (text: string): Promise<TextAnalysis | null> => {
      if (!geminiService) {
        showNotification("warning", analysisBlockedReason);
        return null;
      }

      setLoading(true);
      try {
        const response = await geminiService.analyzeText(text);
        if (response.success) {
          showNotification("success", "تم تحليل النص بنجاح 📊");
          return response.data;
        }
        showNotification("error", response.error ?? "فشل في تحليل النص");
        return null;
      } catch {
        showNotification("error", "حدث خطأ أثناء تحليل النص");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [analysisBlockedReason, geminiService, showNotification]
  );

  const enhancePrompt = useCallback(
    async (
      prompt: string,
      genre: CreativeGenre,
      technique: WritingTechnique
    ) => {
      if (!geminiService) {
        showNotification("warning", "يرجى إعداد مفتاح Gemini API أولاً");
        return null;
      }

      setLoading(true);
      try {
        const response = await geminiService.enhancePrompt(
          prompt,
          genre,
          technique
        );
        if (response.success) {
          showNotification("success", "تم تحسين المحفز بنجاح 🚀");
          return response.data;
        }
        showNotification("error", response.error ?? "فشل في تحسين المحفز");
        return null;
      } catch {
        showNotification("error", "حدث خطأ أثناء تحسين المحفز");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [geminiService, showNotification]
  );

  const exportProject = useCallback(
    (project: CreativeProject, format: ExportFormat) => {
      const result = exportProjectDocument(project, format);

      showNotification(result.success ? "success" : "error", result.message);

      return result;
    },
    [showNotification]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      showNotification("success", "تم حفظ الإعدادات ⚙️");
    },
    [showNotification]
  );

  const renderHeader = () => (
    <div className="p-4 md:p-6">
      <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/30 p-5 backdrop-blur-2xl md:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between text-white">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
              CREATIVE WRITING SHELL
            </p>
            <h1 className="mt-2 text-3xl font-bold md:text-4xl">
              استوديو الكتابة الإبداعية
            </h1>
            <p className="mt-3 max-w-3xl text-white/62 leading-7">
              مساحة كتابة وإلهام وتحليل داخل هوية بصرية داكنة موحدة مع المنصة.
            </p>
          </div>

          <nav className="flex flex-wrap gap-2 justify-end">
            <Button
              onClick={() => setCurrentView("home")}
              variant={currentView === "home" ? "secondary" : "ghost"}
              className={
                currentView === "home"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              🏠 الرئيسية
            </Button>
            <Button
              onClick={() => setCurrentView("library")}
              variant={currentView === "library" ? "secondary" : "ghost"}
              className={
                currentView === "library"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              📚 مكتبة المحفزات
            </Button>
            <Button
              onClick={() => setCurrentView("editor")}
              variant={currentView === "editor" ? "secondary" : "ghost"}
              className={
                currentView === "editor"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              ✍️ المحرر
            </Button>
            <Button
              onClick={() => setCurrentView("settings")}
              variant={currentView === "settings" ? "secondary" : "ghost"}
              className={
                currentView === "settings"
                  ? "bg-white text-black hover:bg-white"
                  : "text-white hover:bg-white/10"
              }
            >
              ⚙️ الإعدادات
            </Button>
          </nav>
        </div>
      </CardSpotlight>
    </div>
  );

  const renderNotification = () => {
    if (!notification) return null;

    const variants = {
      success: "default" as const,
      error: "destructive" as const,
      warning: "default" as const,
      info: "default" as const,
    };

    return (
      <div className="fixed top-4 left-4 z-50">
        <CardSpotlight className="overflow-hidden rounded-[20px] border border-white/8 bg-black/28 backdrop-blur-2xl">
          <Alert
            variant={variants[notification.type]}
            className="border-0 bg-transparent"
          >
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        </CardSpotlight>
      </div>
    );
  };

  const renderMainContent = () => {
    switch (currentView) {
      case "home":
        return (
          <div className="text-center py-10 md:py-12 text-white">
            <h2 className="text-4xl font-bold mb-6">
              مرحباً بك في عالم الإبداع
            </h2>
            <p className="text-xl text-white/62 mb-8">
              ابدأ رحلتك الإبداعية مع أكثر من 114 محفز كتابة احترافي
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card
                className="cursor-pointer hover:shadow-xl transition-shadow border-white/8 bg-black/14 text-right"
                onClick={() => setCurrentView("library")}
              >
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">📚</div>
                  <CardTitle className="mb-2 text-white">
                    مكتبة المحفزات
                  </CardTitle>
                  <CardDescription className="text-white/55">
                    استكشف مجموعة متنوعة من المحفزات الإبداعية
                  </CardDescription>
                </CardContent>
              </Card>
              <Card
                className="cursor-pointer hover:shadow-xl transition-shadow border-white/8 bg-black/14 text-right"
                onClick={() => createNewProject()}
              >
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">✍️</div>
                  <CardTitle className="mb-2 text-white">
                    ابدأ الكتابة
                  </CardTitle>
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
                    onClick={startDailyPrompt}
                  >
                    افتح محفز اليوم
                  </Button>
                </CardContent>
              </Card>
              <Card className="border-white/8 bg-black/14 text-right">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">🏆</div>
                  <CardTitle className="mb-2 text-white">
                    التحدي الأسبوعي
                  </CardTitle>
                  <CardDescription className="text-white/55">
                    {ACTIVE_WEEKLY_CHALLENGE.title}
                  </CardDescription>
                  <p className="mt-3 text-sm leading-6 text-white/68">
                    {ACTIVE_WEEKLY_CHALLENGE.description}
                  </p>
                  <Button
                    className="mt-4 w-full"
                    variant="outline"
                    onClick={startWeeklyChallenge}
                  >
                    ابدأ التحدي الآن
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mt-10 max-w-5xl mx-auto text-right">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-white">
                  المشاريع المحفوظة
                </h3>
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
                                آخر تحديث:{" "}
                                {project.updatedAt.toLocaleString("ar-EG")}
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
                              onClick={() => deleteProject(project.id)}
                            >
                              حذف
                            </Button>
                            <Button onClick={() => openProject(project.id)}>
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
                    أول مشروع تحفظه سيظهر هنا تلقائياً لتستعيده من أي إعادة
                    تحميل للصفحة.
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case "library":
        return (
          <PromptLibrary
            onPromptSelect={(prompt: CreativePrompt) => {
              setSelectedPrompt(prompt);
              createNewProject(prompt);
            }}
            onEnhancePrompt={enhancePrompt}
            loading={loading}
          />
        );

      case "editor":
        return (
          <WritingEditor
            project={currentProject}
            selectedPrompt={selectedPrompt}
            onProjectChange={setCurrentProject}
            onSave={saveProject}
            onAnalyze={analyzeText}
            onExport={exportProject}
            onOpenSettings={() => setCurrentView("settings")}
            analysisAvailable={isGeminiConfigured}
            analysisBlockedReason={analysisBlockedReason}
            activeChallenge={activeChallenge}
            settings={settings}
            loading={loading}
          />
        );

      case "settings":
        return (
          <SettingsPanel
            settings={settings}
            onSettingsUpdate={updateSettings}
            onTestConnection={async () => {
              if (geminiService) {
                const result = await geminiService.testConnection();
                showNotification(
                  result.success ? "success" : "error",
                  result.success
                    ? "تم اختبار الاتصال بنجاح"
                    : (result.error ?? "فشل اختبار الاتصال")
                );
              } else {
                showNotification("warning", analysisBlockedReason);
              }
            }}
          />
        );

      default:
        return <div>المحتوى غير متوفر</div>;
    }
  };

  return (
    <div
      className={`relative isolate min-h-screen overflow-hidden ${settings.theme === "dark" ? "dark" : ""}`}
      dir={settings.textDirection}
      style={{
        ["--page-accent" as string]: "var(--accent-creative, #c2255c)",
        ["--page-accent-2" as string]: "var(--brand-teal, #40a5b3)",
        ["--page-surface" as string]: "rgba(11, 15, 24, 0.74)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
    >
      <NoiseBackground />
      <div className="absolute inset-0 opacity-55 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(194,37,92,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(64,165,179,0.16),transparent_34%)]" />

      <div className="relative z-10">
        {renderHeader()}
        {renderNotification()}
        <main className="container mx-auto px-4 pb-8">
          <CardSpotlight className="overflow-hidden rounded-[30px] border border-[var(--page-border)] bg-[var(--page-surface)] p-4 backdrop-blur-2xl md:p-6">
            {loading ? (
              <Dialog open={loading}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>جاري المعالجة...</DialogTitle>
                    <DialogDescription>يرجى الانتظار 🔄</DialogDescription>
                  </DialogHeader>
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
            {renderMainContent()}
          </CardSpotlight>
        </main>
      </div>
    </div>
  );
};

export default CreativeWritingStudio;

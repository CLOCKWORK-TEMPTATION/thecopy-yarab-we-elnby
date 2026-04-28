"use client";

/**
 * الصفحة: arabic-creative-writing-studio / CreativeWritingStudio
 * الهوية: قلب الاستوديو الأدبي داخل قشرة إبداعية داكنة متسقة مع المنصة
 */

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";

import { GeminiService } from "@/ai/gemini-service";
import { exportProjectDocument } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useCreativeStudio } from "../hooks/useCreativeStudio";

import { StudioHeader, StudioNotification, HomeView } from "./studio";

import type { PromptLibraryProps } from "./PromptLibrary";
import type { SettingsPanelProps } from "./SettingsPanel";
import type { WritingEditorProps } from "./WritingEditor";
import type { NotificationState } from "../types/studio";

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
  initialSettings?: import("../types").AppSettings;
}

export const CreativeWritingStudio: React.FC<CreativeWritingStudioProps> = ({
  initialSettings,
}) => {
  const [notification, setNotification] = useState<NotificationState | null>(
    null
  );
  const [geminiService, setGeminiService] = useState<GeminiService | null>(
    null
  );

  const showNotification = useCallback(
    (type: NotificationState["type"], message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 5000);
    },
    []
  );

  const {
    currentView,
    setCurrentView,
    currentProject,
    setCurrentProject,
    selectedPrompt,
    setSelectedPrompt,
    projects,
    activeChallenge,
    settings,
    loading,
    saveProject,
    createNewProject,
    startDailyPrompt,
    startWeeklyChallenge,
    openProject,
    deleteProject,
    analyzeText,
    enhancePrompt,
    exportProject,
    updateSettings,
  } = useCreativeStudio({
    initialSettings,
    geminiService,
    showNotification,
    analysisBlockedReason:
      "تحليل النص يحتاج مفتاح Gemini صالحاً. أضفه من الإعدادات أولاً ثم عُد إلى المحرر.",
    exportProjectFn: exportProjectDocument,
  });

  const geminiApiKey = settings.geminiApiKey?.trim() ?? "";
  const isGeminiConfigured = geminiApiKey.length > 0;

  useEffect(() => {
    if (isGeminiConfigured) {
      setGeminiService(new GeminiService(geminiApiKey));
    } else {
      setGeminiService(null);
    }
  }, [geminiApiKey, isGeminiConfigured, settings.geminiModel]);

  const renderMainContent = () => {
    switch (currentView) {
      case "home":
        return (
          <HomeView
            projects={projects}
            onCreateNewProject={() => createNewProject()}
            onOpenProject={openProject}
            onDeleteProject={deleteProject}
            onStartDailyPrompt={startDailyPrompt}
            onStartWeeklyChallenge={startWeeklyChallenge}
            onNavigateToLibrary={() => setCurrentView("library")}
          />
        );

      case "library":
        return (
          <PromptLibrary
            onPromptSelect={(prompt) => {
              setSelectedPrompt(prompt);
              createNewProject(prompt);
            }}
            onEnhancePrompt={(prompt, genre, technique) =>
              enhancePrompt(prompt, genre, technique)
            }
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
            analysisBlockedReason="تحليل النص يحتاج مفتاح Gemini صالحاً. أضفه من الإعدادات أولاً ثم عُد إلى المحرر."
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
                showNotification(
                  "warning",
                  "تحليل النص يحتاج مفتاح Gemini صالحاً. أضفه من الإعدادات أولاً ثم عُد إلى المحرر."
                );
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
        <StudioHeader currentView={currentView} onViewChange={setCurrentView} />
        <StudioNotification notification={notification} />
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

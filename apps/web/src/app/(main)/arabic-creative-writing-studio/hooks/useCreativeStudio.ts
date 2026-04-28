"use client";

import { useCallback, useEffect, useState } from "react";
import type { GeminiService } from "@/ai/gemini-service";
import type { ExportFormat } from "@/app/(main)/arabic-creative-writing-studio/lib/export-project";
import {
  ACTIVE_WEEKLY_CHALLENGE,
  FEATURED_DAILY_PROMPT,
  type FeaturedWeeklyChallenge,
} from "@/app/(main)/arabic-creative-writing-studio/lib/featured-content";
import type {
  CreativeProject,
  CreativePrompt,
  AppSettings,
  CreativeGenre,
  WritingTechnique,
  TextAnalysis,
} from "@/app/(main)/arabic-creative-writing-studio/types";
import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";
import type {
  CreativeWritingStudioSnapshot,
  PersistedCreativeProject,
  StudioView,
  NotificationState,
} from "../types/studio";
import { buildTextAnalysis } from "../lib/studio/text-analysis";
import { restoreProject, persistProject } from "../lib/studio/project-helpers";

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

function buildSettings(initialSettings?: Partial<AppSettings>): AppSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...initialSettings,
  };
}

interface UseCreativeStudioProps {
  initialSettings?: Partial<AppSettings>;
  geminiService: GeminiService | null;
  showNotification: (type: NotificationState["type"], message: string) => void;
  analysisBlockedReason: string;
  exportProjectFn: (
    project: CreativeProject,
    format: ExportFormat
  ) => { success: boolean; message: string };
}

export function useCreativeStudio({
  initialSettings,
  geminiService,
  showNotification,
  analysisBlockedReason,
  exportProjectFn,
}: UseCreativeStudioProps) {
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
  const [loading, setLoading] = useState<boolean>(false);

  // Load persisted state
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
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (!cancelled) {
          setIsRemoteStateReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-save state
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
      ).catch(() => {
        /* empty */
      });
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
          return buildTextAnalysis(text, response.data);
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
      const result = exportProjectFn(project, format);
      showNotification(result.success ? "success" : "error", result.message);
      return result;
    },
    [exportProjectFn, showNotification]
  );

  const updateSettings = useCallback(
    (newSettings: Partial<AppSettings>) => {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      showNotification("success", "تم حفظ الإعدادات ⚙️");
    },
    [showNotification]
  );

  return {
    currentView,
    setCurrentView,
    currentProject,
    setCurrentProject,
    selectedPrompt,
    setSelectedPrompt,
    projects,
    activeChallenge,
    setActiveChallenge,
    settings,
    isRemoteStateReady,
    loading,
    setLoading,
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
  };
}

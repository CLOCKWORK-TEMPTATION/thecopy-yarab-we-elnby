"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  FolderOpen,
  Import,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useCurrentProject } from "@/app/(main)/directors-studio/lib/ProjectContext";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCreateProject, useProjects } from "@/hooks/useProject";
import { DirectorsEditorConfigManager } from "@/lib/directors-editor/config-manager";
import { directorsEditorLogger } from "@/lib/directors-editor/logger";

import type { Project } from "@/types/api";

const normalizeProject = (project: Project): Project => ({
  ...project,
  scriptContent: project.scriptContent ?? null,
});

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return fallback;
};

export function NoProjectSection() {
  const router = useRouter();
  const { toast } = useToast();
  const { setProject, project: currentProject } = useCurrentProject();
  const projectsQuery = useProjects();
  const createProject = useCreateProject();

  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );

  const projects = useMemo<Project[]>(
    () =>
      Array.isArray(projectsQuery.data)
        ? projectsQuery.data.map(normalizeProject)
        : [],
    [projectsQuery.data]
  );

  const selectedProject = useMemo(() => {
    if (selectedProjectId) {
      return (
        projects.find((project) => project.id === selectedProjectId) ?? null
      );
    }
    return currentProject ? normalizeProject(currentProject) : null;
  }, [currentProject, projects, selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId && currentProject?.id) {
      setSelectedProjectId(currentProject.id);
    }
  }, [currentProject?.id, selectedProjectId]);

  const openEditorWithProject = useCallback(
    (project: Project, options?: { importIntent?: boolean }) => {
      const targetUrl = DirectorsEditorConfigManager.buildEditorUrl(
        project.id,
        {
          importIntent: options?.importIntent ?? false,
        }
      );

      setProject(project);
      directorsEditorLogger.info({
        event: "directors-studio-open-editor",
        message: "Opening editor with an active project context.",
        data: {
          projectId: project.id,
          projectTitle: project.title,
          importIntent: options?.importIntent ?? false,
          targetUrl,
        },
      });
      router.push(targetUrl);
    },
    [router, setProject]
  );

  const selectProject = useCallback(
    (project: Project) => {
      setProject(project);
      setSelectedProjectId(project.id);

      directorsEditorLogger.info({
        event: "directors-studio-project-selected",
        message: "Existing project selected from no-project entry state.",
        data: {
          projectId: project.id,
          projectTitle: project.title,
        },
      });

      toast({
        title: "تم اختيار المشروع",
        description: `المشروع النشط الآن: ${project.title}`,
      });
    },
    [setProject, toast]
  );

  const createNewProject = useCallback(
    async (openInEditor: boolean) => {
      const title = newProjectTitle.trim();
      if (!title) {
        toast({
          title: "عنوان المشروع مطلوب",
          description: "أدخل عنوانًا واضحًا قبل إنشاء المشروع.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await createProject.mutateAsync({
          title,
          scriptContent: "",
        });
        const created = response.data ? normalizeProject(response.data) : null;

        if (!created?.id) {
          throw new Error("تعذر قراءة بيانات المشروع بعد الإنشاء.");
        }

        setProject(created);
        setSelectedProjectId(created.id);
        setNewProjectTitle("");

        directorsEditorLogger.info({
          event: "directors-studio-project-created",
          message: "Project created successfully from no-project entry state.",
          data: {
            projectId: created.id,
            projectTitle: created.title,
            openInEditor,
          },
        });

        toast({
          title: "تم إنشاء المشروع",
          description: `تم إنشاء "${created.title}" بنجاح.`,
        });

        if (openInEditor) {
          openEditorWithProject(created);
        }
      } catch (error) {
        const message = resolveErrorMessage(
          error,
          "تعذر إنشاء المشروع في الوقت الحالي."
        );
        directorsEditorLogger.error({
          event: "directors-studio-project-create-failed",
          message: "Project creation failed from no-project entry state.",
          data: { error: message },
        });
        toast({
          title: "تعذر إنشاء المشروع",
          description: message,
          variant: "destructive",
        });
      }
    },
    [createProject, newProjectTitle, openEditorWithProject, setProject, toast]
  );

  const openSelectedProjectInEditor = useCallback(() => {
    if (!selectedProject) {
      toast({
        title: "لا يوجد مشروع محدد",
        description: "اختر مشروعًا موجودًا أو أنشئ مشروعًا جديدًا أولًا.",
        variant: "destructive",
      });
      return;
    }

    openEditorWithProject(selectedProject);
  }, [openEditorWithProject, selectedProject, toast]);

  const openImportFlow = useCallback(() => {
    if (!selectedProject) {
      toast({
        title: "لا يوجد مشروع صالح للاستيراد",
        description: "حدّد مشروعًا أولًا ليتم فتح المحرر في وضع الاستيراد.",
        variant: "destructive",
      });
      return;
    }

    openEditorWithProject(selectedProject, { importIntent: true });
  }, [openEditorWithProject, selectedProject, toast]);

  const isBusy = createProject.isPending;
  const hasProjects = projects.length > 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/24 p-6 text-right backdrop-blur-xl md:p-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/8 text-[var(--page-accent)]">
              <Clapperboard className="h-6 w-6" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-white/60">
              <Sparkles className="h-3.5 w-3.5" />
              نقطة بداية تشغيلية
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
              DIRECTOR WORKSPACE
            </p>
            <h2 className="text-3xl font-bold text-white md:text-4xl">
              ابدأ مشروعك من هنا
            </h2>
            <p className="max-w-3xl text-sm leading-8 text-white/68 md:text-base">
              لا توجد جلسة مشروع نشطة حاليًا. أنشئ مشروعًا جديدًا أو اختر
              مشروعًا موجودًا ثم انتقل إلى المحرر ضمن حالة مشروع صالحة.
            </p>
          </div>
        </div>
      </CardSpotlight>

      <div className="grid gap-4 md:grid-cols-2">
        <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/18 p-5 backdrop-blur-xl md:p-6">
          <div className="space-y-4 text-right">
            <h3 className="text-base font-semibold text-white">
              إنشاء مشروع جديد
            </h3>
            <Input
              value={newProjectTitle}
              onChange={(event) => setNewProjectTitle(event.target.value)}
              placeholder="مثال: الحلقة الأولى - مراجعة إخراجية"
              dir="rtl"
              data-testid="input-new-project-title"
              disabled={isBusy}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => {
                  void createNewProject(false);
                }}
                disabled={isBusy}
                data-testid="button-create-project"
                className="w-full"
              >
                <PlusCircle className="ml-2 h-4 w-4" />
                إنشاء المشروع
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void createNewProject(true);
                }}
                disabled={isBusy}
                data-testid="button-create-project-open-editor"
                className="w-full"
              >
                <Clapperboard className="ml-2 h-4 w-4" />
                إنشاء وفتح المحرر
              </Button>
            </div>
          </div>
        </CardSpotlight>

        <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/18 p-5 backdrop-blur-xl md:p-6">
          <div className="space-y-4 text-right">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">
                اختيار مشروع موجود
              </h3>
              {projectsQuery.isLoading && (
                <span className="text-xs text-white/50">جارٍ التحميل...</span>
              )}
            </div>

            {!hasProjects && !projectsQuery.isLoading && (
              <div className="rounded-2xl border border-amber-600/30 bg-amber-950/20 px-3 py-3 text-xs text-amber-200">
                لا توجد مشاريع محفوظة لهذا الحساب حتى الآن.
              </div>
            )}

            {hasProjects && (
              <div className="max-h-52 space-y-2 overflow-auto pr-1">
                {projects.map((project) => {
                  const isSelected = selectedProject?.id === project.id;
                  return (
                    <button
                      key={project.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-right transition-colors ${isSelected ? "border-emerald-500/70 bg-emerald-500/10 text-white" : "border-white/10 bg-white/5 text-white/80 hover:border-white/20"}`}
                      onClick={() => selectProject(project)}
                      data-testid={`button-select-existing-project-${project.id}`}
                    >
                      <span className="truncate">{project.title}</span>
                      {isSelected ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <FolderOpen className="h-4 w-4 text-white/45" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                onClick={openSelectedProjectInEditor}
                disabled={!selectedProject}
                data-testid="button-open-selected-project-editor"
                className="w-full"
              >
                <Clapperboard className="ml-2 h-4 w-4" />
                فتح المحرر
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={openImportFlow}
                disabled={!selectedProject}
                data-testid="button-import-project-editor"
                className="w-full"
              >
                <Import className="ml-2 h-4 w-4" />
                استيراد داخل المحرر
              </Button>
            </div>
          </div>
        </CardSpotlight>
      </div>

      <CardSpotlight className="overflow-hidden rounded-[28px] border border-amber-600/20 bg-amber-950/25 p-4 backdrop-blur-xl md:p-5">
        <div className="space-y-3 text-right">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" />
            <h3 className="text-sm font-semibold text-amber-200">
              مسار الدخول الرسمي إلى المحرر
            </h3>
          </div>
          <p className="text-xs leading-relaxed text-amber-100/70">
            يتم فتح المحرر فقط ضمن حالة مشروع صالحة مع تمرير عقد query ثابت
            (`projectId` + `source`) لضمان اتساق الحالة بين الاستوديو والمحرر.
          </p>
        </div>
      </CardSpotlight>
    </div>
  );
}

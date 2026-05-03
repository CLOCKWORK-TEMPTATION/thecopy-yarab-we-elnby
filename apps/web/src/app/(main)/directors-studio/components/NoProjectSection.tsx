"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clapperboard,
  FolderOpen,
  Import,
  LogIn,
  PlayCircle,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { useCurrentProject } from "@/app/(main)/directors-studio/lib/ProjectContext";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCreateProject, useProjects } from "@/hooks/useProject";
import { isAuthRequiredError } from "@/lib/api";
import { DirectorsEditorConfigManager } from "@/lib/directors-editor/config-manager";
import { directorsEditorLogger } from "@/lib/directors-editor/logger";

import {
  createDirectorsStudioDemoProject,
  seedDirectorsStudioDemoEditorDraft,
} from "../lib/demoProject";

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

function HeroCard() {
  return (
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
            لا توجد جلسة مشروع نشطة حاليًا. أنشئ مشروعًا جديدًا أو اختر مشروعًا
            موجودًا ثم انتقل إلى المحرر ضمن حالة مشروع صالحة.
          </p>
        </div>
      </div>
    </CardSpotlight>
  );
}

function NewProjectCard({
  newProjectTitle,
  isBusy,
  onTitleChange,
  onCreate,
  onCreateAndOpen,
}: {
  newProjectTitle: string;
  isBusy: boolean;
  onTitleChange: (value: string) => void;
  onCreate: () => void;
  onCreateAndOpen: () => void;
}) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/18 p-5 backdrop-blur-xl md:p-6">
      <div className="space-y-4 text-right">
        <h3 className="text-base font-semibold text-white">إنشاء مشروع جديد</h3>
        <Input
          value={newProjectTitle}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="مثال: الحلقة الأولى - مراجعة إخراجية"
          dir="rtl"
          data-testid="input-new-project-title"
          disabled={isBusy}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={onCreate}
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
            onClick={onCreateAndOpen}
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
  );
}

function DemoProjectCard({
  isBusy,
  onOpenDemo,
  onOpenDemoInEditor,
}: {
  isBusy: boolean;
  onOpenDemo: () => void;
  onOpenDemoInEditor: () => void;
}) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-emerald-500/20 bg-emerald-950/16 p-5 backdrop-blur-xl md:p-6">
      <div className="space-y-4 text-right">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-300">
            <PlayCircle className="h-5 w-5" />
          </div>
          <h3 className="text-base font-semibold text-white">
            مشروع تجريبي جاهز
          </h3>
        </div>
        <p className="text-sm leading-7 text-white/65">
          يفتح مشروعًا محليًا ببيانات مشاهد وشخصيات ونص سيناريو صالح للاختبار
          دون تسجيل دخول.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenDemo}
            disabled={isBusy}
            data-testid="button-open-demo-project"
            className="w-full"
          >
            <FolderOpen className="ml-2 h-4 w-4" />
            فتح التجربة
          </Button>
          <Button
            type="button"
            onClick={onOpenDemoInEditor}
            disabled={isBusy}
            data-testid="button-open-demo-project-editor"
            className="w-full"
          >
            <Clapperboard className="ml-2 h-4 w-4" />
            فتح المحرر
          </Button>
        </div>
      </div>
    </CardSpotlight>
  );
}

function ExistingProjectCard({
  projects,
  selectedProject,
  isLoading,
  hasRequestedProjects,
  onLoadProjects,
  onSelectProject,
  onOpenEditor,
  onImport,
}: {
  projects: Project[];
  selectedProject: Project | null;
  isLoading: boolean;
  hasRequestedProjects: boolean;
  onLoadProjects: () => void;
  onSelectProject: (project: Project) => void;
  onOpenEditor: () => void;
  onImport: () => void;
}) {
  const hasProjects = projects.length > 0;
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/18 p-5 backdrop-blur-xl md:p-6">
      <div className="space-y-4 text-right">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">
            اختيار مشروع موجود
          </h3>
          {isLoading && (
            <span className="text-xs text-white/50">جارٍ التحميل...</span>
          )}
        </div>
        {!hasRequestedProjects && (
          <Button
            type="button"
            variant="outline"
            onClick={onLoadProjects}
            data-testid="button-load-existing-projects"
            className="w-full"
          >
            <FolderOpen className="ml-2 h-4 w-4" />
            عرض المشاريع المحفوظة
          </Button>
        )}
        {hasRequestedProjects && !hasProjects && !isLoading && (
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
                  onClick={() => onSelectProject(project)}
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
            onClick={onOpenEditor}
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
            onClick={onImport}
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
  );
}

function AuthRequiredCard({
  message,
  onLogin,
  onOpenDemo,
}: {
  message: string;
  onLogin: () => void;
  onOpenDemo: () => void;
}) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-red-500/25 bg-red-950/18 p-4 backdrop-blur-xl md:p-5">
      <div className="space-y-3 text-right">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-300" />
          <h3 className="text-sm font-semibold text-red-100">
            يلزم تسجيل الدخول لإنشاء مشروع محفوظ
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-red-100/72">{message}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onOpenDemo}
            data-testid="button-auth-fallback-demo"
          >
            <PlayCircle className="ml-2 h-4 w-4" />
            فتح المشروع التجريبي
          </Button>
          <Button
            type="button"
            onClick={onLogin}
            data-testid="button-auth-fallback-login"
          >
            <LogIn className="ml-2 h-4 w-4" />
            تسجيل الدخول
          </Button>
        </div>
      </div>
    </CardSpotlight>
  );
}

function EditorEntryWarningCard() {
  return (
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
  );
}

type CreateProjectMutation = ReturnType<typeof useCreateProject>;
type ToastFn = ReturnType<typeof useToast>["toast"];
type SetProjectFn = ReturnType<typeof useCurrentProject>["setProject"];

interface CreateProjectAndOpenContext {
  title: string;
  openInEditor: boolean;
  createProject: CreateProjectMutation;
  openEditorWithProject: (
    p: Project,
    opts?: { importIntent?: boolean }
  ) => void;
  setNewProjectTitle: (v: string) => void;
  setProject: SetProjectFn;
  setSelectedProjectId: (id: string) => void;
  onAuthRequired: (message: string) => void;
  toast: ToastFn;
}

async function createProjectAndMaybeOpen(
  context: CreateProjectAndOpenContext
): Promise<void> {
  const {
    title,
    openInEditor,
    createProject,
    openEditorWithProject,
    setNewProjectTitle,
    setProject,
    setSelectedProjectId,
    onAuthRequired,
    toast,
  } = context;
  try {
    const response = await createProject.mutateAsync({
      title,
      scriptContent: "",
    });
    const created = response.data ? normalizeProject(response.data) : null;
    if (!created?.id) throw new Error("تعذر قراءة بيانات المشروع بعد الإنشاء.");
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
    if (openInEditor) openEditorWithProject(created);
  } catch (error) {
    const message = resolveErrorMessage(
      error,
      "تعذر إنشاء المشروع في الوقت الحالي."
    );
    if (isAuthRequiredError(error)) {
      onAuthRequired(message);
      toast({
        title: "يلزم تسجيل الدخول",
        description:
          "يمكن تسجيل الدخول لحفظ المشروع أو فتح المشروع التجريبي فورًا.",
        variant: "destructive",
      });
      return;
    }
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
}

export function NoProjectSection() {
  const router = useRouter();
  const { toast } = useToast();
  const { setProject, project: currentProject } = useCurrentProject();
  const [shouldLoadProjects, setShouldLoadProjects] = useState(false);
  const projectsQuery = useProjects({ enabled: shouldLoadProjects });
  const createProject = useCreateProject();

  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [authRequiredMessage, setAuthRequiredMessage] = useState<string | null>(
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
    if (selectedProjectId)
      return projects.find((p) => p.id === selectedProjectId) ?? null;
    return currentProject ? normalizeProject(currentProject) : null;
  }, [currentProject, projects, selectedProjectId]);

  /**
   * إصلاح P0-7: قبل التحويل إلى /editor نتأكد من أن المستخدم
   * مصادق. إذا لم يكن، نعرض رسالة واضحة + زر Login بدل الـ
   * silent redirect الذي وثّقه التقرير.
   *
   * نستخدم fetch خفيف إلى /api/auth/me. عند فشله بـ 401 نُحوّل
   * إلى /login مع redirect target صحيح يعود للمحرر بنفس projectId.
   */
  const isUserAuthenticated = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      // إذا تعذّر الوصول للـ endpoint نسمح بالتقدم — backend سيرد بـ
      // auth_required إن لزم، والمحرر يعرف يعالجها.
      return true;
    }
  }, []);

  const openEditorWithProject = useCallback(
    async (project: Project, options?: { importIntent?: boolean }) => {
      const isAuthenticated = await isUserAuthenticated();
      const importIntent = options?.importIntent ?? false;

      if (!isAuthenticated) {
        const loginUrl = DirectorsEditorConfigManager.buildLoginRedirectUrl(
          project.id,
          { importIntent },
        );
        directorsEditorLogger.info({
          event: "directors-studio-auth-required",
          message: "Editor opening requires authentication. Redirecting to login.",
          data: { projectId: project.id, loginUrl },
        });
        toast({
          title: "تسجيل الدخول مطلوب",
          description:
            "فتح المحرر يحتاج إلى حساب مسجَّل. سننقلك إلى صفحة الدخول الآن، وستعود مباشرة إلى المحرر بعد الدخول.",
        });
        router.push(loginUrl);
        return;
      }

      const targetUrl = DirectorsEditorConfigManager.buildEditorUrl(
        project.id,
        { importIntent },
      );
      setProject(project);
      directorsEditorLogger.info({
        event: "directors-studio-open-editor",
        message: "Opening editor with an active project context.",
        data: {
          projectId: project.id,
          projectTitle: project.title,
          importIntent,
          targetUrl,
        },
      });
      router.push(targetUrl);
    },
    [isUserAuthenticated, router, setProject, toast]
  );

  const selectProject = useCallback(
    (project: Project) => {
      setProject(project);
      setSelectedProjectId(project.id);
      directorsEditorLogger.info({
        event: "directors-studio-project-selected",
        message: "Existing project selected from no-project entry state.",
        data: { projectId: project.id, projectTitle: project.title },
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
      setAuthRequiredMessage(null);
      if (!title) {
        toast({
          title: "عنوان المشروع مطلوب",
          description: "أدخل عنوانًا واضحًا قبل إنشاء المشروع.",
          variant: "destructive",
        });
        return;
      }
      await createProjectAndMaybeOpen({
        title,
        openInEditor,
        createProject,
        openEditorWithProject,
        setNewProjectTitle,
        setProject,
        setSelectedProjectId,
        onAuthRequired: setAuthRequiredMessage,
        toast,
      });
    },
    [createProject, newProjectTitle, openEditorWithProject, setProject, toast]
  );

  const openDemoProject = useCallback(
    (openInEditor: boolean) => {
      const demoProject = createDirectorsStudioDemoProject(newProjectTitle);
      setProject(demoProject);
      setSelectedProjectId(demoProject.id);
      setNewProjectTitle("");
      setAuthRequiredMessage(null);
      seedDirectorsStudioDemoEditorDraft(demoProject);
      directorsEditorLogger.info({
        event: "directors-studio-demo-project-opened",
        message: "Guest demo project opened from no-project entry state.",
        data: {
          projectId: demoProject.id,
          projectTitle: demoProject.title,
          openInEditor,
        },
      });
      toast({
        title: "تم فتح المشروع التجريبي",
        description: "يمكن الآن تجربة الاستوديو والمحرر دون تسجيل دخول.",
      });
      if (openInEditor) {
        openEditorWithProject(demoProject);
      }
    },
    [newProjectTitle, openEditorWithProject, setProject, toast]
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <HeroCard />
      <div className="grid gap-4 lg:grid-cols-3">
        <NewProjectCard
          newProjectTitle={newProjectTitle}
          isBusy={createProject.isPending}
          onTitleChange={setNewProjectTitle}
          onCreate={() => {
            void createNewProject(false);
          }}
          onCreateAndOpen={() => {
            void createNewProject(true);
          }}
        />
        <DemoProjectCard
          isBusy={createProject.isPending}
          onOpenDemo={() => openDemoProject(false)}
          onOpenDemoInEditor={() => openDemoProject(true)}
        />
        <ExistingProjectCard
          projects={projects}
          selectedProject={selectedProject}
          isLoading={projectsQuery.isLoading}
          hasRequestedProjects={shouldLoadProjects}
          onLoadProjects={() => setShouldLoadProjects(true)}
          onSelectProject={selectProject}
          onOpenEditor={openSelectedProjectInEditor}
          onImport={openImportFlow}
        />
      </div>
      {authRequiredMessage ? (
        <AuthRequiredCard
          message={authRequiredMessage}
          onLogin={() => router.push("/login")}
          onOpenDemo={() => openDemoProject(true)}
        />
      ) : null}
      <EditorEntryWarningCard />
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import React from "react";

import {
  createDirectorsStudioDemoProject,
  isDirectorsStudioDemoProject,
  isDirectorsStudioDemoProjectId,
  seedDirectorsStudioDemoEditorDraft,
} from "@/app/(main)/directors-studio/lib/demoProject";
import { DirectorsEditorConfigManager } from "@/lib/directors-editor/config-manager";
import { directorsEditorLogger } from "@/lib/directors-editor/logger";
import {
  clearCurrentProject,
  getCurrentProject,
  setCurrentProject,
} from "@/lib/projectStore";

import type { ApiResponse, Project } from "@/lib/api-types";

const EditorApp = dynamic(
  () => import("./src/App").then((m) => ({ default: m.App })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen items-center justify-center bg-[oklch(0.145_0_0)] text-[oklch(0.985_0_0)]">
        <span className="text-sm" style={{ fontFamily: "Cairo, sans-serif" }}>
          جارٍ تحميل المحرر...
        </span>
      </div>
    ),
  }
);

let initialized = false;

function dispatchProjectSynced(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent("directors-editor:project-synced"));
}

function resolveProjectSyncErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }

  return "تعذر مزامنة المشروع المطلوب.";
}

async function fetchAndSyncProject(
  projectId: string,
  setProjectSyncError: (msg: string | null) => void,
  activeRef: { current: boolean }
): Promise<void> {
  directorsEditorLogger.info({
    event: "editor-project-sync-started",
    message: "Project sync from editor query has started.",
    data: { projectId },
  });
  setProjectSyncError(null);

  try {
    if (isDirectorsStudioDemoProjectId(projectId)) {
      const storedProject = getCurrentProject();
      const demoProject = isDirectorsStudioDemoProject(storedProject)
        ? storedProject
        : createDirectorsStudioDemoProject();

      setCurrentProject(demoProject);
      seedDirectorsStudioDemoEditorDraft(demoProject, false);
      dispatchProjectSynced();

      if (!activeRef.current) return;
      setProjectSyncError(null);

      directorsEditorLogger.info({
        event: "editor-demo-project-sync-succeeded",
        message: "Editor guest demo project synced without remote auth.",
        data: {
          projectId: demoProject.id,
          projectTitle: demoProject.title,
        },
      });
      return;
    }

    const response = await fetch(
      `/api/projects/${encodeURIComponent(projectId)}`,
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );
    const payload = (await response.json()) as ApiResponse<Project>;
    const project = payload?.data;

    if (!response.ok || !payload?.success || !project?.id) {
      const reason =
        payload?.error ?? `تعذر تحميل المشروع المطلوب (${response.status}).`;
      throw new Error(reason);
    }

    const normalizedProject: Project = {
      ...project,
      scriptContent: project.scriptContent ?? null,
    };
    setCurrentProject(normalizedProject);
    dispatchProjectSynced();

    if (!activeRef.current) return;
    setProjectSyncError(null);

    directorsEditorLogger.info({
      event: "editor-project-sync-succeeded",
      message: "Editor query project synced successfully.",
      data: {
        projectId: normalizedProject.id,
        projectTitle: normalizedProject.title,
      },
    });
  } catch (error) {
    clearCurrentProject();
    dispatchProjectSynced();

    const message = resolveProjectSyncErrorMessage(error);

    directorsEditorLogger.error({
      event: "editor-project-sync-failed",
      message: "Failed to sync editor project context from query.",
      data: { projectId, error: message },
    });

    if (!activeRef.current) return;
    setProjectSyncError(message);
  }
}

export default function EditorPage() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams?.toString() ?? "";
  const [projectSyncError, setProjectSyncError] = React.useState<string | null>(
    null
  );

  React.useEffect(() => {
    if (initialized) return;
    initialized = true;
    let isActive = true;
    let toasterElement: HTMLElement | null = null;

    void import("./src/providers").then(({ createThemeProvider }) => {
      if (!isActive) return;
      createThemeProvider({
        attribute: "class",
        defaultTheme: "dark",
        enableSystem: false,
        storageKey: "filmlane.theme",
      });
    });

    void import("./src/components/ui/toaster").then(({ createToaster }) => {
      if (!isActive || typeof document === "undefined") return;
      const toaster = createToaster();
      toasterElement = toaster.element;
      document.body.appendChild(toaster.element);
    });

    return () => {
      isActive = false;
      if (toasterElement?.isConnected) {
        toasterElement.remove();
      }
    };
  }, []);

  React.useEffect(() => {
    const config = DirectorsEditorConfigManager.getConfig();
    const params = new URLSearchParams(searchParamsKey);
    const projectId =
      params.get(config.projectQueryParam)?.trim() ??
      params.get("projectId")?.trim() ??
      "";

    if (!projectId) {
      setProjectSyncError(null);
      return;
    }

    const activeRef = { current: true };
    void fetchAndSyncProject(projectId, setProjectSyncError, activeRef);

    return () => {
      activeRef.current = false;
    };
  }, [searchParamsKey]);

  return (
    <main className="relative h-screen">
      {projectSyncError ? (
        <div
          className="pointer-events-none absolute top-4 left-1/2 z-[120] w-[min(92vw,760px)] -translate-x-1/2 rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-3 text-right text-sm text-red-100 shadow-2xl backdrop-blur-xl"
          data-testid="editor-project-sync-error"
          role="alert"
          aria-live="assertive"
        >
          فشل تحميل المشروع من رابط الاستوديو.
          <br />
          {projectSyncError}
        </div>
      ) : null}
      <EditorApp />
    </main>
  );
}

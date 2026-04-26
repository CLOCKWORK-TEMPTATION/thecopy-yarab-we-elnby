"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import React from "react";


import { DirectorsEditorConfigManager } from "@/lib/directors-editor/config-manager";
import { directorsEditorLogger } from "@/lib/directors-editor/logger";
import { clearCurrentProject, setCurrentProject } from "@/lib/projectStore";

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

export default function EditorPage() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
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

    let active = true;

    const syncProjectFromQuery = async () => {
      directorsEditorLogger.info({
        event: "editor-project-sync-started",
        message: "Project sync from editor query has started.",
        data: { projectId },
      });
      setProjectSyncError(null);

      try {
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
            payload?.error ??
            `تعذر تحميل المشروع المطلوب (${response.status}).`;
          throw new Error(reason);
        }

        const normalizedProject: Project = {
          ...project,
          scriptContent: project.scriptContent ?? null,
        };
        setCurrentProject(normalizedProject);

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("directors-editor:project-synced")
          );
        }

        if (!active) return;
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

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("directors-editor:project-synced")
          );
        }

        const message =
          error instanceof Error && error.message.trim()
            ? error.message.trim()
            : "تعذر مزامنة المشروع المطلوب.";

        directorsEditorLogger.error({
          event: "editor-project-sync-failed",
          message: "Failed to sync editor project context from query.",
          data: { projectId, error: message },
        });

        if (!active) return;
        setProjectSyncError(message);
      }
    };

    void syncProjectFromQuery();

    return () => {
      active = false;
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

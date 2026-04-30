/**
 * @fileoverview الصفحة الرئيسية لاستوديو المخرجين
 *
 * تستخدم ProjectContext للحصول على المشروع الحالي
 * وتعرض المحتوى المناسب حسب الحالة (تحميل / فارغ / محتوى).
 */
"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

import { useProjectScenes, useProjectCharacters } from "@/hooks/useProject";
import { getCurrentProject } from "@/lib/projectStore";

import { LoadingSection } from "./components/LoadingSection";
import { PageLayout } from "./components/PageLayout";
import {
  hasActiveProject,
  prepareCharacterList,
  type CharacterTrackerProps,
  type SceneCardProps,
} from "./helpers/projectSummary";
import {
  createDirectorsStudioDemoCharacters,
  createDirectorsStudioDemoScenes,
  isDirectorsStudioDemoProjectId,
} from "./lib/demoProject";
import { useCurrentProject } from "./lib/ProjectContext";

type ValidSceneStatus = "planned" | "in-progress" | "completed";
const DEFAULT_SCENE_STATUS: ValidSceneStatus = "planned";
const PROJECT_CHANGE_EVENT = "directors-studio:project-changed";

const NoProjectSection = dynamic(
  () =>
    import("./components/NoProjectSection").then((mod) => ({
      default: mod.NoProjectSection,
    })),
  { ssr: false }
);

const ProjectContent = dynamic(
  () =>
    import("./components/ProjectContent").then((mod) => ({
      default: mod.ProjectContent,
    })),
  { ssr: false }
);

function isValidSceneStatus(
  status: string | null | undefined
): status is ValidSceneStatus {
  return (
    status === "planned" || status === "in-progress" || status === "completed"
  );
}

function normalizeSceneStatus(status?: string | null): ValidSceneStatus {
  if (isValidSceneStatus(status)) {
    return status;
  }
  return DEFAULT_SCENE_STATUS;
}

export default function DirectorsStudioPage() {
  const { projectId } = useCurrentProject();
  const [observedProjectId, setObservedProjectId] = useState(projectId);

  useEffect(() => {
    setObservedProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    const syncProjectId = () => {
      setObservedProjectId(getCurrentProject()?.id ?? "");
    };

    window.addEventListener(PROJECT_CHANGE_EVENT, syncProjectId);
    window.addEventListener("storage", syncProjectId);
    return () => {
      window.removeEventListener(PROJECT_CHANGE_EVENT, syncProjectId);
      window.removeEventListener("storage", syncProjectId);
    };
  }, []);

  const effectiveProjectId = projectId || observedProjectId;
  const isDemoProject = isDirectorsStudioDemoProjectId(effectiveProjectId);
  const activeProjectKey =
    effectiveProjectId && !isDemoProject ? effectiveProjectId : undefined;

  const { data: scenes, isLoading: scenesLoading } =
    useProjectScenes(activeProjectKey);
  const { data: characters, isLoading: charactersLoading } =
    useProjectCharacters(activeProjectKey);

  const scenesList: SceneCardProps[] = useMemo(() => {
    if (isDemoProject) {
      return createDirectorsStudioDemoScenes(effectiveProjectId).map(
        (scene) => ({
          ...scene,
          status: normalizeSceneStatus(scene.status),
        })
      );
    }
    if (!Array.isArray(scenes)) return [];
    return scenes.map((scene) => ({
      ...scene,
      status: normalizeSceneStatus(scene.status),
    }));
  }, [effectiveProjectId, isDemoProject, scenes]);

  const charactersList: CharacterTrackerProps["characters"] = useMemo(() => {
    if (isDemoProject) {
      return prepareCharacterList(
        createDirectorsStudioDemoCharacters(effectiveProjectId)
      );
    }
    return prepareCharacterList(characters);
  }, [characters, effectiveProjectId, isDemoProject]);

  const isLoading = scenesLoading || charactersLoading;

  if (isLoading) {
    return (
      <main>
        <PageLayout>
          <LoadingSection />
        </PageLayout>
      </main>
    );
  }

  if (!hasActiveProject(effectiveProjectId || null)) {
    return (
      <main>
        <PageLayout>
          <NoProjectSection />
        </PageLayout>
      </main>
    );
  }

  return (
    <main>
      <PageLayout>
        <ProjectContent scenes={scenesList} characters={charactersList} />
      </PageLayout>
    </main>
  );
}

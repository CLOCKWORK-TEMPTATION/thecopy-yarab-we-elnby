/**
 * @fileoverview الصفحة الرئيسية لاستوديو المخرجين
 *
 * تستخدم ProjectContext للحصول على المشروع الحالي
 * وتعرض المحتوى المناسب حسب الحالة (تحميل / فارغ / محتوى).
 */
"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import {
  hasActiveProject,
  prepareCharacterList,
  type CharacterTrackerProps,
  type ProjectCharacterInput,
  type SceneCardProps,
} from "./helpers/projectSummary";
import { PageLayout } from "./components/PageLayout";
import { LoadingSection } from "./components/LoadingSection";
import { useProjectScenes, useProjectCharacters } from "@/hooks/useProject";
import { useCurrentProject } from "./lib/ProjectContext";

type ValidSceneStatus = "planned" | "in-progress" | "completed";
const VALID_SCENE_STATUSES: readonly ValidSceneStatus[] = [
  "planned",
  "in-progress",
  "completed",
] as const;
const DEFAULT_SCENE_STATUS: ValidSceneStatus = "planned";

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

function normalizeSceneStatus(status?: string | null): ValidSceneStatus {
  if (status && VALID_SCENE_STATUSES.includes(status as ValidSceneStatus)) {
    return status as ValidSceneStatus;
  }
  return DEFAULT_SCENE_STATUS;
}

export default function DirectorsStudioPage() {
  const { projectId } = useCurrentProject();
  const activeProjectKey = projectId || undefined;

  const { data: scenes, isLoading: scenesLoading } =
    useProjectScenes(activeProjectKey);
  const { data: characters, isLoading: charactersLoading } =
    useProjectCharacters(activeProjectKey);

  const scenesList: SceneCardProps[] = useMemo(() => {
    if (!Array.isArray(scenes)) return [];
    return scenes.map((scene) => ({
      ...scene,
      status: normalizeSceneStatus(scene.status),
    }));
  }, [scenes]);

  const charactersList: CharacterTrackerProps["characters"] = useMemo(() => {
    return prepareCharacterList(
      characters as ProjectCharacterInput | undefined
    );
  }, [characters]);

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

  if (!hasActiveProject(activeProjectKey ?? null)) {
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

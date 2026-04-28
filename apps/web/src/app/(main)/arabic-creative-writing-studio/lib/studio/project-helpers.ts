import type { CreativeProject } from "../../types";
import type { PersistedCreativeProject } from "../../types/studio";

export function restoreProject(
  project: PersistedCreativeProject | null | undefined
): CreativeProject | null {
  if (!project) return null;
  return {
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
  };
}

export function persistProject(
  project: CreativeProject
): PersistedCreativeProject {
  return {
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

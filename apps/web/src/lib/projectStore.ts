import { isUnknownRecord } from "./utils/unknown-values";

import type { Project as ApiProject } from "./api-types";

/**
 * Project store for managing current project state
 */

export interface Project extends ApiProject {
  name?: string;
  description?: string;
}

let currentProject: Project | null = null;

function parseStoredProject(stored: string): Project | null {
  const parsed: unknown = JSON.parse(stored);

  if (!isUnknownRecord(parsed)) {
    return null;
  }

  const requiredStrings = [
    "id",
    "title",
    "userId",
    "createdAt",
    "updatedAt",
  ] as const;

  if (requiredStrings.some((key) => typeof parsed[key] !== "string")) {
    return null;
  }

  if (
    parsed.scriptContent !== null &&
    typeof parsed.scriptContent !== "string"
  ) {
    return null;
  }

  return parsed as Project;
}

export function getCurrentProject(): Project | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("currentProject");
    if (stored) {
      return parseStoredProject(stored);
    }
  }
  return currentProject;
}

export function setCurrentProject(project: Project): void {
  currentProject = project;
  if (typeof window !== "undefined") {
    sessionStorage.setItem("currentProject", JSON.stringify(project));
  }
}

export function clearCurrentProject(): void {
  currentProject = null;
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("currentProject");
  }
}

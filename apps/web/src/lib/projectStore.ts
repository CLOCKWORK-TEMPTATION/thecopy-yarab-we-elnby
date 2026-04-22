import type { Project as ApiProject } from "./api-types";

/**
 * Project store for managing current project state
 */

export interface Project extends ApiProject {
  name?: string;
  description?: string;
}

let currentProject: Project | null = null;

export function getCurrentProject(): Project | null {
  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem("currentProject");
    if (stored) {
      return JSON.parse(stored);
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

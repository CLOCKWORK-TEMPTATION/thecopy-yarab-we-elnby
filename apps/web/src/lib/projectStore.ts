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

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function hasRequiredStrings(
  project: Record<string, unknown>,
  keys: readonly string[]
): boolean {
  return keys.every((key) => typeof project[key] === "string");
}

function hasValidScriptContent(project: Record<string, unknown>): boolean {
  return (
    !("scriptContent" in project) ||
    project["scriptContent"] === null ||
    typeof project["scriptContent"] === "string"
  );
}

function isApiProject(project: Record<string, unknown>): boolean {
  return (
    hasRequiredStrings(project, [
      "id",
      "title",
      "userId",
      "createdAt",
      "updatedAt",
    ]) && hasValidScriptContent(project)
  );
}

function isLegacyProject(project: Record<string, unknown>): boolean {
  return (
    typeof project["id"] === "string" &&
    isOptionalString(project["name"]) &&
    isOptionalString(project["description"])
  );
}

function getStringField(
  project: Record<string, unknown>,
  key: string,
  fallback: string
): string {
  const value = project[key];
  return typeof value === "string" ? value : fallback;
}

function toProject(project: Record<string, unknown>): Project {
  const title = getStringField(
    project,
    "title",
    getStringField(project, "name", getStringField(project, "id", "Untitled"))
  );
  const scriptContent =
    typeof project["scriptContent"] === "string" ||
    project["scriptContent"] === null
      ? project["scriptContent"]
      : null;
  const name = typeof project["name"] === "string" ? project["name"] : title;
  const description =
    typeof project["description"] === "string"
      ? project["description"]
      : undefined;

  return {
    id: getStringField(project, "id", ""),
    title,
    scriptContent,
    userId: getStringField(project, "userId", "legacy"),
    createdAt: getStringField(project, "createdAt", new Date(0).toISOString()),
    updatedAt: getStringField(project, "updatedAt", new Date(0).toISOString()),
    name,
    ...(description !== undefined ? { description } : {}),
  };
}

function parseStoredProject(stored: string): Project | null {
  const parsed: unknown = JSON.parse(stored);

  if (!isUnknownRecord(parsed)) {
    return null;
  }

  if (!isApiProject(parsed) && !isLegacyProject(parsed)) {
    return null;
  }

  return toProject(parsed);
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

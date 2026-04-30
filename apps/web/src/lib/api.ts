import { parseJsonResponse } from "./utils/unknown-values";

import type {
  ApiResponse,
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Scene,
  CreateSceneInput,
  UpdateSceneInput,
  Character,
  CreateCharacterInput,
  UpdateCharacterInput,
  Shot,
  CreateShotInput,
  UpdateShotInput,
  AnalyzeScriptResponse,
  ChatResponse,
} from "./api-types";

interface AuthResponseEnvelope {
  success?: boolean;
  data?: unknown;
  error?: string;
  details?: { message?: string }[];
}

const AUTH_REQUIRED_MESSAGE = "غير مصرح - يرجى تسجيل الدخول";

export class AuthRequiredError extends Error {
  constructor(message = AUTH_REQUIRED_MESSAGE) {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function isAuthRequiredError(error: unknown): boolean {
  return error instanceof AuthRequiredError;
}

/**
 * Authenticated fetch wrapper
 * Automatically includes auth token and handles common headers
 */
async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies for httpOnly token
  });

  // Surface 401 responses so callers can offer login or guest flows.
  if (response.status === 401) {
    throw new AuthRequiredError();
  }

  return response;
}

/**
 * API functions for AI services
 */

/**
 * API functions for Auth services (JWT based)
 */

export async function loginUser(
  email: string,
  password: string
): Promise<unknown> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as AuthResponseEnvelope;

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ?? data.details?.[0]?.message ?? "فشل تسجيل الدخول"
    );
  }

  return data.data;
}

export async function registerUser(
  email: string,
  password: string
): Promise<unknown> {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as AuthResponseEnvelope;

  if (!response.ok || !data.success) {
    throw new Error(
      data.error ?? data.details?.[0]?.message ?? "فشل إنشاء الحساب"
    );
  }

  return data.data;
}

export async function logoutUser(): Promise<void> {
  try {
    await fetchWithAuth("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore logout cleanup failures on the proxy path.
  }
}

export async function getCurrentUser(): Promise<unknown> {
  const response = await fetchWithAuth("/api/auth/me");
  if (!response.ok) {
    throw new Error("Failed to get current user");
  }
  const data = (await response.json()) as AuthResponseEnvelope;
  return data.data;
}

/**
 * Seven Stations Analysis - NEW BACKEND ENDPOINT
 * Triggers multi-agent analysis pipeline on backend
 */
export async function runSevenStationsAnalysis(
  text: string,
  async = true
): Promise<ApiResponse<unknown>> {
  const response = await fetchWithAuth("/api/analysis/seven-stations", {
    method: "POST",
    body: JSON.stringify({ text, async }),
  });

  if (!response.ok) {
    throw new Error(`Seven Stations analysis failed: ${response.statusText}`);
  }

  return parseJsonResponse<ApiResponse<unknown>>(response);
}

/**
 * Get analysis job status
 */
export async function getAnalysisJobStatus(
  jobId: string
): Promise<ApiResponse<unknown>> {
  const response = await fetchWithAuth(`/api/queue/jobs/${jobId}`);

  if (!response.ok) {
    throw new Error(`Failed to get job status: ${response.statusText}`);
  }

  return parseJsonResponse<ApiResponse<unknown>>(response);
}

export async function analyzeScript(
  projectId: string,
  script: string
): Promise<ApiResponse<AnalyzeScriptResponse>> {
  const response = await fetchWithAuth(`/api/projects/${projectId}/analyze`, {
    method: "POST",
    body: JSON.stringify({ scriptContent: script }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return parseJsonResponse<ApiResponse<AnalyzeScriptResponse>>(response);
}

export async function getShotSuggestion(
  sceneDescription: string,
  shotType: string
): Promise<ApiResponse<string>> {
  const response = await fetchWithAuth("/api/ai/shot-suggestion", {
    method: "POST",
    body: JSON.stringify({ sceneDescription, shotType }),
  });

  if (!response.ok) {
    throw new Error(`Shot suggestion failed: ${response.statusText}`);
  }

  return parseJsonResponse<ApiResponse<string>>(response);
}

export async function chatWithAI(
  message: string,
  projectId?: string,
  context?: Record<string, unknown>
): Promise<ApiResponse<ChatResponse>> {
  const response = await fetchWithAuth("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, projectId, context }),
  });

  if (!response.ok) {
    throw new Error(`Chat failed: ${response.statusText}`);
  }

  return parseJsonResponse<ApiResponse<ChatResponse>>(response);
}

// Project API functions
export async function getProjects(): Promise<ApiResponse<Project[]>> {
  const response = await fetchWithAuth("/api/projects");
  if (!response.ok) throw new Error("Failed to fetch projects");
  return parseJsonResponse<ApiResponse<Project[]>>(response);
}

export async function getProject(id: string): Promise<ApiResponse<Project>> {
  const response = await fetchWithAuth(`/api/projects/${id}`);
  if (!response.ok) throw new Error("Failed to fetch project");
  return parseJsonResponse<ApiResponse<Project>>(response);
}

export async function createProject(
  data: CreateProjectInput
): Promise<ApiResponse<Project>> {
  const response = await fetchWithAuth("/api/projects", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create project");
  return parseJsonResponse<ApiResponse<Project>>(response);
}

export async function updateProject(
  id: string,
  data: UpdateProjectInput
): Promise<ApiResponse<Project>> {
  const response = await fetchWithAuth(`/api/projects/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update project");
  return parseJsonResponse<ApiResponse<Project>>(response);
}

export async function deleteProject(id: string): Promise<ApiResponse<void>> {
  const response = await fetchWithAuth(`/api/projects/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete project");
  return parseJsonResponse<ApiResponse<void>>(response);
}

// Scene API functions
export async function getProjectScenes(
  projectId: string
): Promise<ApiResponse<Scene[]>> {
  const response = await fetchWithAuth(`/api/projects/${projectId}/scenes`);
  if (!response.ok) throw new Error("Failed to fetch scenes");
  return parseJsonResponse<ApiResponse<Scene[]>>(response);
}

export async function createScene(
  projectId: string,
  data: CreateSceneInput
): Promise<ApiResponse<Scene>> {
  const response = await fetchWithAuth(`/api/projects/${projectId}/scenes`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create scene");
  return parseJsonResponse<ApiResponse<Scene>>(response);
}

export async function updateScene(
  sceneId: string,
  data: UpdateSceneInput
): Promise<ApiResponse<Scene>> {
  const response = await fetchWithAuth(`/api/scenes/${sceneId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update scene");
  return parseJsonResponse<ApiResponse<Scene>>(response);
}

export async function deleteScene(sceneId: string): Promise<ApiResponse<void>> {
  const response = await fetchWithAuth(`/api/scenes/${sceneId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete scene");
  return parseJsonResponse<ApiResponse<void>>(response);
}

// Character API functions
export async function getProjectCharacters(
  projectId: string
): Promise<ApiResponse<Character[]>> {
  const response = await fetchWithAuth(`/api/projects/${projectId}/characters`);
  if (!response.ok) throw new Error("Failed to fetch characters");
  return parseJsonResponse<ApiResponse<Character[]>>(response);
}

export async function createCharacter(
  projectId: string,
  data: CreateCharacterInput
): Promise<ApiResponse<Character>> {
  const response = await fetchWithAuth(
    `/api/projects/${projectId}/characters`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
  if (!response.ok) throw new Error("Failed to create character");
  return parseJsonResponse<ApiResponse<Character>>(response);
}

export async function updateCharacter(
  characterId: string,
  data: UpdateCharacterInput
): Promise<ApiResponse<Character>> {
  const response = await fetchWithAuth(`/api/characters/${characterId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update character");
  return parseJsonResponse<ApiResponse<Character>>(response);
}

export async function deleteCharacter(
  characterId: string
): Promise<ApiResponse<void>> {
  const response = await fetchWithAuth(`/api/characters/${characterId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete character");
  return parseJsonResponse<ApiResponse<void>>(response);
}

// Shot API functions
export async function getSceneShots(
  sceneId: string
): Promise<ApiResponse<Shot[]>> {
  const response = await fetchWithAuth(`/api/scenes/${sceneId}/shots`);
  if (!response.ok) throw new Error("Failed to fetch shots");
  return parseJsonResponse<ApiResponse<Shot[]>>(response);
}

export async function createShot(
  sceneId: string,
  data: CreateShotInput
): Promise<ApiResponse<Shot>> {
  const response = await fetchWithAuth(`/api/scenes/${sceneId}/shots`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create shot");
  return parseJsonResponse<ApiResponse<Shot>>(response);
}

export async function updateShot(
  shotId: string,
  data: UpdateShotInput
): Promise<ApiResponse<Shot>> {
  const response = await fetchWithAuth(`/api/shots/${shotId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to update shot");
  return parseJsonResponse<ApiResponse<Shot>>(response);
}

export async function deleteShot(shotId: string): Promise<ApiResponse<void>> {
  const response = await fetchWithAuth(`/api/shots/${shotId}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete shot");
  return parseJsonResponse<ApiResponse<void>>(response);
}

// Export all functions as a namespace for wildcard imports
const ApiExport = {
  runSevenStationsAnalysis,
  getAnalysisJobStatus,
  analyzeScript,
  getShotSuggestion,
  chatWithAI,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectScenes,
  createScene,
  updateScene,
  deleteScene,
  getProjectCharacters,
  createCharacter,
  updateCharacter,
  deleteCharacter,
  getSceneShots,
  createShot,
  updateShot,
  deleteShot,
};

export default ApiExport;

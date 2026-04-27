export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

/* HTTP Request Methods */
export enum RequestMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

/* Project Types */
export interface Project {
  id: string;
  title: string;
  scriptContent?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

/* Requests */
export interface CreateProjectRequest {
  title: string;
  scriptContent?: string;
}

export interface UpdateProjectRequest {
  title?: string;
  scriptContent?: string;
}

/* Scene Types */
export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  description?: string | null;
  shotCount: number;
  status: string;
}

export interface CreateSceneRequest {
  projectId: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  description?: string;
  shotCount?: number;
  status?: string;
}

export interface UpdateSceneRequest {
  sceneNumber?: number;
  title?: string;
  location?: string;
  timeOfDay?: string;
  characters?: string[];
  description?: string;
  shotCount?: number;
  status?: string;
}

/* Shot Types */
export interface Shot {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  aiSuggestion?: string | null;
}

export interface CreateShotRequest {
  sceneId: string;
  shotNumber: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  aiSuggestion?: string;
}

export interface UpdateShotRequest {
  shotNumber?: number;
  shotType?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lighting?: string;
  aiSuggestion?: string;
}

/* Character Types */
export interface Character {
  id: string;
  projectId: string;
  name: string;
  appearances: number;
  consistencyStatus: string;
  lastSeen?: string;
  notes?: string;
}

export interface CreateCharacterRequest {
  projectId: string;
  name: string;
  appearances?: number;
  consistencyStatus?: string;
  lastSeen?: string;
  notes?: string;
}

export interface UpdateCharacterRequest {
  name?: string;
  appearances?: number;
  consistencyStatus?: string;
  lastSeen?: string;
  notes?: string;
}

/* AI Analysis Types */
export interface ScriptAnalysis {
  characters: string[];
  locations: string[];
  visualSuggestions: string[];
}

export interface ShotSuggestionsResponse {
  suggestions: {
    shotType: string;
    cameraAngle: string;
    cameraMovement: string;
    lighting: string;
    description: string;
    aiSuggestion?: string;
  }[];
}

export interface ChatResponse {
  response?: string;
  message?: string;
  content?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

/* Generic API Error */
export interface ApiError {
  message: string;
}

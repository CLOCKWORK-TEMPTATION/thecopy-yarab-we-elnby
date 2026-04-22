// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Project types
export interface Project {
  id: string;
  title: string;
  scriptContent: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  title: string;
  scriptContent?: string;
}

export interface UpdateProjectInput {
  title?: string;
  scriptContent?: string;
}

// Scene types
export interface Scene {
  id: string;
  projectId: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  description: string | null;
  shotCount: number;
  status: string;
}

export interface CreateSceneInput {
  projectId: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  description?: string;
}

export interface UpdateSceneInput {
  title?: string;
  location?: string;
  timeOfDay?: string;
  characters?: string[];
  description?: string;
  status?: string;
}

// Character types
export interface Character {
  id: string;
  projectId: string;
  name: string;
  appearances: number;
  consistencyStatus: string;
  lastSeen: string | null;
  notes: string | null;
}

export interface CreateCharacterInput {
  projectId: string;
  name: string;
  notes?: string;
}

export interface UpdateCharacterInput {
  name?: string;
  appearances?: number;
  consistencyStatus?: string;
  lastSeen?: string;
  notes?: string;
}

// Shot types
export interface Shot {
  id: string;
  sceneId: string;
  shotNumber: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  aiSuggestion: string | null;
}

export interface CreateShotInput {
  sceneId: string;
  shotNumber: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  aiSuggestion?: string;
}

export interface UpdateShotInput {
  shotNumber?: number;
  shotType?: string;
  cameraAngle?: string;
  cameraMovement?: string;
  lighting?: string;
  aiSuggestion?: string;
}

// AI Service types
export interface AnalyzeScriptResponse {
  analysis: {
    structure?: unknown;
    characters?: unknown;
    themes?: unknown;
    suggestions?: string[];
  };
}

export interface ShotSuggestion {
  type: string;
  angle: string;
  movement?: string;
  description: string;
  reasoning?: string;
}

export interface ShotSuggestionResponse {
  suggestions: ShotSuggestion[];
}

export interface ChatResponse {
  response?: string;
  message?: string;
  content?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

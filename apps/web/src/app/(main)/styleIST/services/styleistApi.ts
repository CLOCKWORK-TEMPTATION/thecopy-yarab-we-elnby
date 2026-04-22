/**
 * StyleIST Backend API Client
 * Calls the Express backend through the Next.js proxy at /api/styleist/*
 */

const STYLEIST_API = "/api/styleist";

async function fetchStyleist<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const response = await fetch(`${STYLEIST_API}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    throw new Error("غير مصرح - يرجى تسجيل الدخول");
  }

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || "فشل في العملية");
  }

  return data.data as T;
}

// ==========================================
// Costume Designs
// ==========================================

export interface CostumeDesignRow {
  id: string;
  projectId: string;
  userId: string;
  lookTitle: string;
  dramaticDescription: string | null;
  breakdown: Record<string, string>;
  rationale: string[];
  productionNotes: Record<string, string>;
  imagePrompt: string | null;
  conceptArtUrl: string | null;
  realWeather: Record<string, unknown>;
  brief: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDesignInput {
  projectId: string;
  lookTitle: string;
  dramaticDescription?: string;
  breakdown?: Record<string, string>;
  rationale?: string[];
  productionNotes?: Record<string, string>;
  imagePrompt?: string;
  conceptArtUrl?: string;
  realWeather?: Record<string, unknown>;
  brief?: Record<string, string>;
}

export async function saveDesign(
  input: SaveDesignInput
): Promise<CostumeDesignRow> {
  return fetchStyleist("/designs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getDesigns(
  projectId: string
): Promise<CostumeDesignRow[]> {
  return fetchStyleist(`/designs?projectId=${encodeURIComponent(projectId)}`);
}

export async function getDesign(id: string): Promise<CostumeDesignRow> {
  return fetchStyleist(`/designs/${encodeURIComponent(id)}`);
}

export async function deleteDesign(id: string): Promise<void> {
  return fetchStyleist(`/designs/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ==========================================
// Wardrobe Items
// ==========================================

export interface WardrobeItemRow {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  imageUrl: string;
  category: string | null;
  fabric: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SaveWardrobeInput {
  projectId: string;
  name: string;
  imageUrl: string;
  category?: string;
  fabric?: string;
  metadata?: Record<string, unknown>;
}

export async function saveWardrobeItem(
  input: SaveWardrobeInput
): Promise<WardrobeItemRow> {
  return fetchStyleist("/wardrobe", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getWardrobeItems(
  projectId: string
): Promise<WardrobeItemRow[]> {
  return fetchStyleist(`/wardrobe?projectId=${encodeURIComponent(projectId)}`);
}

export async function deleteWardrobeItem(id: string): Promise<void> {
  return fetchStyleist(`/wardrobe/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

// ==========================================
// Scene-Costume Assignments
// ==========================================

export interface SceneCostumeRow {
  id: string;
  projectId: string;
  sceneId: string;
  costumeDesignId: string | null;
  wardrobeItemId: string | null;
  characterId: string | null;
  isContinuous: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssignCostumeInput {
  projectId: string;
  sceneId: string;
  costumeDesignId?: string;
  wardrobeItemId?: string;
  characterId?: string;
  isContinuous?: boolean;
  notes?: string;
}

export async function assignSceneCostume(
  input: AssignCostumeInput
): Promise<SceneCostumeRow> {
  return fetchStyleist("/scene-costumes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getSceneCostumes(
  projectId: string
): Promise<SceneCostumeRow[]> {
  return fetchStyleist(
    `/scene-costumes?projectId=${encodeURIComponent(projectId)}`
  );
}

export async function updateSceneCostume(
  sceneId: string,
  updates: { projectId: string } & Partial<AssignCostumeInput>
): Promise<SceneCostumeRow> {
  return fetchStyleist(`/scene-costumes/${encodeURIComponent(sceneId)}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

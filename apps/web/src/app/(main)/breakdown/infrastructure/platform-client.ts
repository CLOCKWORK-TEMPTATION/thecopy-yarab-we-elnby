import type {
  BreakdownBootstrapResponse,
  BreakdownReport,
  BreakdownReportScene,
  ScenarioAnalysis,
  SceneBreakdown,
  ScriptSegmentResponse,
  ShootingScheduleDay,
} from "../domain/models";

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
}

function getAppOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = /(?:^|;\s*)XSRF-TOKEN=([^;]+)/.exec(document.cookie);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  const existing = getCsrfToken();
  if (existing) {
    return existing;
  }

  await fetch(resolveApiUrl("/api/breakdown/health"), {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return getCsrfToken();
}

function resolveApiUrl(path: string): string {
  return new URL(path, getAppOrigin()).toString();
}

async function fetchBreakdown<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const csrfToken =
    options.method && options.method !== "GET"
      ? await ensureCsrfToken()
      : getCsrfToken();
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  if (options.method && options.method !== "GET" && csrfToken) {
    headers.set("X-XSRF-TOKEN", csrfToken);
  }

  const response = await fetch(resolveApiUrl(`/api/breakdown${path}`), {
    method: options.method ?? "GET",
    headers,
    credentials: "include",
    ...(options.body !== undefined
      ? { body: JSON.stringify(options.body) }
      : {}),
  });
  const payload = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok || !payload.success || payload.data === undefined) {
    throw new Error(payload.error ?? "فشل طلب البريك دون");
  }

  return payload.data;
}

export async function bootstrapBreakdownProject(
  scriptContent: string,
  title?: string
): Promise<BreakdownBootstrapResponse> {
  return fetchBreakdown<BreakdownBootstrapResponse>("/projects/bootstrap", {
    method: "POST",
    body: { scriptContent, title },
  });
}

export async function parseBreakdownProject(
  projectId: string,
  scriptContent?: string,
  title?: string
): Promise<ScriptSegmentResponse> {
  return fetchBreakdown<ScriptSegmentResponse>(`/projects/${projectId}/parse`, {
    method: "POST",
    body: { scriptContent, title },
  });
}

export async function analyzeBreakdownProject(
  projectId: string
): Promise<BreakdownReport> {
  return fetchBreakdown<BreakdownReport>(`/projects/${projectId}/analyze`, {
    method: "POST",
  });
}

export async function getBreakdownProjectReport(
  projectId: string
): Promise<BreakdownReport> {
  return fetchBreakdown<BreakdownReport>(`/projects/${projectId}/report`);
}

export async function getBreakdownProjectSchedule(
  projectId: string
): Promise<ShootingScheduleDay[]> {
  return fetchBreakdown<ShootingScheduleDay[]>(
    `/projects/${projectId}/schedule`
  );
}

export async function getBreakdownScene(
  sceneId: string
): Promise<BreakdownReportScene> {
  return fetchBreakdown<BreakdownReportScene>(`/scenes/${sceneId}`);
}

export async function reanalyzeBreakdownScene(
  sceneId: string
): Promise<BreakdownReportScene> {
  return fetchBreakdown<BreakdownReportScene>(`/scenes/${sceneId}/reanalyze`, {
    method: "POST",
  });
}

export async function exportBreakdownReport(
  reportId: string,
  format: "json" | "csv" = "json"
): Promise<{ fileName: string; format: string; content: string }> {
  return fetchBreakdown<{ fileName: string; format: string; content: string }>(
    `/reports/${reportId}/export?format=${format}`
  );
}

export async function chatWithBreakdownAssistant(
  message: string,
  context?: Record<string, unknown>
): Promise<{ answer: string }> {
  return fetchBreakdown<{ answer: string }>("/chat", {
    method: "POST",
    body: { message, context },
  });
}

export function mapReportSceneToWorkspaceScene(
  scene: BreakdownReportScene,
  projectId: string,
  reportId: string,
  index: number
): {
  id: number;
  remoteId: string;
  projectId: string;
  reportId: string;
  header: string;
  content: string;
  headerData: BreakdownReportScene["headerData"];
  stats: SceneBreakdown["stats"];
  elements: SceneBreakdown["elements"];
  warnings: string[];
  source?: "ai" | "fallback";
  isAnalyzed: true;
  analysis: SceneBreakdown;
  scenarios: ScenarioAnalysis;
  versions: [];
} {
  const workspaceScene: {
    id: number;
    remoteId: string;
    projectId: string;
    reportId: string;
    header: string;
    content: string;
    headerData: BreakdownReportScene["headerData"];
    stats: SceneBreakdown["stats"];
    elements: SceneBreakdown["elements"];
    warnings: string[];
    source?: "ai" | "fallback";
    isAnalyzed: true;
    analysis: SceneBreakdown;
    scenarios: ScenarioAnalysis;
    versions: [];
  } = {
    id: index + 1,
    remoteId: scene.sceneId,
    projectId,
    reportId,
    header: scene.header,
    content: scene.content,
    headerData: scene.headerData,
    stats: scene.analysis.stats,
    elements: scene.analysis.elements,
    warnings: scene.analysis.warnings,
    ...(scene.analysis.source ? { source: scene.analysis.source } : {}),
    isAnalyzed: true as const,
    analysis: scene.analysis,
    scenarios: scene.scenarios,
    versions: [] as [],
  };
  return workspaceScene;
}

import type { AppStateId } from "@/lib/app-state-contract";

interface AppStateApiResponse<T extends object> {
  success: boolean;
  data: T;
  updatedAt: string;
}

function resolveServerBaseUrl(): string {
  const baseUrl =
    process.env["NEXT_PUBLIC_APP_STATE_BASE_URL"] ||
    process.env["BACKEND_URL"] ||
    process.env["NEXT_PUBLIC_BACKEND_URL"] ||
    process.env["NEXT_PUBLIC_API_URL"];

  if (!baseUrl) {
    throw new Error(
      "App state backend URL is not configured. Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL."
    );
  }

  return baseUrl.replace(/\/$/, "");
}

function buildAppStateUrl(appId: AppStateId): string {
  const path = `/api/app-state/${appId}`;

  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(path, window.location.origin).toString();
  }

  return new URL(path, resolveServerBaseUrl()).toString();
}

async function parseJson<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T;
  return json;
}

export async function loadRemoteAppState<T extends object>(
  appId: AppStateId
): Promise<T | null> {
  const response = await fetch(buildAppStateUrl(appId), {
    method: "GET",
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Failed to load app state for ${appId}`);
  }

  const payload = await parseJson<AppStateApiResponse<T>>(response);
  return payload.data ?? null;
}

export async function persistRemoteAppState<T extends object>(
  appId: AppStateId,
  data: T
): Promise<T> {
  const response = await fetch(buildAppStateUrl(appId), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify({ data }),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist app state for ${appId}`);
  }

  const payload = await parseJson<AppStateApiResponse<T>>(response);
  return payload.data;
}

export async function clearRemoteAppState(appId: AppStateId): Promise<void> {
  const response = await fetch(buildAppStateUrl(appId), {
    method: "DELETE",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error(`Failed to clear app state for ${appId}`);
  }
}

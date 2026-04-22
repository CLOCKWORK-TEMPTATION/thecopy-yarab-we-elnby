function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null;
  return url.replace(/\/$/, "");
}

export function getBackendBaseUrl(): string | null {
  return normalizeBaseUrl(
    process.env["NEXT_PUBLIC_BACKEND_URL"] ||
      process.env["NEXT_PUBLIC_API_URL"] ||
      null
  );
}

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookieMatch = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("XSRF-TOKEN="));

  if (!cookieMatch) return null;

  const [, value] = cookieMatch.split("=");
  return value ? decodeURIComponent(value) : null;
}

async function ensureCsrfToken(baseUrl: string): Promise<string | null> {
  const existingToken = getCsrfToken();
  if (existingToken) {
    return existingToken;
  }

  await fetch(`${baseUrl}/api/health`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  return getCsrfToken();
}

export async function postToBackend<TResponse = unknown>(
  path: string,
  body: unknown,
  options?: { bestEffort?: boolean }
): Promise<TResponse | null> {
  const baseUrl = getBackendBaseUrl();
  if (!baseUrl) {
    if (options?.bestEffort) return null;
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not configured");
  }

  const csrfToken = await ensureCsrfToken(baseUrl);
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (options?.bestEffort) return null;

    let message = `Backend request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as {
        error?: string;
        message?: string;
      };
      message = payload.message || payload.error || message;
    } catch {
      // ignore JSON parse failure and keep generic message
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return (await response.json()) as TResponse;
}

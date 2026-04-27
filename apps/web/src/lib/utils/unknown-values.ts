export type UnknownRecord = Record<string, unknown>;

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringifyUnknown(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value.toString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "symbol") {
    return value.description ?? fallback;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return value.message || value.name || fallback;
  }

  try {
    return JSON.stringify(value) ?? fallback;
  } catch {
    return fallback;
  }
}

export function optionalString(value: unknown): string | undefined {
  const text = stringifyUnknown(value).trim();
  return text.length > 0 ? text : undefined;
}

export function stringArrayFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => stringifyUnknown(item).trim())
    .filter((item) => item.length > 0);
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  return payload as T;
}

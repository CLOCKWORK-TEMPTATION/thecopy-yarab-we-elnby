export type JsonRecord = Record<string, unknown>;

export interface SceneCharacter {
  name?: string;
  role?: string;
  motivation?: string;
}

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function asJsonRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function asUnknownArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: unknown) => item);
}

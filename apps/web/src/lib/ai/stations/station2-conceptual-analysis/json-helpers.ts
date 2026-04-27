export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export function asJsonRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

export function asJsonRecordArray(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isJsonRecord) : [];
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

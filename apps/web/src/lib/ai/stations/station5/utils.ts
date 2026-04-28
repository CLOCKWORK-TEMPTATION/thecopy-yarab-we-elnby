// Safe substring helper
export const safeSub = (text: string, start: number, end: number): string => {
  if (!text) return "";
  return text.substring(start, Math.min(end, text.length));
};

export const safeGet = <T>(array: T[], index: number): T | undefined => {
  if (index < 0 || index >= array.length) {
    return undefined;
  }
  return array[index];
};

export type JsonRecord = Record<string, unknown>;

export function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null;
}

export function asJsonRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

export function asJsonRecords(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.map(asJsonRecord) : [];
}

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function asNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function scaledTimestamp(value: unknown): Date {
  return new Date(asNumber(value, 0) * 100000000);
}

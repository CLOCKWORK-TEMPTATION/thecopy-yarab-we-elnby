export function serializeAnalysisValue<T>(value: T): T {
  const seen = new WeakSet<object>();

  function inner(current: unknown): unknown {
    if (
      current === null ||
      current === undefined ||
      typeof current === "string" ||
      typeof current === "number" ||
      typeof current === "boolean"
    ) {
      return current;
    }

    if (current instanceof Date) {
      return current.toISOString();
    }

    if (current instanceof Map) {
      return Object.fromEntries(
        [...current.entries()].map(([key, entry]) => [
          String(key),
          inner(entry),
        ])
      );
    }

    if (current instanceof Set) {
      return [...current].map((entry) => inner(entry));
    }

    if (Array.isArray(current)) {
      return current.map((entry) => inner(entry));
    }

    if (typeof current === "object") {
      if (seen.has(current)) {
        return "[Circular]";
      }

      seen.add(current);
      const serializable: Record<string, unknown> = {};
      for (const [key, entry] of Object.entries(current)) {
        if (typeof entry !== "function") {
          serializable[key] = inner(entry);
        }
      }
      return serializable;
    }

    if (typeof current === "string") {
      return current;
    }
    if (typeof current === "number" || typeof current === "boolean") {
      return current.toString();
    }
    if (typeof current === "bigint") {
      return current.toString();
    }
    if (typeof current === "symbol") {
      return current.description ?? "";
    }
    return "";
  }

  return inner(value) as T;
}

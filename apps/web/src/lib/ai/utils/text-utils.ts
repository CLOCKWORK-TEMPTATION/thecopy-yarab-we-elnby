export function toText(content: { raw?: unknown } | string): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (content && typeof content === "object" && "raw" in content) {
    return String(content.raw || "").trim();
  }
  return "";
}

export function safeSub(text: string, start: number, end: number): string {
  if (!text || typeof text !== "string") {
    return "";
  }
  return text.substring(start, Math.min(end, text.length));
}

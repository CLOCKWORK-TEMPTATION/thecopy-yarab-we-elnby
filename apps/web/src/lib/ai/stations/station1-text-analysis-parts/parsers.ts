import { stringifyUnknown } from "@/lib/utils/unknown-values";

export function parseJSON<T>(content: { raw?: unknown } | string): T {
  let text: string;

  if (typeof content === "string") {
    text = content;
  } else if (content && typeof content === "object" && "raw" in content) {
    text = stringifyUnknown(content.raw);
  } else {
    throw new Error("Invalid content format");
  }

  const jsonMatch = /\{[\s\S]*\}/.exec(text);
  if (!jsonMatch) {
    throw new Error("No JSON found in response");
  }

  const parsed: unknown = JSON.parse(jsonMatch[0]);
  return parsed as T;
}

export function extractText(content: { raw?: unknown } | string): string {
  if (typeof content === "string") {
    return content.trim();
  }
  if (content && typeof content === "object" && "raw" in content) {
    return stringifyUnknown(content.raw).trim();
  }
  return "";
}

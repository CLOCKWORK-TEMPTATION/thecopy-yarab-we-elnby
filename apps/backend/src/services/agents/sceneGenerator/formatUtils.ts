import { asJsonRecord, asString } from "./types";

const ARABIC_CHAR_REGEX = /^[أ-ي\s]+:/; // NOSONAR
const LATIN_CHAR_REGEX = /^[A-Z\s]+:/; // NOSONAR

export function cleanupSceneText(text: string): string {
  // Remove JSON and code artifacts
  let cleaned = text.replace(/```json[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, (match) => {
    if (match.includes('"') && match.includes(":")) return "";
    return match;
  });

  // Format scene elements
  const formatted = formatSceneElements(cleaned);

  // Ensure proper scene structure
  const structured = structureScene(formatted);

  // Clean up whitespace
  return structured.replace(/\n{3,}/g, "\n\n").trim();
}

function formatSceneElements(text: string): string {
  const lines = text.split("\n");
  const formatted: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      formatted.push("");
      continue;
    }

    // Format character names in dialogue
    if (isCharacterName(trimmed)) {
      formatted.push(`\n${trimmed.toUpperCase()}`);
    }
    // Format dialogue
    else if (isDialogue(trimmed)) {
      formatted.push(formatDialogue(trimmed));
    }
    // Format stage directions
    else if (isStageDirection(trimmed)) {
      formatted.push(`(${trimmed})`);
    }
    // Regular description
    else {
      formatted.push(trimmed);
    }
  }

  return formatted.join("\n");
}

function structureScene(text: string): string {
  // Extract main components
  const sceneHeading = extractSceneHeading(text);
  const description = extractDescription(text);
  const action = extractAction(text);

  // Rebuild in proper order
  let structured = "";

  if (sceneHeading) {
    structured += `${sceneHeading}\n\n`;
  }

  if (description) {
    structured += `${description}\n\n`;
  }

  if (action) {
    structured += action;
  }

  // If no clear structure, return original
  return structured || text;
}

function isCharacterName(line: string): boolean {
  return ARABIC_CHAR_REGEX.test(line) || LATIN_CHAR_REGEX.test(line);
}

function isDialogue(line: string): boolean {
  return (
    line.includes('"') ||
    line.includes("«") ||
    (line.includes(":") && line.length > 20)
  );
}

function isStageDirection(line: string): boolean {
  return (
    line.startsWith("(") ||
    line.includes("[") ||
    line.toLowerCase().includes("يدخل") ||
    line.toLowerCase().includes("يخرج")
  );
}

function formatDialogue(text: string): string {
  if (!text.startsWith('"') && !text.includes("«")) {
    return `"${text}"`;
  }
  return text;
}

function extractSceneHeading(text: string): string | null {
  const lines = text.split("\n");
  const heading = lines.find(
    (line) =>
      line.includes("INT.") ||
      line.includes("EXT.") ||
      line.includes("داخلي") ||
      line.includes("خارجي") ||
      line.includes("المشهد")
  );
  return heading ?? null;
}

function extractDescription(text: string): string | null {
  const paragraphs = text.split("\n\n");
  const description = paragraphs.find(
    (p) => p.length > 100 && !p.includes('"') && !p.includes(":")
  );
  return description ?? null;
}

function extractAction(text: string): string {
  // Return everything that's not heading or pure description
  const heading = extractSceneHeading(text);
  const description = extractDescription(text);

  let action = text;
  if (heading) action = action.replace(heading, "");
  if (description) action = action.replace(description, "");

  return action.trim();
}

export function formatCharacter(character: unknown): string {
  if (typeof character === "string") return character;

  const characterRecord = asJsonRecord(character);
  const parts: string[] = [];
  const name = asString(characterRecord["name"]);
  const role = asString(characterRecord["role"]);
  const motivation = asString(characterRecord["motivation"]);

  if (name) parts.push(name);
  if (role) parts.push(`(${role})`);
  if (motivation) parts.push(`- الدافع: ${motivation}`);

  return parts.join(" ") || "شخصية";
}

export function summarizeScene(scene: unknown): string {
  if (typeof scene === "string") {
    return scene.substring(0, 200) + "...";
  }
  return "مشهد سابق";
}

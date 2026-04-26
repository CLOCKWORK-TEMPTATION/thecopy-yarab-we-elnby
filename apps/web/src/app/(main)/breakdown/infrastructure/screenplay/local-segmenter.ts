import type { ScriptSegmentResponse } from "../../domain/models";

const ENGLISH_SCENE_HEADING_PATTERN = /^(?:INT|EXT|INT\/EXT|I\/E|EST)\.?\s+/i;
const ARABIC_SCENE_HEADING_PATTERN = /^(?:مشهد|م)(?:\s|$)/i;
const LOCATION_PREFIX_PATTERN = /^(?:موقع|مكان|المكان|المنطقة)\s*:\s*/;
const TRANSITION_PHRASES = new Set([
  "CUT TO",
  "FADE IN",
  "FADE OUT",
  "DISSOLVE TO",
  "SMASH CUT",
  "MATCH CUT",
  "JUMP CUT",
  "WIPE TO",
  "IRIS IN",
  "IRIS OUT",
  "قطع إلى",
  "تلاشي دخول",
  "تلاشي خروج",
  "ذوبان إلى",
  "قطع مفاجئ",
  "قطع مطابق",
]);
const CHARACTER_PATTERN = /^.{1,40}\s*:\s*$/;
const ACTION_PREFIX_PATTERN = /^[-–—(]/;

function normalizeLine(line: string): string {
  return line.replace(/\u00A0/g, " ").trim();
}

function normalizeTransitionLine(line: string): string {
  const normalized = normalizeLine(line).replace(/\s+/g, " ");
  const withoutColon = normalized.endsWith(":")
    ? normalized.slice(0, -1).trim()
    : normalized;
  return withoutColon.toUpperCase();
}

function looksLikeTransition(line: string): boolean {
  return TRANSITION_PHRASES.has(normalizeTransitionLine(line));
}

function looksLikeSceneHeading(line: string): boolean {
  const trimmed = normalizeLine(line);

  if (!trimmed) {
    return false;
  }

  if (ENGLISH_SCENE_HEADING_PATTERN.test(trimmed)) {
    return true;
  }

  if (!ARABIC_SCENE_HEADING_PATTERN.test(trimmed)) {
    return false;
  }

  if (/^مشهد\s+رقم\b/i.test(trimmed)) {
    return /[:|–—-]|داخلي|خارجي|ليل|نهار|صباح|مساء/i.test(trimmed);
  }

  return trimmed.length <= 160;
}

function looksLikeHeaderContinuation(
  line: string,
  currentHeader: string
): boolean {
  const trimmed = normalizeLine(line);

  if (!trimmed || looksLikeSceneHeading(trimmed)) {
    return false;
  }

  if (
    looksLikeTransition(trimmed) ||
    CHARACTER_PATTERN.test(trimmed) ||
    ACTION_PREFIX_PATTERN.test(trimmed)
  ) {
    return false;
  }

  if (LOCATION_PREFIX_PATTERN.test(trimmed)) {
    return true;
  }

  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const currentLooksStructured =
    /^(?:مشهد|م)\s*\d+/i.test(currentHeader) ||
    /^(?:مشهد|م)(?:\s|$)/i.test(currentHeader);

  return currentLooksStructured && wordCount > 0 && wordCount <= 8;
}

function buildHeader(headerLines: string[]): string {
  return headerLines.map(normalizeLine).filter(Boolean).join(" | ");
}

function buildContent(contentLines: string[]): string {
  return contentLines.join("\n").trim();
}

function pushScene(
  scenes: ScriptSegmentResponse["scenes"],
  headerLines: string[],
  contentLines: string[]
): void {
  const header = buildHeader(headerLines);
  const content = buildContent(contentLines);

  if (!header || !content) {
    return;
  }

  scenes.push({ header, content });
}

export function segmentScriptLocally(
  scriptText: string
): ScriptSegmentResponse {
  const lines = scriptText.split(/\r?\n/);
  const scenes: ScriptSegmentResponse["scenes"] = [];

  let currentHeaderLines: string[] = [];
  let currentContentLines: string[] = [];
  let hasStartedScene = false;

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const trimmed = normalizeLine(rawLine);

    if (looksLikeSceneHeading(trimmed)) {
      if (hasStartedScene) {
        pushScene(scenes, currentHeaderLines, currentContentLines);
      }

      currentHeaderLines = [trimmed];
      currentContentLines = [];
      hasStartedScene = true;

      const nextLine = lines[index + 1];
      const normalizedNextLine = nextLine ? normalizeLine(nextLine) : "";

      if (
        normalizedNextLine &&
        looksLikeHeaderContinuation(normalizedNextLine, trimmed)
      ) {
        currentHeaderLines.push(normalizedNextLine);
        index += 1;
      }

      continue;
    }

    if (!hasStartedScene) {
      continue;
    }

    currentContentLines.push(rawLine.trimEnd());
  }

  if (hasStartedScene) {
    pushScene(scenes, currentHeaderLines, currentContentLines);
  }

  return { scenes };
}

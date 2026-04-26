import { estimateScenePageCount, validateSceneHeader } from './utils';

import type { ParsedScene, ParsedScreenplay, SceneHeader, SceneType, TimeOfDay } from './types';

const ENGLISH_SCENE_HEADING_PATTERN =
  /^(?:INT|EXT|INT\/EXT|I\/E|EST)\.?\s+/i;
const ARABIC_SCENE_HEADING_PATTERN = /^(?:مشهد(?:\s+(?:داخلي|خارجي))?|م)(?:\s|\.|$)/i;
const LOCATION_PREFIX_PATTERN = /^(?:موقع|مكان|المكان|المنطقة)\s*:\s*/;
const HEADER_METADATA_PATTERN =
  /^(?:داخلي|خارجي|ليل|نهار|صباح|مساء|فجر|مغرب|day|night|dawn|dusk|morning|evening|location|موقع|مكان|INT|EXT)/i;
const STRUCTURED_UPPERCASE_PATTERN = /^[A-Z0-9\s\-–—/.]+$/;
const TRANSITION_PATTERN =
  /^(?:CUT\s+TO|FADE\s+IN|FADE\s+OUT|DISSOLVE\s+TO|SMASH\s+CUT|MATCH\s+CUT|JUMP\s+CUT|WIPE\s+TO|IRIS\s+(?:IN|OUT)|قطع\s+إلى|تلاشي\s+(?:دخول|خروج)|ذوبان\s+إلى|قطع\s+مفاجئ|قطع\s+مطابق)\s*:?\s*$/i;
const CHARACTER_PATTERN = /^.{1,40}\s*:\s*$/;
const ACTION_PREFIX_PATTERN = /^[\-–—(]/;

function normalizeLine(line: string): string {
  return line.replace(/\u00A0/g, ' ').trim();
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

  return trimmed.length <= 180;
}

function isNonHeaderLine(trimmed: string): boolean {
  return (
    TRANSITION_PATTERN.test(trimmed) ||
    CHARACTER_PATTERN.test(trimmed) ||
    ACTION_PREFIX_PATTERN.test(trimmed)
  );
}

function isStructuredContinuation(trimmed: string, currentHeader: string): boolean {
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  const currentLooksStructured =
    /^(?:مشهد|م)\s*\d+/i.test(currentHeader) ||
    /^(?:مشهد|م)(?:\s|$)/i.test(currentHeader);

  return (
    currentLooksStructured &&
    wordCount > 0 &&
    wordCount <= 6 &&
    !/[.!?،؛]/.test(trimmed) &&
    (HEADER_METADATA_PATTERN.test(trimmed) ||
      STRUCTURED_UPPERCASE_PATTERN.test(trimmed))
  );
}

function looksLikeHeaderContinuation(line: string, currentHeader: string): boolean {
  const trimmed = normalizeLine(line);

  if (!trimmed || looksLikeSceneHeading(trimmed)) {
    return false;
  }

  if (isNonHeaderLine(trimmed)) {
    return false;
  }

  if (LOCATION_PREFIX_PATTERN.test(trimmed)) {
    return true;
  }

  return isStructuredContinuation(trimmed, currentHeader);
}

function inferSceneType(header: string): SceneType {
  if (/(?:^|\s)(?:EXT|خارجي)/i.test(header)) {
    return 'EXT';
  }

  return 'INT';
}

function inferTimeOfDay(header: string): TimeOfDay {
  if (/(?:ليل|night)/i.test(header)) {
    return 'NIGHT';
  }

  if (/(?:فجر|dawn|شروق)/i.test(header)) {
    return 'DAWN';
  }

  if (/(?:غروب|dusk|مغرب)/i.test(header)) {
    return 'DUSK';
  }

  if (/(?:صباح|morning)/i.test(header)) {
    return 'MORNING';
  }

  if (/(?:مساء|evening)/i.test(header)) {
    return 'EVENING';
  }

  if (/(?:نهار|day)/i.test(header)) {
    return 'DAY';
  }

  return 'UNKNOWN';
}

function inferStoryDay(header: string): number {
  const arabicMatch = /يوم\s+(\d+)/i.exec(header);
  if (arabicMatch) {
    return Number(arabicMatch[1]);
  }

  const englishMatch = /day\s+(\d+)/i.exec(header);
  if (englishMatch) {
    return Number(englishMatch[1]);
  }

  return 1;
}

function inferSceneNumber(header: string, fallback: number): number {
  const arabicMatch = /(?:^|\s)(?:مشهد|م)\s*(\d+)/i.exec(header);
  if (arabicMatch) {
    return Number(arabicMatch[1]);
  }

  const englishMatch = /(?:scene)\s*(\d+)/i.exec(header);
  if (englishMatch) {
    return Number(englishMatch[1]);
  }

  return fallback;
}

function inferLocation(header: string): string {
  const normalizedHeader = normalizeLine(header);

  const englishMatch = /^(?:INT|EXT|INT\/EXT|I\/E|EST)\.?\s*([^-|]+)/i.exec(normalizedHeader);
  if (englishMatch?.[1]) {
    return englishMatch[1].trim();
  }

  const arabicMatch = /^(?:مشهد(?:\s+(?:داخلي|خارجي))?\.?\s*)?(.+?)(?:\s*[-–—]\s*(?:ليل|نهار|فجر|مغرب|day|night|dawn|dusk|morning|evening).*)?$/i.exec(normalizedHeader);
  if (arabicMatch?.[1]) {
    const candidate = arabicMatch[1]
      .replace(/^(?:داخلي|خارجي)\.?\s*/i, '')
      .trim();
    if (candidate) {
      return candidate;
    }
  }

  return 'موقع غير محدد';
}

function buildHeaderData(header: string, content: string, sceneNumber: number): SceneHeader {
  const sceneHeader: SceneHeader = {
    sceneNumber: inferSceneNumber(header, sceneNumber),
    sceneType: inferSceneType(header),
    location: inferLocation(header),
    timeOfDay: inferTimeOfDay(header),
    pageCount: estimateScenePageCount(content),
    storyDay: inferStoryDay(header),
    rawHeader: header,
  };

  const errors = validateSceneHeader(sceneHeader);
  if (errors.length > 0 && sceneHeader.location === 'موقع غير محدد') {
    sceneHeader.location = `مشهد ${sceneHeader.sceneNumber}`;
  }

  return sceneHeader;
}

function buildScene(
  headerLines: string[],
  contentLines: string[],
  fallbackSceneNumber: number
): ParsedScene | null {
  const header = headerLines.map(normalizeLine).filter(Boolean).join(' | ');
  const content = contentLines.join('\n').trim();

  if (!header || !content) {
    return null;
  }

  const headerData = buildHeaderData(header, content, fallbackSceneNumber);
  const warnings = validateSceneHeader(headerData);

  return {
    header,
    content,
    headerData,
    warnings,
  };
}

function flushScene(
  headerLines: string[],
  contentLines: string[],
  scenes: ParsedScene[],
  warnings: string[]
): void {
  const scene = buildScene(headerLines, contentLines, scenes.length + 1);
  if (scene) {
    scenes.push(scene);
    warnings.push(...scene.warnings);
  }
}

function processHeadingLine(
  trimmed: string,
  lines: string[],
  index: number,
  state: { headerLines: string[]; contentLines: string[]; started: boolean },
  scenes: ParsedScene[],
  warnings: string[]
): number {
  if (state.started) {
    flushScene(state.headerLines, state.contentLines, scenes, warnings);
  }

  state.headerLines = [trimmed];
  state.contentLines = [];
  state.started = true;

  const nextLine = lines[index + 1];
  const normalizedNextLine = nextLine ? normalizeLine(nextLine) : '';

  if (normalizedNextLine && looksLikeHeaderContinuation(normalizedNextLine, trimmed)) {
    state.headerLines.push(normalizedNextLine);
    return index + 1;
  }

  return index;
}

export function parseScreenplay(
  scriptText: string,
  title = 'مشروع تفكيك سينمائي'
): ParsedScreenplay {
  const lines = scriptText.split(/\r?\n/);
  const scenes: ParsedScene[] = [];
  const warnings: string[] = [];
  const state = { headerLines: [] as string[], contentLines: [] as string[], started: false };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? '';
    const trimmed = normalizeLine(rawLine);

    if (looksLikeSceneHeading(trimmed)) {
      index = processHeadingLine(trimmed, lines, index, state, scenes, warnings);
      continue;
    }

    if (state.started) {
      state.contentLines.push(rawLine.trimEnd());
    }
  }

  if (state.started) {
    flushScene(state.headerLines, state.contentLines, scenes, warnings);
  }

  return {
    title,
    scenes,
    totalPages: scenes.reduce((sum, scene) => sum + scene.headerData.pageCount, 0),
    warnings,
  };
}

export type ScreenplayLineType =
  | "basmala"
  | "scene-header-1"
  | "transition"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "action";

export interface ScreenplayClassificationSummary {
  kind: "empty" | "screenplay" | "prose";
  confidence: number;
  lineCount: number;
  counts: Record<ScreenplayLineType, number>;
}

const LINE_TYPES: ScreenplayLineType[] = [
  "basmala",
  "scene-header-1",
  "transition",
  "character",
  "parenthetical",
  "dialogue",
  "action",
];

export class ScreenplayClassifier {
  classifyLine(line: string): ScreenplayLineType {
    if (ScreenplayClassifier.isBasmala(line)) return "basmala";
    if (ScreenplayClassifier.isSceneHeaderStart(line)) return "scene-header-1";
    if (ScreenplayClassifier.isTransition(line)) return "transition";
    if (ScreenplayClassifier.isParenthetical(line)) return "parenthetical";
    if (ScreenplayClassifier.isCharacterLine(line)) return "character";
    if (ScreenplayClassifier.isLikelyAction(line)) return "action";
    return "dialogue";
  }

  classifyText(text: string): ScreenplayClassificationSummary {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const counts = Object.fromEntries(
      LINE_TYPES.map((type) => [type, 0])
    ) as Record<ScreenplayLineType, number>;

    for (const line of lines) {
      counts[this.classifyLine(line)] += 1;
    }

    if (lines.length === 0) {
      return { kind: "empty", confidence: 1, lineCount: 0, counts };
    }

    const screenplaySignals =
      counts["scene-header-1"] +
      counts.transition +
      counts.character +
      counts.parenthetical;
    const actionDialogueBalance = counts.action > 0 && counts.dialogue > 0;
    const signalRatio = screenplaySignals / lines.length;
    const confidence = Math.min(
      1,
      signalRatio + (actionDialogueBalance ? 0.2 : 0)
    );

    return {
      kind: confidence >= 0.35 ? "screenplay" : "prose",
      confidence,
      lineCount: lines.length,
      counts,
    };
  }

  static isBasmala(line: string): boolean {
    return /بسم\s+الله/.test(line.trim());
  }

  static isSceneHeaderStart(line: string): boolean {
    return /^(EXT\.|INT\.|خارجي|داخلي|مشهد)/i.test(line.trim());
  }

  static isCharacterLine(line: string): boolean {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 45) return false;
    if (/[:：]$/.test(trimmed)) return true;
    const hasLatin = /[A-Za-z]/.test(trimmed);
    return hasLatin && trimmed === trimmed.toUpperCase();
  }

  static isParenthetical(line: string): boolean {
    const trimmed = line.trim();
    return (
      /^\(.+\)$/.test(trimmed) ||
      /^（.+）$/.test(trimmed) ||
      /^(همس|بهدوء|غاضبًا|غاضبة|مترددًا|مترددة)\b/.test(trimmed)
    );
  }

  static isLikelyAction(line: string): boolean {
    return line.trim().length > 0 && !/[.:؟!]$/.test(line.trim());
  }

  static isTransition(line: string): boolean {
    return /(FADE\s+OUT|CUT\s+TO|DISSOLVE\s+TO|قطع\s+إلى|انتقال\s+إلى)/i.test(
      line.trim()
    );
  }
}

export function classifyScreenplay(text: string): string {
  return new ScreenplayClassifier().classifyText(text).kind;
}

export default ScreenplayClassifier;

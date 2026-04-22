/**
 * Screenplay classifier stub
 * TODO: Implement actual classification logic
 */

export class ScreenplayClassifier {
  classifyLine(line: string) {
    if (ScreenplayClassifier.isBasmala(line)) return "basmala";
    if (ScreenplayClassifier.isSceneHeaderStart(line)) return "scene-header-1";
    if (ScreenplayClassifier.isTransition(line)) return "transition";
    if (ScreenplayClassifier.isCharacterLine(line)) return "character";
    if (ScreenplayClassifier.isLikelyAction(line)) return "action";
    return "dialogue";
  }

  static isBasmala(line: string) {
    return /بسم\s+الله/.test(line.trim());
  }

  static isSceneHeaderStart(line: string) {
    return /^(EXT\.|INT\.|خارجي|داخلي|مشهد)/i.test(line.trim());
  }

  static isCharacterLine(line: string) {
    const trimmed = line.trim();
    return trimmed.length > 0 && trimmed === trimmed.toUpperCase();
  }

  static isLikelyAction(line: string) {
    return line.trim().length > 0 && !/[.:؟!]$/.test(line.trim());
  }

  static isTransition(line: string) {
    return /(FADE\s+OUT|CUT\s+TO|DISSOLVE\s+TO)/i.test(line.trim());
  }
}

export function classifyScreenplay(_text: string): string {
  return "drama";
}

export default ScreenplayClassifier;

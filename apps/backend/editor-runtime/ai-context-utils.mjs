// AI Context Gemini Utilities

/**
 * Regex ???????? JSON objects ?? ???? ???????.
 * ????? ??? ?? JSON object ???? { ... } ????? itemIndex ?? lineIndex.
 */
const JSON_DECISION_RE =
  /\{[^{}]*"(?:itemIndex|lineIndex)"\s*:\s*\d+[^{}]*\}/gu;

/**
 * ????? kebab-case ?? snake_case (scene_header_3  scene_header_3)
 * scene_header_top_line ?? ??? ????? - ?? ??? AI ????? ?????? ?? scene_header_1
 */
const kebabToSnake = (type) => {
  const snake = type.replace(/-/g, "_");
  return snake === "scene_header_top_line" ? "scene_header_1" : snake;
};

/**
 * ???? chunk ??? ??????? ??? ??????? JSON ?????.
 * ???? ????????:
 *   - ????: { itemIndex, finalType, confidence, reason }
 *   - ????: { lineIndex, correctedType, confidence, reason }
 */
const parseCorrectionsFromChunk = (text) => {
  const corrections = [];
  const matches = text.match(JSON_DECISION_RE);
  if (!matches) return corrections;

  for (const match of matches) {
    try {
      const parsed = JSON.parse(match);
      if (parsed.itemIndex !== undefined) {
        corrections.push({
          itemIndex: parsed.itemIndex,
          finalType: kebabToSnake(parsed.finalType ?? parsed.correctedType),
          confidence: parsed.confidence ?? 0.8,
          reason: parsed.reason ?? "AI correction",
        });
      } else if (parsed.lineIndex !== undefined) {
        corrections.push({
          lineIndex: parsed.lineIndex,
          correctedType: kebabToSnake(parsed.correctedType ?? parsed.finalType),
          confidence: parsed.confidence ?? 0.8,
          reason: parsed.reason ?? "Context correction",
        });
      }
    } catch (e) {
      // Skip invalid JSON
    }
  }

  return corrections;
};

export { parseCorrectionsFromChunk };
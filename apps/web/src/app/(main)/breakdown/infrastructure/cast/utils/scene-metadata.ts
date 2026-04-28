// Scene Metadata Extraction Utilities

export interface SceneMetadata {
  location?: string;
  timeOfDay?: "Day" | "Night" | "Dawn" | "Dusk" | "Unknown";
  interior: boolean;
  approximateDuration?: string;
}

/**
 * Extracts metadata from scene headers and content.
 */
export const extractSceneMetadata = (
  header: string,
  content: string
): SceneMetadata => {
  // Determine interior/exterior
  const interior = /int\.|مشهد داخلي|داخلي/i.test(header);

  // Determine time of day
  let timeOfDay: SceneMetadata["timeOfDay"] = "Unknown";
  if (/day|نهار|صباح/i.test(header)) timeOfDay = "Day";
  else if (/night|ليل|مساء/i.test(header)) timeOfDay = "Night";
  else if (/dawn|فجر|شروق/i.test(header)) timeOfDay = "Dawn";
  else if (/dusk|غروب|عصر/i.test(header)) timeOfDay = "Dusk";

  // Extract location
  let location = "Unknown";
  const locationPatterns = [
    /(?:int\.|ext\.)\s*([^.()-]+)/i,
    /مشهد\s*(?:داخلي|خارجي)\s*\.?\s*([^-]+)/i,
    /في\s+([^،.\n]+)/i,
    /at\s+([^،.\n]+)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = header.match(pattern);
    if (match?.[1]) {
      location = match[1].trim();
      break;
    }
  }

  // Estimate duration based on dialogue
  const dialogueLines = content
    .split("\n")
    .filter((line) =>
      /^[A-Z\u0600-\u06FF][A-Z\u0600-\u06FF\s]{2,}$/i.test(line.trim())
    );
  const lineCount = dialogueLines.length;
  let approximateDuration: string | undefined;
  if (lineCount < 5) approximateDuration = "~30 seconds";
  else if (lineCount < 15) approximateDuration = "~1 minute";
  else if (lineCount < 30) approximateDuration = "~2 minutes";
  else approximateDuration = "~3+ minutes";

  return {
    location,
    timeOfDay,
    interior,
    approximateDuration,
  };
};

import {
  success,
  failure,
  asString,
  asRecord,
  buildMoodThemeLabel,
} from "./handlers-shared";
import { runPlugin } from "./plugin-executor";
import { CreativeInspirationAssistant } from "./plugins/creative-inspiration";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";

function extractStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asString(item)).filter(Boolean);
}

function buildAnalysisResponse(
  analysis: Record<string, unknown>,
  mood: string,
  era: string,
) {
  const moodValue = asString(analysis["mood"]) || mood || "neutral";
  const palette = extractStringArray(analysis["colorPalette"]);
  const styleReferences = extractStringArray(analysis["styleReferences"]);

  return {
    theme: moodValue,
    themeAr: buildMoodThemeLabel(moodValue),
    keywords: [
      asString(analysis["era"]) || era || "contemporary",
      ...styleReferences,
    ].slice(0, 6),
    suggestedPalette: {
      name: `${moodValue}-palette`,
      nameAr: `باليت ${buildMoodThemeLabel(moodValue)}`,
      colors: palette,
    },
  };
}

export async function handleInspirationAnalyze(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const sceneDescription = asString(payload["sceneDescription"]);
  const mood = asString(payload["mood"]);
  const era = asString(payload["era"]);

  if (!sceneDescription) {
    return failure("وصف المشهد مطلوب");
  }

  const result = await runPlugin(CreativeInspirationAssistant, {
    type: "analyze",
    data: {
      description: sceneDescription,
      mood: mood || undefined,
      era: era || undefined,
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر تحليل الإلهام البصري");
  }

  const analysis = asRecord(result.data);
  return success({
    data: buildAnalysisResponse(analysis, mood, era),
  });
}

export async function handleInspirationPalette(
  payload: Record<string, unknown>,
): Promise<ArtDirectorHandlerResponse> {
  const mood = asString(payload["mood"]) || "neutral";
  const era = asString(payload["era"]) || "contemporary";

  const result = await runPlugin(CreativeInspirationAssistant, {
    type: "suggest-palette",
    data: { mood, era },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر توليد الباليت");
  }

  const data = asRecord(result.data);
  const palette = extractStringArray(data["palette"]);

  const palettes = [
    {
      name: `${mood}-primary`,
      nameAr: `أساسي ${buildMoodThemeLabel(mood)}`,
      colors: palette,
    },
    {
      name: `${mood}-contrast`,
      nameAr: `تباين ${buildMoodThemeLabel(mood)}`,
      colors: palette.slice().reverse(),
    },
    {
      name: `${mood}-accent`,
      nameAr: `إبراز ${buildMoodThemeLabel(mood)}`,
      colors: palette.map((color, index) =>
        index % 2 === 0 ? color : "#F5F1E8",
      ),
    },
  ];

  return success({ data: { palettes } });
}

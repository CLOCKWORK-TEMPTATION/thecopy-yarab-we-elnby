// Utils for usePostProduction hook

import type { ExportSettings, FootageAnalysisSummary } from "../../types";

/**
 * الحصول على إعدادات التصدير للمنصة
 */
export function getExportSettingsForPlatform(
  platform: ExportSettings["platform"]
): ExportSettings {
  const settingsMap: Record<ExportSettings["platform"], ExportSettings> = {
    "cinema-dcp": {
      platform: "cinema-dcp",
      resolution: "4096x2160",
      frameRate: 24,
      codec: "JPEG2000",
    },
    "broadcast-hd": {
      platform: "broadcast-hd",
      resolution: "1920x1080",
      frameRate: 25,
      codec: "ProRes 422",
    },
    "web-social": {
      platform: "web-social",
      resolution: "1920x1080",
      frameRate: 30,
      codec: "H.264",
    },
    bluray: {
      platform: "bluray",
      resolution: "1920x1080",
      frameRate: 24,
      codec: "H.264 High Profile",
    },
  };

  return settingsMap[platform];
}

export function normalizeFootageSummary(
  validation:
    | {
        score?: number;
        status?: string;
        exposure?: string;
        composition?: string;
        focus?: string;
        colorBalance?: string;
        suggestions?: string[];
        improvements?: string[];
      }
    | undefined
): FootageAnalysisSummary {
  return {
    score: clampScore(validation?.score),
    status: validation?.status ?? "unknown",
    exposure: validation?.exposure ?? "غير متاح",
    colorBalance: validation?.colorBalance ?? "غير متاح",
    focus: validation?.focus ?? "غير متاح",
    suggestions: [
      ...(validation?.suggestions ?? []),
      ...(validation?.improvements ?? []),
    ].filter((value, index, array) => array.indexOf(value) === index),
  };
}

export function clampScore(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

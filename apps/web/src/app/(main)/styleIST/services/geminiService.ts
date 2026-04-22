/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side Gemini service that calls server-side API routes
 */

import {
  DesignBrief,
  ProfessionalDesignResult,
  SimulationConfig,
  FitAnalysisResult,
  ImageGenerationSize,
} from "../types";
import { fileToBase64 } from "../lib/utils";

const API_ENDPOINT = "/api/styleist/execute";

const DEFAULT_BREAKDOWN = {
  basics: "",
  layers: "",
  shoes: "",
  accessories: "",
  materials: "",
  colorPalette: "",
} satisfies ProfessionalDesignResult["breakdown"];

const DEFAULT_PRODUCTION_NOTES = {
  copies: "1",
  distressing: "لا يوجد",
  cameraWarnings: "لا يوجد",
  weatherAlt: "لا يوجد",
  budgetAlt: "لا يوجد",
} satisfies ProfessionalDesignResult["productionNotes"];

const DEFAULT_WEATHER = {
  temp: 0,
  condition: "Unavailable",
  location: "",
} satisfies ProfessionalDesignResult["realWeather"];

function getStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getNumberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getBreakdown(value: unknown): ProfessionalDesignResult["breakdown"] {
  const record = getRecord(value);
  return {
    basics: getStringValue(record?.basics),
    layers: getStringValue(record?.layers),
    shoes: getStringValue(record?.shoes),
    accessories: getStringValue(record?.accessories),
    materials: getStringValue(record?.materials),
    colorPalette: getStringValue(record?.colorPalette),
  };
}

function getProductionNotes(
  value: unknown
): ProfessionalDesignResult["productionNotes"] {
  const record = getRecord(value);
  return {
    copies: getStringValue(record?.copies, DEFAULT_PRODUCTION_NOTES.copies),
    distressing: getStringValue(
      record?.distressing,
      DEFAULT_PRODUCTION_NOTES.distressing
    ),
    cameraWarnings: getStringValue(
      record?.cameraWarnings,
      DEFAULT_PRODUCTION_NOTES.cameraWarnings
    ),
    weatherAlt: getStringValue(
      record?.weatherAlt,
      DEFAULT_PRODUCTION_NOTES.weatherAlt
    ),
    budgetAlt: getStringValue(
      record?.budgetAlt,
      DEFAULT_PRODUCTION_NOTES.budgetAlt
    ),
  };
}

function getWeather(value: unknown): ProfessionalDesignResult["realWeather"] {
  const record = getRecord(value);
  const sources = getStringArray(record?.sources);
  return {
    temp: getNumberValue(record?.temp, DEFAULT_WEATHER.temp),
    condition: getStringValue(record?.condition, DEFAULT_WEATHER.condition),
    location: getStringValue(record?.location, DEFAULT_WEATHER.location),
    ...(sources.length > 0 ? { sources } : {}),
  };
}

async function callGeminiAPI(
  action: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
  }

  return response.json();
}

/**
 * الدالة الرئيسية لتحليل السيناريو وتوليد تصميم الأزياء.
 */
export const generateProfessionalDesign = async (
  brief: DesignBrief
): Promise<ProfessionalDesignResult> => {
  const result = await callGeminiAPI("generateDesign", { brief });
  const conceptArtUrl = getStringValue(result.conceptArtUrl);
  if (!conceptArtUrl) {
    throw new Error("Design generation did not return concept art.");
  }

  return {
    lookTitle: getStringValue(result.lookTitle, "تصميم مخصص"),
    dramaticDescription: getStringValue(result.dramaticDescription),
    breakdown: getBreakdown(result.breakdown ?? DEFAULT_BREAKDOWN),
    rationale: getStringArray(result.rationale),
    productionNotes: getProductionNotes(
      result.productionNotes ?? DEFAULT_PRODUCTION_NOTES
    ),
    imagePrompt: getStringValue(result.imagePrompt),
    conceptArtUrl,
    realWeather: getWeather(result.realWeather ?? DEFAULT_WEATHER),
  };
};

/**
 * Transcribe audio using Gemini.
 */
export const transcribeAudio = async (
  audioBlob: Blob | File
): Promise<string> => {
  const base64 = await fileToBase64(audioBlob as File);
  const result = await callGeminiAPI("transcribeAudio", {
    audioBase64: base64,
    mimeType: audioBlob.type || "audio/webm",
  });
  return getStringValue(result.text);
};

/**
 * Analyze video content for costume design inspiration.
 */
export const analyzeVideoContent = async (videoFile: File): Promise<string> => {
  const base64 = await fileToBase64(videoFile);
  const result = await callGeminiAPI("analyzeVideo", {
    videoBase64: base64,
    mimeType: videoFile.type,
  });
  return getStringValue(result.analysis);
};

/**
 * Generate a garment asset.
 */
export const generateGarmentAsset = async (
  prompt: string,
  size: ImageGenerationSize = "1K"
): Promise<{ url: string; name: string }> => {
  const result = await callGeminiAPI("generateGarment", { prompt, size });
  const imageUrl = getStringValue(result.imageUrl);
  if (!imageUrl) {
    throw new Error("Garment generation did not return an image.");
  }
  return {
    url: imageUrl,
    name: prompt.slice(0, 30),
  };
};

/**
 * Generate a virtual fit result.
 */
export const generateVirtualFit = async (
  garmentUrl: string,
  personImageUrl: string,
  config: SimulationConfig
): Promise<FitAnalysisResult> => {
  const result = await callGeminiAPI("generateVirtualFit", {
    garmentUrl,
    personUrl: personImageUrl,
    config,
  });

  return {
    compatibilityScore: getNumberValue(result.compatibilityScore),
    safetyIssues: getStringArray(result.safetyIssues),
    fabricNotes: getStringValue(result.fabricNotes || result.fitDescription),
    movementPrediction: getStringValue(result.movementPrediction),
  };
};

/**
 * Generate a stress test analysis for a garment under specific conditions.
 */
export const generateStressTestVideo = async (
  garmentUrl: string,
  config: SimulationConfig
): Promise<{ videoUrl: string; report: string }> => {
  const result = await callGeminiAPI("stressTest", {
    garmentUrl,
    config,
  });
  return {
    videoUrl: getStringValue(result.videoUrl),
    report: getStringValue(result.report, "لم يتم إنشاء تقرير اختبار الإجهاد"),
  };
};

/**
 * Edit a garment image with AI.
 */
export const editGarmentImage = async (
  imageFileOrUrl: File | string,
  editPrompt: string
): Promise<{ url: string; name: string }> => {
  const imageUrl =
    typeof imageFileOrUrl === "string"
      ? imageFileOrUrl
      : await fileToBase64(imageFileOrUrl);
  const result = await callGeminiAPI("editGarment", { imageUrl, editPrompt });
  const editedImageUrl = getStringValue(result.imageUrl);
  if (!editedImageUrl) {
    throw new Error("Garment editing did not return an image.");
  }
  return {
    url: editedImageUrl,
    name: editPrompt.slice(0, 30),
  };
};

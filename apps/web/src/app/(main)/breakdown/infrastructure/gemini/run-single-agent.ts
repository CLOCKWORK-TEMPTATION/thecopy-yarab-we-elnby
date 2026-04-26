import { Schema, Type } from "@google/genai";
import { z } from "zod";

import { GEMINI_MODELS } from "../../domain/constants";
import { AGENT_PERSONAS } from "../agents/configs";

import { getGeminiClient } from "./client";

export interface SingleAgentAnalysisPayload {
  analysis: string[];
  suggestions: string[];
  warnings: string[];
}

const singleAgentSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis: { type: Type.ARRAY, items: { type: Type.STRING } },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["analysis", "suggestions", "warnings"],
};

const singleAgentPayloadSchema = z.object({
  analysis: z.array(z.string()).default([]),
  suggestions: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
});

function parseSingleAgentPayload(text: string): SingleAgentAnalysisPayload {
  const parsed = JSON.parse(text.trim()) as unknown;
  return singleAgentPayloadSchema.parse(parsed);
}

/**
 * تنفيذ استدعاء Gemini لوكيل تحليل منفرد.
 *
 * هذا الملف موجود داخل `infrastructure/gemini/` لأن هذه الطبقة هي
 * المصدر الرسمي الوحيد الذي يُسمح له بإنشاء محادثات Gemini داخل Breakdown.
 */
export const runSingleAgentGeneration = async (
  agentKey: string,
  sceneContent: string
): Promise<SingleAgentAnalysisPayload> => {
  const persona = AGENT_PERSONAS[agentKey as keyof typeof AGENT_PERSONAS];
  const prompt = `You are the ${agentKey.toUpperCase()} Agent for film production.
Your specialty: ${persona?.focus || agentKey}

Analyze the following scene and provide:
1. analysis
2. suggestions
3. warnings

Return ONLY valid JSON.`;

  const response = await getGeminiClient().models.generateContent({
    model: GEMINI_MODELS.analysis,
    contents: [
      { role: "user", parts: [{ text: prompt }] },
      { role: "user", parts: [{ text: `SCENE:\n${sceneContent}` }] },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: singleAgentSchema,
    },
  });

  if (!response.text) {
    return { analysis: [], suggestions: [], warnings: [] };
  }

  return parseSingleAgentPayload(response.text);
};

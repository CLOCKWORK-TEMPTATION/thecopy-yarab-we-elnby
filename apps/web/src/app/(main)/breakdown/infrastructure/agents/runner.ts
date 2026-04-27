import { Schema, Type } from "@google/genai";

import {
  isUnknownRecord,
  stringArrayFromUnknown,
} from "@/lib/utils/unknown-values";

import { GEMINI_MODELS, TECHNICAL_AGENT_KEYS } from "../../domain/constants";
import { logError } from "../../domain/errors";
import { getGeminiClient } from "../gemini/client";

import { AGENT_PERSONAS } from "./configs";

import type {
  SceneBreakdown,
  TechnicalBreakdownKey,
} from "../../domain/models";

export type BreakdownAgentResult = Pick<SceneBreakdown, TechnicalBreakdownKey>;
export type BreakdownAgentKey = TechnicalBreakdownKey;

const itemsSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    items: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["items"],
};

function buildAgentPrompt(agentKey: BreakdownAgentKey): string {
  const persona = AGENT_PERSONAS[agentKey];

  return `
You are the **${persona.role}**.
Analyze the script scene for **${persona.focus}**.

FOCUS:
${persona.focus}

RULES:
${persona.extractionRules}

Return JSON: { "items": string[] }
  `;
}

function parseAgentItems(responseText: string | undefined): string[] {
  if (!responseText) {
    return [];
  }

  const parsed: unknown = JSON.parse(responseText);
  if (!isUnknownRecord(parsed)) {
    return [];
  }

  return stringArrayFromUnknown(parsed["items"]);
}

export const runConfiguredAgent = async (
  agentKey: BreakdownAgentKey,
  sceneContent: string,
  apiKey?: string
): Promise<string[]> => {
  try {
    const response = await getGeminiClient(apiKey).models.generateContent({
      model: GEMINI_MODELS.analysis,
      contents: [
        { role: "user", parts: [{ text: buildAgentPrompt(agentKey) }] },
        { role: "user", parts: [{ text: `SCENE CONTENT:\n${sceneContent}` }] },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: itemsSchema,
      },
    });

    return parseAgentItems(response.text);
  } catch (error) {
    logError(`runConfiguredAgent.${agentKey}`, error);
    return [];
  }
};

export const runAllBreakdownAgents = async (
  sceneContent: string,
  apiKey?: string
): Promise<BreakdownAgentResult> => {
  const results = await Promise.all(
    TECHNICAL_AGENT_KEYS.map((agentKey) =>
      runConfiguredAgent(agentKey, sceneContent, apiKey)
    )
  );

  return TECHNICAL_AGENT_KEYS.reduce((acc, agentKey, index) => {
    acc[agentKey] = results[index] ?? [];
    return acc;
  }, {} as BreakdownAgentResult);
};

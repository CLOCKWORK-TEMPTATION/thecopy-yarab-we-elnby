import { GoogleGenAI, Type, Schema } from "@google/genai";

import { logger } from "@/lib/ai/utils/logger";

/**
 * Cast Agent AI Module
 * Google GenAI integration for advanced character analysis
 */

import { normalizeCastMember } from "../../infrastructure/cast/utils/validation";
import { getGeminiApiKeyFromEnv } from "../../infrastructure/gemini/env";

import { DEFAULT_CAST_MODEL } from "./constants";

import type { CastAgentOptions } from "./types";
import type { ExtendedCastMember } from "../../types";

// ============================================
// AI INITIALIZATION
// ============================================

/**
 * Initialize Google GenAI with API key - Safe handling
 */
const getAI = (apiKey?: string): GoogleGenAI => {
  const keyToUse = apiKey ?? getGeminiApiKeyFromEnv();

  if (!keyToUse) {
    logger.warn("⚠️ Warning: GEMINI_API_KEY environment variable is not set.");
  }

  return new GoogleGenAI({ apiKey: keyToUse });
};

// ============================================
// PROMPT BUILDER
// ============================================

/**
 * Build the analysis prompt for the AI model
 */
function buildAnalysisPrompt(content: string, language: string): string {
  return `You are the "Casting Director Agent" for a film production.

Analyze the provided ${language} scene text and identify every speaking character or significant figure.

For each character, provide:
1. **name**: The character's name exactly as written in the script
2. **nameArabic**: Arabic name translation if applicable (null if not)
3. **roleCategory**: Role Category - One of: "Lead", "Supporting", "Bit Part", "Silent", "Group", "Mystery"
4. **ageRange**: Estimated Age Range (e.g., "30s", "Teen", "Child", "Elderly", "40-50")
5. **gender**: "Male", "Female", "Non-binary", or "Unknown"
6. **visualDescription**: Visual Description (Physical appearance details mentioned or implied, 2-3 sentences)
7. **motivation**: What this character wants in this specific scene (1-2 sentences)
8. **personalityTraits**: Array of personality traits if observable (optional)
9. **relationships**: Array of relationship objects { character: "name", type: "relationship" } if mentioned (optional)

Return ONLY a valid JSON object with a "members" array containing all characters.

SCRIPT TO ANALYZE:
${content.substring(0, 25000)}`;
}

// ============================================
// SCHEMA BUILDER
// ============================================

/**
 * Build the JSON schema for structured AI response
 */
function buildCastSchema(): Schema {
  return {
    type: Type.OBJECT,
    properties: {
      members: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: {
              type: Type.STRING,
              description: "Unique character identifier",
            },
            name: {
              type: Type.STRING,
              description: "Character name as written in script",
            },
            nameArabic: {
              type: Type.STRING,
              description: "Arabic name if applicable",
            },
            roleCategory: {
              type: Type.STRING,
              description:
                "Lead, Supporting, Bit Part, Silent, Group, or Mystery",
              enum: [
                "Lead",
                "Supporting",
                "Bit Part",
                "Silent",
                "Group",
                "Mystery",
              ],
            },
            ageRange: {
              type: Type.STRING,
              description: "Age range like 30s, Teen, Child, Elderly",
            },
            gender: {
              type: Type.STRING,
              description: "Male, Female, Non-binary, or Unknown",
              enum: ["Male", "Female", "Non-binary", "Unknown"],
            },
            visualDescription: {
              type: Type.STRING,
              description: "Visual appearance description",
            },
            motivation: {
              type: Type.STRING,
              description: "Character's goal in this scene",
            },
            personalityTraits: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Observable personality traits",
            },
            relationships: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  character: { type: Type.STRING },
                  type: { type: Type.STRING },
                },
              },
              description: "Relationships to other characters",
            },
          },
          required: [
            "name",
            "roleCategory",
            "ageRange",
            "gender",
            "visualDescription",
            "motivation",
          ],
        },
      },
    },
    required: ["members"],
  };
}

// ============================================
// LANGUAGE DETECTION
// ============================================

/**
 * Detect script language from content
 */
function detectScriptLanguage(content: string): string {
  const hasArabic = /[\u0600-\u06FF]/.test(content);
  const hasEnglish = /[a-zA-Z]/.test(content);

  if (hasArabic && hasEnglish) return "Arabic and English";
  if (hasArabic) return "Arabic";
  return "English";
}

// ============================================
// MAIN AI AGENT FUNCTION
// ============================================

/**
 * Independent Cast Agent using Google GenAI.
 * Focused solely on extracting deep character details from the scene.
 */
export const runCastAgent = async (
  sceneContent: string,
  options: CastAgentOptions = {}
): Promise<ExtendedCastMember[]> => {
  const { apiKey, model = DEFAULT_CAST_MODEL } = options;
  const ai = getAI(apiKey);

  const scriptLanguage = detectScriptLanguage(sceneContent);
  const prompt = buildAnalysisPrompt(sceneContent, scriptLanguage);
  const castSchema = buildCastSchema();

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [
        { role: "user", parts: [{ text: prompt }] },
        { role: "user", parts: [{ text: `SCENE CONTENT:\n${sceneContent}` }] },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: castSchema,
      },
    });

    interface CastMember {
      id?: string;
      [k: string]: unknown;
    }
    const result = response.text
      ? (JSON.parse(response.text) as { members?: CastMember[] })
      : { members: [] };

    const generatedAt = Date.now();

    return (result.members ?? []).map((member: CastMember, index: number) => {
      const id =
        typeof member.id === "string" && member.id
          ? member.id
          : `char-${generatedAt}-${index}`;
      return normalizeCastMember({ ...member, id });
    });
  } catch (error) {
    logger.error("Cast Agent Error:", error);
    return [];
  }
};

/**
 * Boundary module for Gemini Service
 * Provides typed interfaces for AI provider interactions
 */

import type {
  CharacterAnalysis,
  DialogueAnalysis,
  Relationship,
  Conflict,
  Theme,
} from "./response-types";
import type { GeminiService as GeminiServiceClass } from "../stations/gemini-service";

/**
 * Typed interface for Gemini Service operations
 * This boundary ensures all AI provider interactions are type-safe
 */
export interface GeminiServiceBoundary {
  /**
   * Generate text content with typed validation
   */
  generateText(
    prompt: string,
    options?: {
      temperature?: number;
      maxTokens?: number;
      systemInstruction?: string;
      context?: string;
    }
  ): Promise<string>;

  /**
   * Generate and validate character analysis
   */
  generateCharacterAnalysis(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<CharacterAnalysis>;

  /**
   * Generate and validate relationships
   */
  generateRelationships(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<Relationship[]>;

  /**
   * Generate and validate conflicts
   */
  generateConflicts(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<Conflict[]>;

  /**
   * Generate and validate themes
   */
  generateThemes(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<Theme[]>;

  /**
   * Generate dialogue analysis
   */
  generateDialogueAnalysis(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<DialogueAnalysis>;
}

/**
 * Creates a typed boundary wrapper around GeminiService
 */
export function createGeminiServiceBoundary(
  service: GeminiServiceClass
): GeminiServiceBoundary {
  return {
    async generateText(prompt, options = {}) {
      const request: {
        prompt: string;
        temperature: number;
        maxTokens: number;
        systemInstruction?: string;
        context?: string;
      } = {
        prompt,
        temperature: options.temperature ?? 0.4,
        maxTokens: options.maxTokens ?? 4096,
      };
      if (options.systemInstruction !== undefined) {
        request.systemInstruction = options.systemInstruction;
      }
      if (options.context !== undefined) {
        request.context = options.context;
      }
      const response = await service.generate<{ raw: string }>(request);

      if (
        typeof response.content === "object" &&
        response.content !== null &&
        "raw" in response.content
      ) {
        return (response.content).raw;
      }

      return String(response.content);
    },

    async generateCharacterAnalysis(_prompt, _options = {}) {
      // In a real implementation, we would parse the text as JSON or structured data
      // For now, we return a basic structure
      return {
        character: { name: "Unknown" },
        analysis: "text",
      };
    },

    async generateRelationships(_prompt, _options = {}) {
      // Parse relationships from text response
      // For now, return empty array - would need proper parsing
      return [];
    },

    async generateConflicts(_prompt, _options = {}) {
      // Parse conflicts from text response
      return [];
    },

    async generateThemes(_prompt, _options = {}) {
      // Parse themes from text response
      return [];
    },

    async generateDialogueAnalysis(prompt, options = {}) {
      const text = await this.generateText(prompt, options);
      return {
        text,
      };
    },
  };
}

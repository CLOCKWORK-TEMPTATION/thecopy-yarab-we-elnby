/**
 * Type-safe response types for AI layer
 * Using Zod schemas for validation and discriminated unions for success/failure
 */

import { z } from "zod";

// =====================================================
// Base Response Schemas
// =====================================================

/**
 * Base response wrapper with discriminated union for success/failure
 */
export const BaseResponseSchema = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    data: z.unknown(),
    metadata: z
      .object({
        timestamp: z.string().optional(),
        version: z.string().optional(),
        model: z.string().optional(),
      })
      .passthrough(),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
    metadata: z
      .object({
        timestamp: z.string().optional(),
        version: z.string().optional(),
        model: z.string().optional(),
      })
      .passthrough()
      .optional(),
  }),
]);

export type BaseResponse = z.infer<typeof BaseResponseSchema>;

// =====================================================
// Character Schemas
// =====================================================

export const CharacterSchema = z
  .object({
    name: z.string(),
    role: z.string().optional(),
  })
  .passthrough();

export type Character = z.infer<typeof CharacterSchema>;

export const CharacterAnalysisSchema = z
  .object({
    character: CharacterSchema,
    analysis: z.string().optional(),
  })
  .passthrough();

export type CharacterAnalysis = z.infer<typeof CharacterAnalysisSchema>;

// =====================================================
// Relationship Schemas
// =====================================================

export const RelationshipSchema = z
  .object({
    id: z.string().optional(),
    source: z.string(),
    target: z.string(),
    type: z.string().optional(),
    strength: z.number().optional(),
  })
  .passthrough();

export type Relationship = z.infer<typeof RelationshipSchema>;

// =====================================================
// Conflict Schemas
// =====================================================

export const ConflictSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    type: z.string().optional(),
    subject: z.string().optional(),
    scope: z.string().optional(),
    involvedCharacters: z.array(z.string()).optional(),
    strength: z.number().optional(),
    timestamps: z.array(z.date()).optional(),
    description: z.string().optional(),
  })
  .passthrough();

export type Conflict = z.infer<typeof ConflictSchema>;

// =====================================================
// Theme Schemas
// =====================================================

export const ThemeSchema = z
  .object({
    name: z.string(),
    description: z.string().optional(),
  })
  .passthrough();

export type Theme = z.infer<typeof ThemeSchema>;

// =====================================================
// Dialogue Schemas
// =====================================================

export const DialogueAnalysisSchema = z
  .object({
    speaker: z.string().optional(),
    text: z.string().optional(),
  })
  .passthrough();

export type DialogueAnalysis = z.infer<typeof DialogueAnalysisSchema>;

// =====================================================
// Uncertainty Schemas
// =====================================================

export const UncertaintyReportSchema = z
  .object({
    confidence: z.number().optional(),
  })
  .passthrough();

export type UncertaintyReport = z.infer<typeof UncertaintyReportSchema>;

// =====================================================
// Audience Schemas
// =====================================================

export const AudienceProfileSchema = z
  .object({
    demographics: z.array(z.string()).optional(),
  })
  .passthrough();

export type AudienceProfile = z.infer<typeof AudienceProfileSchema>;

// =====================================================
// Score Matrix Schemas
// =====================================================

export const ScoreMatrixSchema = z
  .object({
    scores: z.record(z.string(), z.number()).optional(),
  })
  .passthrough();

export type ScoreMatrix = z.infer<typeof ScoreMatrixSchema>;

// =====================================================
// Recommendation Schemas
// =====================================================

export const RecommendationSchema = z
  .object({
    text: z.string(),
    priority: z.string().optional(),
  })
  .passthrough();

export type Recommendation = z.infer<typeof RecommendationSchema>;

// =====================================================
// Debate Result Schemas
// =====================================================

export const DebateResultSchema = z
  .object({
    conclusion: z.string().optional(),
  })
  .passthrough();

export type DebateResult = z.infer<typeof DebateResultSchema>;

// =====================================================
// Conflict Network Schemas
// =====================================================

export const ConflictNetworkSchema = z
  .object({
    characters: z.record(z.string(), CharacterSchema),
    relationships: z.record(z.string(), z.array(RelationshipSchema)),
    conflicts: z.record(z.string(), ConflictSchema).optional(),
  })
  .passthrough();

export type ConflictNetwork = z.infer<typeof ConflictNetworkSchema>;

// =====================================================
// Context Schemas
// =====================================================

export const CharacterContextSchema = z.object({
  name: z.string(),
  role: z.string().optional(),
  traits: z.array(z.string()).optional(),
  relationships: z.record(z.string(), z.string()).optional(),
});

export type CharacterContext = z.infer<typeof CharacterContextSchema>;

export const NarrativeContextSchema = z.object({
  title: z.string().optional(),
  genre: z.string().optional(),
  theme: z.string().optional(),
  plot: z.string().optional(),
  structure: z.string().optional(),
});

export type NarrativeContext = z.infer<typeof NarrativeContextSchema>;

export const AnalysisContextSchema = z.object({
  inputText: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  previousAnalysis: z.unknown().optional(),
});

export type AnalysisContext = z.infer<typeof AnalysisContextSchema>;

// =====================================================
// Station Result Schemas
// =====================================================

/**
 * Generic station result type that can be validated
 */
export const StationResultSchema = z.unknown();

export type StationResult = z.infer<typeof StationResultSchema>;

/**
 * Previous results from stations (can be any structured data)
 */
export const PreviousResultsSchema = z.record(z.string(), z.unknown());

export type PreviousResults = z.infer<typeof PreviousResultsSchema>;

/**
 * Text chunks for RAG
 */
export const TextChunkSchema = z.object({
  text: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  index: z.number().optional(),
});

export type TextChunk = z.infer<typeof TextChunkSchema>;

/**
 * Context map for RAG
 */
export const ContextMapSchema = z.record(z.string(), z.unknown());

export type ContextMap = z.infer<typeof ContextMapSchema>;

// =====================================================
// Helper Functions for Validation
// =====================================================

/**
 * Validates and parses a response using a Zod schema
 */
export function validateResponse<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  return schema.parse(data);
}

/**
 * Safely validates a response, returning a result type
 */
export function safeValidateResponse<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

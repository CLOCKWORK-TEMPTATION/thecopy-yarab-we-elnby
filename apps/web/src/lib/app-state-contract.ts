import { z } from "zod";

export const APP_STATE_IDS = [
  "BREAKAPP",
  "BUDGET",
  "actorai-arabic",
  "actorai-arabic-self-tape",
  "analysis",
  "art-director",
  "arabic-creative-writing-studio",
  "arabic-prompt-engineering-studio",
  "brain-storm-ai",
  "breakdown",
  "cinematography-studio",
  "development",
  "directors-studio",
  "editor",
  "styleIST",
] as const;

export const AppStateIdSchema = z.enum(APP_STATE_IDS);

export type AppStateId = z.infer<typeof AppStateIdSchema>;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(JsonValueSchema),
  ])
);

export const AppStatePayloadSchema = z.record(JsonValueSchema);

export type AppStatePayload = z.infer<typeof AppStatePayloadSchema>;

export const AppStateEnvelopeSchema = z.object({
  version: z.literal(1),
  app: AppStateIdSchema,
  updatedAt: z.string(),
  data: AppStatePayloadSchema,
});

export type AppStateEnvelope = z.infer<typeof AppStateEnvelopeSchema>;

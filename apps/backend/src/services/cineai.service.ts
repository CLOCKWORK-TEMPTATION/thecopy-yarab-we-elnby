import { platformGenAIService } from '@/services/platform-genai.service';

// عقد المدخلات والمخرجات الصارم لخدمة CineAI.
// تم استبدال `Record<string, any>` بـ schemas محكمة عبر zod مع type-guards.
import { z } from 'zod';

interface ValidateShotInput {
  imageBase64?: string;
  mimeType?: string;
  mood?: string;
  analysisType?: string;
}

interface ColorGradingInput {
  sceneType?: string;
  mood?: string;
  temperature?: number;
}

// schema للمخرج المتوقع من فاحص اللقطة
const technicalDetailsSchema = z
  .object({
    histogram: z.string().optional(),
    waveform: z.string().optional(),
    vectorscope: z.string().optional(),
  })
  .partial()
  .passthrough();

const shotValidationResultSchema = z
  .object({
    score: z.number(),
    status: z.string(),
    exposure: z.string().optional(),
    composition: z.string().optional(),
    focus: z.string().optional(),
    colorBalance: z.string().optional(),
    suggestions: z.array(z.string()).optional(),
    technicalDetails: technicalDetailsSchema.optional(),
    strengths: z.array(z.string()).optional(),
    improvements: z.array(z.string()).optional(),
  })
  .passthrough();

export type ShotValidationResult = z.infer<typeof shotValidationResultSchema>;

const colorPaletteResultSchema = z
  .object({
    palette: z.array(z.string()),
    primaryColor: z.string(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    suggestions: z.array(z.string()).optional(),
    lutRecommendation: z.string().optional(),
    cinematicReferences: z.array(z.string()).optional(),
  })
  .passthrough();

export type ColorPaletteResult = z.infer<typeof colorPaletteResultSchema>;

// محاولة استخراج JSON صالح من نص قد يحتوي على code fences أو نص محيط.
// النتيجة `unknown` ثم تتحقق منها الدالة المنادية عبر zod schema.
function extractJsonCandidate(text: string): unknown {
  const normalized = text.trim();
  const candidates = new Set<string>();

  candidates.add(normalized);

  const fenceStripped = normalized
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  if (fenceStripped) {
    candidates.add(fenceStripped);
  }

  const firstBrace = fenceStripped.indexOf("{");
  const lastBrace = fenceStripped.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.add(fenceStripped.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      // جرب المرشح التالي
    }
  }

  throw new Error("The AI provider returned an invalid shot validation payload.");
}

function parseShotValidationPayload(text: string): ShotValidationResult {
  const candidate = extractJsonCandidate(text);
  const result = shotValidationResultSchema.safeParse(candidate);
  if (!result.success) {
    throw new Error(
      `Shot validation payload failed schema validation: ${result.error.message}`
    );
  }
  return result.data;
}

export class CineAIService {
  // فحص اللقطة سواءً مع صورة مرجعية أو بدونها
  async validateShot(input: ValidateShotInput): Promise<ShotValidationResult> {
    const withImage = Boolean(input.imageBase64 && input.mimeType);

    if (withImage) {
      const text = await platformGenAIService.generateTextFromMedia(
        `You are an expert cinematographer. Analyze this frame technically and return ONLY valid JSON:
{
  "score": 0,
  "status": "excellent",
  "exposure": "Good",
  "composition": "Good",
  "focus": "Good",
  "colorBalance": "Good",
  "suggestions": ["string"],
  "technicalDetails": {
    "histogram": "string",
    "waveform": "string",
    "vectorscope": "string"
  },
  "strengths": ["string"],
  "improvements": ["string"]
}`,
        {
          data: input.imageBase64!,
          mimeType: input.mimeType!,
        },
        { temperature: 0.25, maxOutputTokens: 4096 }
      );

      return parseShotValidationPayload(text);
    }

    const prompt = `You are an expert cinematographer. No reference frame is available, so perform a technical preflight review based on the provided intent and return ONLY valid JSON:
{
  "score": 0,
  "status": "good",
  "exposure": "Good",
  "composition": "Good",
  "focus": "Good",
  "colorBalance": "Good",
  "suggestions": ["string"],
  "technicalDetails": {
    "histogram": "string",
    "waveform": "string",
    "vectorscope": "string"
  },
  "strengths": ["string"],
  "improvements": ["string"]
}

Input:
${JSON.stringify(input ?? {}, null, 2)}`;

    const raw = await platformGenAIService.generateJson<unknown>(prompt, {
      temperature: 0.3,
      maxOutputTokens: 4096,
    });
    const validated = shotValidationResultSchema.safeParse(raw);
    if (!validated.success) {
      throw new Error(
        `Shot validation prompt response failed schema validation: ${validated.error.message}`
      );
    }
    return validated.data;
  }

  // توليد لوحة ألوان سينمائية مبنية على نوع المشهد والمزاج
  async generateColorPalette(input: ColorGradingInput): Promise<ColorPaletteResult> {
    if (!input.sceneType?.trim()) {
      throw new Error('Scene type is required.');
    }

    const prompt = `You are a cinematic color grading expert.

Return ONLY valid JSON:
{
  "palette": ["#000000", "#111111", "#222222", "#333333", "#444444"],
  "primaryColor": "#000000",
  "secondaryColor": "#111111",
  "accentColor": "#222222",
  "suggestions": ["string"],
  "lutRecommendation": "string",
  "cinematicReferences": ["string"]
}

Input:
${JSON.stringify(input, null, 2)}`;

    const raw = await platformGenAIService.generateJson<unknown>(prompt, {
      temperature: 0.35,
      maxOutputTokens: 4096,
    });
    const validated = colorPaletteResultSchema.safeParse(raw);
    if (!validated.success) {
      throw new Error(
        `Color palette response failed schema validation: ${validated.error.message}`
      );
    }
    return validated.data;
  }
}

export const cineAIService = new CineAIService();

import { GoogleGenAI } from '@google/genai';
import { env } from '@/config/env';

interface JsonGenerationOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

type TextGenerationOptions = JsonGenerationOptions;

interface InlineMedia {
  data: string;
  mimeType: string;
}

interface GeneratedImagePayload {
  imageBytes?: string;
  data?: string;
}

type GenerateContentRequest = Parameters<GoogleGenAI["models"]["generateContent"]>[0];
type GenerateImagesRequest = Parameters<GoogleGenAI["models"]["generateImages"]>[0];

interface TextGenerationResult {
  text?: string;
  response?: {
    text?: string | (() => string);
  };
}

interface ImageGenerationResult {
  generatedImages?: Array<{
    image?: GeneratedImagePayload;
  }>;
}

interface EditableImageModel {
  editImage(request: Record<string, unknown>): Promise<ImageGenerationResult>;
}

/** Tri-state: not-configured | configured-failing | ready */
export type AIProviderTriState = 'not-configured' | 'configured-failing' | 'ready';

export interface AIProviderHealthStatus {
  status: 'healthy' | 'unhealthy';
  triState: AIProviderTriState;
  responseTime: number;
  message?: string;
  error?: string;
  details?: Record<string, unknown>;
}

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_IMAGE_EDIT_MODEL = 'gemini-2.5-flash-image-preview';
const DEFAULT_IMAGE_GENERATION_MODEL = 'imagen-3.0-generate-002';

function isTextGenerationResult(value: unknown): value is TextGenerationResult {
  return typeof value === 'object' && value !== null;
}

function extractText(result: unknown): string {
  if (!isTextGenerationResult(result)) {
    return '';
  }

  if (typeof result.text === 'string') {
    return result.text;
  }

  if (typeof result.response?.text === 'function') {
    return result.response.text();
  }

  if (typeof result.response?.text === 'string') {
    return result.response.text;
  }

  return '';
}

function normalizeProviderError(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('API key expired')) {
    return new Error(
      'GOOGLE_GENAI_API_KEY is configured but expired. Renew the key before using AI-backed routes.'
    );
  }

  if (message.includes('API_KEY_INVALID') || message.includes('API key not valid')) {
    return new Error(
      'GOOGLE_GENAI_API_KEY is invalid. Fix the AI provider credential before using AI-backed routes.'
    );
  }

  if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
    return new Error('The AI provider quota is exhausted.');
  }

  return new Error(message);
}

export class PlatformGenAIService {
  private client: GoogleGenAI | null = null;
  private healthCache: { expiresAt: number; result: AIProviderHealthStatus } | null =
    null;
  private healthProbeInFlight: Promise<AIProviderHealthStatus> | null = null;

  private getClient(): GoogleGenAI {
    if (this.client) {
      return this.client;
    }

    // Prefer the canonical GEMINI alias first because the editor runtime and
    // several shared packages already standardize on it, then fall back to the
    // legacy GOOGLE_GENAI alias for backward compatibility.
    const apiKey = env.GEMINI_API_KEY || env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not configured. The AI provider is required for this operation.'
      );
    }

    this.client = new GoogleGenAI({ apiKey });
    return this.client;
  }

  async generateJson<T>(
    prompt: string,
    options: JsonGenerationOptions = {}
  ): Promise<T> {
    try {
      const client = this.getClient();
      const result = await client.models.generateContent({
        model: options.model ?? DEFAULT_TEXT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      } as GenerateContentRequest);

      const text = extractText(result).trim();
      if (!text) {
        throw new Error('The AI provider returned an empty JSON payload.');
      }

      try {
        return JSON.parse(text) as T;
      } catch {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start >= 0 && end > start) {
          return JSON.parse(text.slice(start, end + 1)) as T;
        }
        throw new Error('The AI provider returned an invalid JSON payload.');
      }
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  async generateText(
    prompt: string,
    options: TextGenerationOptions = {}
  ): Promise<string> {
    try {
      const client = this.getClient();
      const result = await client.models.generateContent({
        model: options.model ?? DEFAULT_TEXT_MODEL,
        contents: prompt,
        config: {
          temperature: options.temperature ?? 0.5,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      } as GenerateContentRequest);

      const text = extractText(result).trim();
      if (!text) {
        throw new Error('The AI provider returned an empty response.');
      }

      return text;
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  async generateTextFromMedia(
    prompt: string,
    media: InlineMedia,
    options: TextGenerationOptions = {}
  ): Promise<string> {
    try {
      const client = this.getClient();
      const result = await client.models.generateContent({
        model: options.model ?? DEFAULT_TEXT_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  data: media.data,
                  mimeType: media.mimeType,
                },
              },
            ],
          },
        ],
        config: {
          temperature: options.temperature ?? 0.4,
          maxOutputTokens: options.maxOutputTokens ?? 8192,
        },
      } as GenerateContentRequest);

      const text = extractText(result).trim();
      if (!text) {
        throw new Error('The AI provider returned an empty media response.');
      }

      return text;
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  // eslint-disable-next-line complexity
  async generateImage(
    prompt: string,
    options: { model?: string } = {}
  ): Promise<string> {
    try {
      const client = this.getClient();
      const result = await client.models.generateImages({
        model: options.model ?? DEFAULT_IMAGE_GENERATION_MODEL,
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
      } as GenerateImagesRequest);

      const image = result?.generatedImages?.[0]?.image as
        | GeneratedImagePayload
        | undefined;
      const bytes = image?.imageBytes ?? image?.data;

      if (!bytes) {
        throw new Error('The AI provider did not return an image payload.');
      }

      return `data:image/png;base64,${bytes}`;
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }
  // eslint-disable-next-line complexity
  async editImage(
    prompt: string,
    sourceImage: InlineMedia,
    options: { model?: string } = {}
  ): Promise<string> {
    try {
      const client = this.getClient();
      const editableModels = client.models as unknown as EditableImageModel;
      const result = await editableModels.editImage({
        model: options.model ?? DEFAULT_IMAGE_EDIT_MODEL,
        prompt,
        referenceImages: [
          {
            mimeType: sourceImage.mimeType,
            imageBytes: sourceImage.data,
          },
        ],
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
      });

      const image = result?.generatedImages?.[0]?.image as
        | GeneratedImagePayload
        | undefined;
      const bytes = image?.imageBytes ?? image?.data;

      if (!bytes) {
        throw new Error('The AI provider did not return an edited image payload.');
      }

      return `data:image/png;base64,${bytes}`;
    } catch (error) {
      throw normalizeProviderError(error);
    }
  }

  async probeHealth(options: { force?: boolean } = {}): Promise<AIProviderHealthStatus> {
    const now = Date.now();

    if (!options.force && this.healthCache && this.healthCache.expiresAt > now) {
      return this.healthCache.result;
    }

    if (!options.force && this.healthProbeInFlight) {
      return this.healthProbeInFlight;
    }

    const probe = this.runHealthProbe()
      .then((result) => {
        const ttl = result["status"] === 'healthy' ? 5 * 60 * 1000 : 60 * 1000;
        this.healthCache = {
          expiresAt: Date.now() + ttl,
          result,
        };
        return result;
      })
      .finally(() => {
        this.healthProbeInFlight = null;
      });

    this.healthProbeInFlight = probe;
    return probe;
  }

  private async runHealthProbe(): Promise<AIProviderHealthStatus> {
    const startedAt = Date.now();
    const hasKey = Boolean(env.GOOGLE_GENAI_API_KEY || env.GEMINI_API_KEY);
    const details = { provider: 'google-genai', credentialsConfigured: hasKey };
    const buildProbeResult = (
      result: Omit<AIProviderHealthStatus, 'details'>
    ): AIProviderHealthStatus => ({
      ...result,
      details,
    });

    if (!hasKey) {
      return buildProbeResult({
        status: 'unhealthy',
        triState: 'not-configured',
        responseTime: 0,
        error: 'GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not configured.',
      });
    }

    try {
      await Promise.race([
        this.generateText('Reply with OK only.', { temperature: 0, maxOutputTokens: 8 }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('AI probe timed out (10 s).')), 10000);
        }),
      ]);
      return buildProbeResult({
        status: 'healthy',
        triState: 'ready',
        responseTime: Date.now() - startedAt,
        message: 'AI provider responded to readiness probe.',
      });
    } catch (error) {
      return buildProbeResult({
        status: 'unhealthy',
        triState: 'configured-failing',
        responseTime: Date.now() - startedAt,
        error: normalizeProviderError(error).message,
      });
    }
  }
}

export const platformGenAIService = new PlatformGenAIService();

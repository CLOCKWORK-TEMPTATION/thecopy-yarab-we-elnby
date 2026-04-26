import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnv, mockGenerateContent, mockGenerateImages, mockEditImage } = vi.hoisted(() => ({
  mockEnv: {
    GEMINI_API_KEY: 'valid-gemini-key',
    GOOGLE_GENAI_API_KEY: 'expired-google-key',
  },
  mockGenerateContent: vi.fn(),
  mockGenerateImages: vi.fn(),
  mockEditImage: vi.fn(),
}));

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(function mockGoogleGenAI({ apiKey }: { apiKey: string }) {
    return {
      models: {
        generateContent: (payload: unknown): unknown => mockGenerateContent(apiKey, payload),
        generateImages: (payload: unknown): unknown => mockGenerateImages(apiKey, payload),
        editImage: (payload: unknown): unknown => mockEditImage(apiKey, payload),
      },
    };
  }),
}));

vi.mock('@/config/env', () => ({
  env: mockEnv,
}));

import { PlatformGenAIService } from './platform-genai.service';

describe('PlatformGenAIService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.GEMINI_API_KEY = 'valid-gemini-key';
    mockEnv.GOOGLE_GENAI_API_KEY = 'expired-google-key';
  });

  it('prefers GEMINI_API_KEY when both aliases are present', async () => {
    mockGenerateContent.mockImplementation(async (apiKey: string) => {
      if (apiKey !== 'valid-gemini-key') {
        throw new Error('API key expired');
      }

      return { text: 'OK' };
    });

    const service = new PlatformGenAIService();

    const status = await service.probeHealth({ force: true });

    expect(status).toMatchObject({
      status: 'healthy',
      details: expect.objectContaining({
        credentialsConfigured: true,
      }),
    });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      'valid-gemini-key',
      expect.objectContaining({
        model: 'gemini-2.5-flash',
      })
    );
  });

  it('returns shared details when no AI credentials are configured', async () => {
    mockEnv.GEMINI_API_KEY = undefined;
    mockEnv.GOOGLE_GENAI_API_KEY = undefined;

    const service = new PlatformGenAIService();

    const status = await service.probeHealth({ force: true });

    expect(status).toMatchObject({
      status: 'unhealthy',
      triState: 'not-configured',
      error: 'GEMINI_API_KEY or GOOGLE_GENAI_API_KEY is not configured.',
      details: {
        provider: 'google-genai',
        credentialsConfigured: false,
      },
    });
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it('keeps the shared details payload when configured probes fail', async () => {
    mockGenerateContent.mockRejectedValue(new Error('API key expired'));

    const service = new PlatformGenAIService();

    const status = await service.probeHealth({ force: true });

    expect(status).toMatchObject({
      status: 'unhealthy',
      triState: 'configured-failing',
      error:
        'GOOGLE_GENAI_API_KEY is configured but expired. Renew the key before using AI-backed routes.',
      details: {
        provider: 'google-genai',
        credentialsConfigured: true,
      },
    });
  });
});

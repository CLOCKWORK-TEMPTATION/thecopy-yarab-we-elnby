import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGenerateContent,
  mockTrackGeminiRequest,
  mockTrackGeminiCache,
  mockCachedGeminiCall,
  mockCheckInput,
  mockCheckOutput,
  mockTrackUsage,
} = vi.hoisted(() => ({
  mockGenerateContent: vi.fn(),
  mockTrackGeminiRequest: vi.fn(),
  mockTrackGeminiCache: vi.fn(),
  mockCachedGeminiCall: vi.fn(),
  mockCheckInput: vi.fn(),
  mockCheckOutput: vi.fn(),
  mockTrackUsage: vi.fn(),
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: mockGenerateContent,
      };
    }
  },
}));

vi.mock('@/config/env', () => ({
  env: {
    GOOGLE_GENAI_API_KEY: 'test-api-key',
  },
}));

vi.mock('./cache.service', () => ({
  cacheService: {
    getStats: vi.fn().mockReturnValue({ hitRate: 50 }),
  },
}));

vi.mock('@/middleware/metrics.middleware', () => ({
  trackGeminiRequest: mockTrackGeminiRequest,
  trackGeminiCache: mockTrackGeminiCache,
}));

vi.mock('./gemini-cache.strategy', () => ({
  GEMINI_CACHE_PREFIX: {
    analysis: 'analysis',
    character: 'character',
    screenplay: 'screenplay',
    chat: 'chat',
    'shot-suggestion': 'shot-suggestion',
  },
  generateGeminiCacheKey: vi.fn().mockReturnValue('test-cache-key'),
  getGeminiCacheTTL: vi.fn().mockReturnValue(3600),
  getAdaptiveTTL: vi.fn().mockReturnValue(3600),
  cachedGeminiCall: mockCachedGeminiCall,
}));

vi.mock('./gemini-cost-tracker.service', () => ({
  geminiCostTracker: {
    trackUsage: mockTrackUsage,
    getCostSummary: vi.fn(),
  },
}));

vi.mock('./llm-guardrails.service', () => ({
  llmGuardrails: {
    checkInput: mockCheckInput,
    checkOutput: mockCheckOutput,
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { trackGeminiCache, trackGeminiRequest } from '@/middleware/metrics.middleware';

import { cachedGeminiCall } from './gemini-cache.strategy';
import { GeminiService } from './gemini.service';


const allowedGuardrailResult = {
  isAllowed: true,
  violations: [],
  riskLevel: 'low',
  sanitizedContent: null,
  warnings: [],
};

describe('GeminiService', () => {
  let geminiService: GeminiService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCheckInput.mockReturnValue(allowedGuardrailResult);
    mockCheckOutput.mockReturnValue(allowedGuardrailResult);

    vi.mocked(cachedGeminiCall).mockImplementation(
      async (_key, _ttl, producer) => producer()
    );

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'نتيجة افتراضية',
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 20,
        },
      },
    });

    geminiService = new GeminiService();
  });

  it('ينشئ الخدمة بمفتاح صالح', () => {
    expect(geminiService).toBeDefined();
  });

  it('يحلل النص ويستخدم فئة القياس الصحيحة للشخصيات', async () => {
    const result = await geminiService.analyzeText('نص للتحليل', 'characters');

    expect(result).toBe('نتيجة افتراضية');
    expect(trackGeminiRequest).toHaveBeenCalledWith('character', expect.any(Number), true);
    expect(trackGeminiCache).toHaveBeenCalledWith(true);
    expect(mockCheckInput).toHaveBeenCalledWith(
      expect.stringContaining('حلل الشخصيات'),
      expect.objectContaining({ requestType: 'analyze-characters' })
    );
  });

  it('يستخدم فئة التحليل العامة للموضوعات والبنية', async () => {
    await geminiService.analyzeText('نص للتحليل', 'themes');
    await geminiService.analyzeText('نص للتحليل', 'structure');

    expect(trackGeminiRequest).toHaveBeenNthCalledWith(
      1,
      'analysis',
      expect.any(Number),
      true
    );
    expect(trackGeminiRequest).toHaveBeenNthCalledWith(
      2,
      'analysis',
      expect.any(Number),
      true
    );
  });

  it('يعيد رسالة الرفض الأمنية كما هي عند حظر الإدخال', async () => {
    mockCheckInput.mockReturnValue({
      isAllowed: false,
      violations: ['محتوى محظور'],
      riskLevel: 'high',
      sanitizedContent: null,
      warnings: [],
    });

    await expect(geminiService.analyzeText('محتوى ضار', 'characters')).rejects.toThrow(
      'تم رفض المدخلات بواسطة نظام الحماية'
    );
    expect(trackGeminiRequest).toHaveBeenCalledWith('character', expect.any(Number), false);
    expect(trackGeminiCache).toHaveBeenCalledWith(false);
  });

  it('يعيد الخطأ الوظيفي العام عند فشل الطلب', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API Error'));

    await expect(geminiService.analyzeText('نص للتحليل', 'structure')).rejects.toThrow(
      'فشل في تحليل النص باستخدام الذكاء الاصطناعي'
    );
    expect(trackGeminiRequest).toHaveBeenCalledWith('analysis', expect.any(Number), false);
  });

  it('يعيد المخرجات المنقحة عند توفرها من الحواجز', async () => {
    mockCheckOutput.mockReturnValue({
      isAllowed: true,
      violations: [],
      riskLevel: 'low',
      sanitizedContent: 'محتوى نظيف ومعدل',
      warnings: [],
    });

    const result = await geminiService.analyzeText('نص', 'characters');

    expect(result).toBe('محتوى نظيف ومعدل');
  });

  it('يتتبع استهلاك التوكنات عند توفر بيانات الاستخدام', async () => {
    await geminiService.analyzeText('نص', 'characters');

    expect(mockTrackUsage).toHaveBeenCalledWith(10, 20, 'character');
  });

  it('يبني موجه مراجعة السيناريو الصحيح', async () => {
    await geminiService.reviewScreenplay('نص السيناريو');

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('أنت خبير في كتابة السيناريوهات العربية')
    );
    expect(trackGeminiRequest).toHaveBeenCalledWith('screenplay', expect.any(Number), true);
  });

  it('يضمّن السياق في محادثة الذكاء الاصطناعي', async () => {
    await geminiService.chatWithAI('ما اسم المشروع؟', { projectName: 'مشروع تجريبي' });

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('"projectName":"مشروع تجريبي"')
    );
    expect(trackGeminiRequest).toHaveBeenCalledWith('chat', expect.any(Number), true);
  });

  it('ينشئ اقتراح لقطة باستخدام فئة القياس الصحيحة', async () => {
    await geminiService.getShotSuggestion('مشهد في الصحراء', 'wide');

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('نوع اللقطة "wide"')
    );
    expect(trackGeminiRequest).toHaveBeenCalledWith(
      'shot-suggestion',
      expect.any(Number),
      true
    );
  });

  it('يبني موجهات مختلفة لكل نوع تحليل ويتراجع إلى الشخصيات افتراضياً', () => {
    const service = geminiService as unknown as {
      buildPrompt: (text: string, analysisType: string) => string;
    };

    expect(service.buildPrompt('نص', 'characters')).toContain('حلل الشخصيات');
    expect(service.buildPrompt('نص', 'themes')).toContain('حلل المواضيع');
    expect(service.buildPrompt('نص', 'structure')).toContain('حلل البنية الدرامية');
    expect(service.buildPrompt('نص', 'unknown')).toContain('حلل الشخصيات');
  });
});

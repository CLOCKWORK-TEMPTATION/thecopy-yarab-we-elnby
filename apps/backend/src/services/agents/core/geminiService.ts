import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

import { logger } from '@/lib/logger';

import {
  TASKS_EXPECTING_JSON_RESPONSE,
} from '../../../config/agentPrompts';
import {
  hasCandidates,
  extractTextFromCandidates,
  safeRegexMatchGroup,
} from '../../../types/ai/geminiTypes';

import {
  constructPromptParts,
  attemptToFixJson,
  buildErrorMessage,
} from './gemini-prompt-helpers';

import type { ProcessTextsParams } from './gemini-prompt-helpers';
import type { AgentConfig } from '../../../config/agentConfigs';
import type { GeminiError } from '../../../types/ai/geminiTypes';
import type { GenerateContentResponse, Content, SafetySetting } from "@google/generative-ai";

/**
 * @interface GeminiTaskResultData
 * @description A flexible type to represent the data returned from a Gemini task
 */
export type GeminiTaskResultData = Record<string, unknown> | string;

/**
 * @interface GeminiServiceResponse
 * @description Represents the response from the Gemini service
 */
export interface GeminiServiceResponse {
  data?: GeminiTaskResultData;
  rawText?: string;
  error?: string;
}

export type { ProcessTextsParams };

const MAX_RETRIES = 1;

/**
 * @class GeminiService
 * @description Service for processing texts with the Gemini AI API
 */
export class GeminiService {
  private ai: GoogleGenerativeAI;
  private config: AgentConfig;

  constructor(apiKey: string, config: AgentConfig) {
    if (!apiKey) {
      throw new Error("لم يتم تعيين مفتاح Gemini API في ملف التكوين.");
    }
    this.ai = new GoogleGenerativeAI(apiKey);
    this.config = config;
  }

  public async processTextsWithGemini(params: ProcessTextsParams, retries = 0): Promise<GeminiServiceResponse> {
    try {
      return await this.callGeminiApi(params);
    } catch (e: unknown) {
      return this.handleGeminiError(e, params, retries);
    }
  }

  private async callGeminiApi(params: ProcessTextsParams): Promise<GeminiServiceResponse> {
    const model = this.ai.getGenerativeModel({ model: this.config.model });
    const promptParts = constructPromptParts(params);
    const contents: Content[] = [{ role: "user", parts: promptParts }];

    const safetySettings: SafetySetting[] = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
    ];

    const result = await model.generateContent({
      contents,
      safetySettings,
      generationConfig: {
        temperature: this.config.temperature,
        topK: this.config.topK,
        topP: this.config.topP,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    });

    const response: GenerateContentResponse = result.response;

    if (!hasCandidates(response)) {
      return { error: "أرجع Gemini استجابة بدون مرشحين صالحين." };
    }

    const rawTextOutput = extractTextFromCandidates(response);

    if (!rawTextOutput) {
      const firstCandidate = response.candidates![0];
      if (firstCandidate && String(firstCandidate.finishReason) !== "STOP") {
        return { error: ` أنهى Gemini المعالجة بسبب: ${firstCandidate.finishReason}. قد يكون المحتوى قد تم حظره أو انتهى بشكل غير متوقع.` };
      }
      return { error: "أرجع Gemini استجابة نصية فارغة." };
    }

    const shouldExpectJson = TASKS_EXPECTING_JSON_RESPONSE.includes(params.taskType);
    return this.parseGeminiResponse(rawTextOutput, shouldExpectJson);
  }

  private parseGeminiResponse(rawTextOutput: string, shouldExpectJson: boolean): GeminiServiceResponse {
    let jsonStr = rawTextOutput.trim();
    const fenceRegex = /^(?:\s*```(?:json)?\s*\n?)?([\s\S]*?)(?:\n?\s*```\s*)?$/s;
    const extractedJson = safeRegexMatchGroup(jsonStr, fenceRegex, 1);
    if (extractedJson) {
      jsonStr = extractedJson.trim();
    }

    if (jsonStr.startsWith('{') || jsonStr.startsWith('[')) {
      try {
        return { data: parseGeminiTaskResult(jsonStr), rawText: rawTextOutput };
      } catch {
        const fixedJsonStr = attemptToFixJson(jsonStr);
        try {
          return { data: parseGeminiTaskResult(fixedJsonStr), rawText: rawTextOutput };
        } catch {
          logger.error("فشل في تحليل JSON حتى بعد محاولة الإصلاح");
          if (shouldExpectJson) {
            return { data: rawTextOutput, rawText: rawTextOutput, error: "تم استلام نص غير متوقع بدلاً من JSON. يتم عرض النص الخام." };
          }
          return { data: rawTextOutput, rawText: rawTextOutput };
        }
      }
    }

    if (shouldExpectJson) {
      return { data: rawTextOutput, rawText: rawTextOutput, error: "تم استلام نص غير متوقع بدلاً من JSON. يتم عرض النص الخام." };
    }

    return { data: rawTextOutput, rawText: rawTextOutput };
  }

  private async handleGeminiError(e: unknown, params: ProcessTextsParams, retries: number): Promise<GeminiServiceResponse> {
    logger.error(`خطأ في معالجة النصوص مع Gemini (محاولة ${retries}/${MAX_RETRIES}):`, e);

    const error = e as GeminiError & { status?: number; message?: string; toString?: () => string; response?: { error?: { message?: string } } };

    if (retries < MAX_RETRIES && (error.status && error.status >= 500 || (error.message?.toLowerCase().includes("network error")) ) ) {
      logger.info(`إعادة المحاولة (${retries + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
      return this.processTextsWithGemini(params, retries + 1);
    }

    return { error: buildErrorMessage(error) };
  }
}

function parseGeminiTaskResult(jsonText: string): GeminiTaskResultData {
  return JSON.parse(jsonText) as GeminiTaskResultData;
}

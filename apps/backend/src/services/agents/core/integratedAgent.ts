import { agentsConfig } from '../../../config/agentConfigs';

import { GeminiService } from './geminiService';

import type { AgentConfig } from '../../../config/agentConfigs';
import type { AIAgentConfig } from '../../../types/types';

/**
 * الوكيل المتكامل - Integrated Agent
 * 
 * @description
 * الفئة الأساسية القديمة لوكلاء الذكاء الاصطناعي المتكاملة في النظام.
 * يوفر البنية التحتية المشتركة للتواصل مع خدمة Gemini وإدارة الإعدادات.
 * 
 * ملاحظة: للوكلاء الجديدة، استخدم BaseAgent من shared/BaseAgent.ts
 * الذي يطبق النمط القياسي الكامل مع دعم RAG والنقد الذاتي والمناظرة.
 * 
 * @example
 * ```typescript
 * class MyLegacyAgent extends IntegratedAgent {
 *   async execute(text: string): Promise<string> {
 *     return await this.geminiService.generate(text);
 *   }
 * }
 * ```
 */
export class IntegratedAgent {
  /** خدمة Gemini للتواصل مع API */
  protected geminiService: GeminiService;
  /** إعدادات الوكيل من ملف التكوين */
  protected config: AgentConfig;
  /** إعدادات الوكيل المُمررة عند الإنشاء */
  protected agentConfig: AIAgentConfig;

  /**
   * إنشاء وكيل متكامل جديد
   * 
   * @param agentConfig - إعدادات الوكيل تشمل المعرّف والقدرات
   * @param apiKey - مفتاح API لخدمة Gemini
   */
  constructor(agentConfig: AIAgentConfig, apiKey: string) {
    this.agentConfig = agentConfig;
    this.config = agentsConfig[agentConfig.id ?? 'default'] ?? agentsConfig.default;
    this.geminiService = new GeminiService(apiKey, this.config);
  }

  /**
   * تنفيذ المهمة الرئيسية للوكيل
   * 
   * @description
   * طريقة مجردة يجب تنفيذها في الفئات الفرعية.
   * كل وكيل يحدد سلوكه الخاص في هذه الطريقة.
   * 
   * @param args - المعاملات المطلوبة للتنفيذ (تختلف حسب الوكيل)
   * @returns نتيجة التنفيذ (تختلف حسب الوكيل)
   * @throws خطأ إذا لم يتم تنفيذ الطريقة في الفئة الفرعية
   */
  public execute(..._args: unknown[]): Promise<unknown> {
    return Promise.reject(new Error("يجب تنفيذ طريقة 'execute()' في الفئة الفرعية."));
  }
}

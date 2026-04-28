/**
 * Agent Instructions Service
 * يوفر واجهة موحدة لتحميل واستخدام تعليمات الوكلاء من ملفات JSON
 */

import { logger } from "@/lib/logger";

import { instructionsLoader, type InstructionSet } from "./instructions-loader";

export class AgentInstructionsService {
  private static instance: AgentInstructionsService;
  private readonly loader: typeof instructionsLoader;

  private constructor(loader: typeof instructionsLoader = instructionsLoader) {
    this.loader = loader;
  }

  static getInstance(): AgentInstructionsService {
    if (!AgentInstructionsService.instance) {
      AgentInstructionsService.instance = new AgentInstructionsService();
    }
    return AgentInstructionsService.instance;
  }

  /**
   * تحميل تعليمات وكيل محدد
   */
  async getInstructions(agentId: string): Promise<InstructionSet> {
    return await this.loader.loadInstructions(agentId);
  }

  /**
   * تحميل مسبق لتعليمات وكلاء متعددة
   */
  async preloadAgents(agentIds: string[]): Promise<void> {
    await this.loader.preloadInstructions(agentIds);
  }

  /**
   * الحصول على حالة التخزين المؤقت
   */
  getCacheStatus() {
    return this.loader.getCacheStatus();
  }

  /**
   * مسح التخزين المؤقت
   */
  clearCache(): void {
    this.loader.clearCache();
  }

  /**
   * تحميل تعليمات وكيل مع معالجة الأخطاء المحسنة
   */
  async safeGetInstructions(agentId: string): Promise<InstructionSet | null> {
    try {
      return await this.getInstructions(agentId);
    } catch (error) {
      logger.error(`Failed to load instructions for agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * التحقق من توفر تعليمات وكيل
   */
  async isAgentAvailable(agentId: string): Promise<boolean> {
    try {
      await this.getInstructions(agentId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * الحصول على قائمة الوكلاء المتاحين
   */
  getAvailableAgents(): string[] {
    const { cached } = this.getCacheStatus();
    return cached;
  }
}

// تصدير المثيل الوحيد
export const agentInstructions = AgentInstructionsService.getInstance();

// تصدير الأنواع
export type { InstructionSet };

/**
 * Agent Instructions Service
 * يوفر واجهة موحدة لتحميل واستخدام تعليمات الوكلاء من ملفات JSON
 */

import { instructionsLoader, type InstructionSet } from './instructions-loader';
import { logger } from '@/utils/logger';

export class AgentInstructionsService {
  private static instance: AgentInstructionsService;
  
  private constructor() {}
  
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
    return await instructionsLoader.loadInstructions(agentId);
  }

  /**
   * تحميل مسبق لتعليمات وكلاء متعددة
   */
  async preloadAgents(agentIds: string[]): Promise<void> {
    await instructionsLoader.preloadInstructions(agentIds);
  }

  /**
   * الحصول على حالة التخزين المؤقت
   */
  getCacheStatus() {
    return instructionsLoader.getCacheStatus();
  }

  /**
   * مسح التخزين المؤقت
   */
  clearCache(): void {
    instructionsLoader.clearCache();
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

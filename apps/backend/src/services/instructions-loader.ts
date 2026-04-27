/**
 * Instructions loader service for dynamic loading of agent instructions
 */
import { logger } from '@/lib/logger';

interface InstructionSet {
  systemPrompt: string;
  instructions: string[];
  outputFormat?: Record<string, string>;
  examples?: { input: string; output: string }[];
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

class InstructionsLoader {
  private cache = new Map<string, InstructionSet>();
  private loadingPromises = new Map<string, Promise<InstructionSet>>();

  /**
   * Load instructions for a specific agent
   */
  async loadInstructions(agentId: string): Promise<InstructionSet> {
    // Check cache first
    if (this.cache.has(agentId)) {
      return this.cache.get(agentId)!;
    }

    // Check if already loading
    if (this.loadingPromises.has(agentId)) {
      return this.loadingPromises.get(agentId)!;
    }

    // Start loading
    const loadPromise = this.fetchInstructions(agentId);
    this.loadingPromises.set(agentId, loadPromise);

    try {
      const instructions = await loadPromise;
      this.cache.set(agentId, instructions);
      this.loadingPromises.delete(agentId);
      return instructions;
    } catch (error) {
      this.loadingPromises.delete(agentId);
      throw error;
    }
  }

  /**
   * Fetch instructions from public directory
   */
  private async fetchInstructions(agentId: string): Promise<InstructionSet> {
    try {
      const response = await fetch(`/instructions/${agentId}.json`);
      
      if (!response.ok) {
        throw new Error(`Failed to load instructions for ${agentId}: ${response.statusText}`);
      }

      const instructions: unknown = await response.json();
      return this.validateInstructions(instructions);
    } catch (error) {
      logger.warn(`Failed to load instructions for ${agentId}, using fallback`, { error });
      return this.getFallbackInstructions(agentId);
    }
  }

  /**
   * Validate instruction format
   */
  private validateInstructions(instructions: unknown): InstructionSet {
    if (!isRecord(instructions)) {
      throw new Error('Invalid instruction format');
    }

    const systemPrompt = instructions['systemPrompt'];
    const instructionItems = instructions['instructions'];

    if (
      typeof systemPrompt !== 'string' ||
      !Array.isArray(instructionItems) ||
      !instructionItems.every((item) => typeof item === 'string')
    ) {
      throw new Error('Invalid instruction format');
    }

    return instructions as unknown as InstructionSet;
  }

  /**
   * Get fallback instructions when loading fails
   */
  private getFallbackInstructions(agentId: string): InstructionSet {
    return {
      systemPrompt: `أنت وكيل ذكي متخصص في ${agentId}. قم بتحليل المحتوى المقدم وقدم رؤى مفيدة.`,
      instructions: [
        'حلل المحتوى المقدم بعناية',
        'قدم رؤى مفيدة وقابلة للتطبيق',
        'حافظ على الجودة والدقة في التحليل'
      ],
      outputFormat: {
        analysis: 'التحليل الأساسي',
        recommendations: 'التوصيات'
      }
    };
  }

  /**
   * Preload instructions for multiple agents
   */
  async preloadInstructions(agentIds: string[]): Promise<void> {
    const promises = agentIds.map(id => this.loadInstructions(id));
    await Promise.allSettled(promises);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache status
   */
  getCacheStatus(): { cached: string[]; loading: string[] } {
    return {
      cached: Array.from(this.cache.keys()),
      loading: Array.from(this.loadingPromises.keys())
    };
  }
}

// Singleton instance
export const instructionsLoader = new InstructionsLoader();

// Export types
export type { InstructionSet };

import { logger } from '@/lib/logger';

import type { Script } from '../types/types';

export interface CharacterDialogueStat {
  name: string;
  dialogueLines: number;
}

export interface AnalysisResult {
  totalScenes: number;
  characterDialogueCounts: CharacterDialogueStat[];
  dialogueToActionRatio: number;
  synopsis: string;
  logline: string;
}

export interface AIWritingAssistantLike {
  generateText: (
    prompt: string,
    context: string,
    options?: Record<string, unknown>
  ) => Promise<{ text?: string }>;
}

/**
 * Provides core analytics for the Naqid MVP by aggregating structural screenplay metrics
 * and orchestrating qualitative AI-driven insights such as synopses and loglines.
 */
export class AnalysisService {
  private readonly aiAssistant: AIWritingAssistantLike;

  constructor(aiAssistant: AIWritingAssistantLike) {
    this.aiAssistant = aiAssistant;
  }

  /**
   * Computes the foundational metrics required by the Naqid dashboard.
   *
   * @param {Script} script - Structured screenplay information supplied by the classifier.
   * @param {string} [rawTextOverride] - Optional raw text that overrides the screenplay's stored text
   * for AI generation contexts.
   * @returns {Promise<AnalysisResult>} Aggregated quantitative and qualitative analysis details.
   */
  async analyze(script: Script, rawTextOverride?: string): Promise<AnalysisResult> {
    const totalScenes = script.scenes.length;
    const characterDialogueCounts = Object.values(script.characters)
      .map<CharacterDialogueStat>((character) => ({
        name: character.name,
        dialogueLines: character.dialogueCount,
      }))
      .sort((a, b) => b.dialogueLines - a.dialogueLines);

    const totalDialogueLines = script.dialogueLines.length;
    const totalActionLines = script.scenes.reduce((sum, scene) => sum + scene.actionLines.length, 0);
    const dialogueToActionRatio = totalActionLines === 0
      ? totalDialogueLines
      : totalDialogueLines / totalActionLines;

    const narrativeSource = (rawTextOverride ?? script.rawText ?? '').trim();

    const [synopsis, logline] = await Promise.all([
      this.generateAiInsight(
        'استنادًا إلى هذا السيناريو، قم بتوليد ملخص من فقرة واحدة (Synopsis).',
        narrativeSource
      ),
      this.generateAiInsight(
        'استنادًا إلى هذا السيناريو، اقترح عنوانًا جذابًا (Logline).',
        narrativeSource
      ),
    ]);

    return {
      totalScenes,
      characterDialogueCounts,
      dialogueToActionRatio,
      synopsis,
      logline,
    };
  }

  private async generateAiInsight(prompt: string, context: string): Promise<string> {
    if (!context) {
      return 'لم يتم توفير نص كافٍ لتحليل الذكاء الاصطناعي.';
    }

    try {
      const response = await this.aiAssistant.generateText(prompt, context, { mode: 'analysis' });
      return response.text ?? 'تعذر توليد الاستجابة بواسطة الذكاء الاصطناعي.';
    } catch (error) {
      logger.error('AI insight generation failed:', error);
      return 'حدث خطأ أثناء توليد الاستجابة من الذكاء الاصطناعي.';
    }
  }
}

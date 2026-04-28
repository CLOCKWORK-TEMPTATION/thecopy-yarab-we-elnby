import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { SCENE_GENERATOR_AGENT_CONFIG } from "./agent";
import { cleanupSceneText } from "./formatUtils";
import { buildScenePrompt } from "./prompt-builder";
import {
  assessDialogueQuality,
  assessDramaticTension,
  assessPacing,
  assessVisualClarity,
  calculateDialoguePercentage,
  countCharactersInScene,
} from "./sceneAssessors";
import { generateSceneNotes } from "./sceneNotes";
import { translateSceneType } from "./translationHelpers";
import { asJsonRecord, asString } from "./types";

/**
 * Scene Generator Agent - وكيل مولد المشاهد
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class SceneGeneratorAgent extends BaseAgent {
  constructor() {
    super(
      "SceneCraft AI",
      TaskType.SCENE_GENERATOR,
      SCENE_GENERATOR_AGENT_CONFIG.systemPrompt ?? ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.8;
  }

  /**
   * Build prompt for scene generation
   */
  protected buildPrompt(input: StandardAgentInput): string {
    return buildScenePrompt(input);
  }

  /**
   * Post-process the scene output
   */
  protected override postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Clean and format the scene
    const processedText = cleanupSceneText(output.text);

    // Assess scene quality
    const dramaticTension = this.assessDramaticTension(processedText);
    const dialogueQuality = this.assessDialogueQuality(processedText);
    const visualClarity = this.assessVisualClarity(processedText);
    const pacing = this.assessPacing(processedText);

    // Calculate composite quality score
    const qualityScore =
      dramaticTension * 0.3 +
      dialogueQuality * 0.25 +
      visualClarity * 0.25 +
      pacing * 0.2;

    // Adjust confidence based on quality
    const adjustedConfidence = output.confidence * 0.6 + qualityScore * 0.4;

    return Promise.resolve({
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: generateSceneNotes(
        output,
        dramaticTension,
        dialogueQuality,
        visualClarity,
        pacing
      ),
      metadata: {
        ...output.metadata,
        sceneQuality: qualityScore,
        sceneQualityDetails: {
          overall: qualityScore,
          dramaticTension,
          dialogueQuality,
          visualClarity,
          pacing,
        },
        sceneLength: processedText.length,
        dialoguePercentage: this.calculateDialoguePercentage(processedText),
        numberOfCharacters: this.countCharacters(processedText),
      },
    });
  }

  private assessDramaticTension(text: string): number {
    return assessDramaticTension(text);
  }

  private assessDialogueQuality(text: string): number {
    return assessDialogueQuality(text);
  }

  private assessVisualClarity(text: string): number {
    return assessVisualClarity(text);
  }

  private assessPacing(text: string): number {
    return assessPacing(text);
  }

  private calculateDialoguePercentage(text: string): number {
    return calculateDialoguePercentage(text);
  }

  private countCharacters(text: string): number {
    return countCharactersInScene(text);
  }

  /**
   * Generate fallback response
   */
  protected override getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    const sceneType = asString(asJsonRecord(input.context).sceneType, "dramatic");

    return Promise.resolve(`وصف المشهد:
مشهد ${translateSceneType(sceneType)} يحتاج إلى تطوير أعمق للشخصيات والصراع.

نموذج مبسط:
[المكان والزمان]
الشخصيات تدخل المشهد. حوار أساسي يعبر عن الموقف.
تطور في الأحداث يدفع القصة للأمام.

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من التفاصيل عن الشخصيات والسياق للحصول على مشهد أكثر عمقاً وتفصيلاً.`);
  }
}

// Export singleton instance
export const sceneGeneratorAgent = new SceneGeneratorAgent();

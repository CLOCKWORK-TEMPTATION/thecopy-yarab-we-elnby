import { TaskType } from "@core/types";

import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";

import { SCENE_GENERATOR_AGENT_CONFIG } from "./agent";
import {
  cleanupSceneText,
  formatCharacter,
  summarizeScene,
} from "./formatUtils";
import {
  assessDramaticTension,
  assessDialogueQuality,
  assessVisualClarity,
  assessPacing,
  calculateDialoguePercentage,
  countCharactersInScene,
} from "./sceneAssessors";
import { generateSceneNotes } from "./sceneNotes";
import {
  translateSceneType,
  translateEmotionalTone,
  translateConflictLevel,
} from "./translationHelpers";
import { asJsonRecord, asString, asStringArray, asUnknownArray } from "./types";

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
    const { input: taskInput, context } = input;

    // Extract relevant context
    const contextObj = asJsonRecord(context);
    const originalText = asString(contextObj["originalText"]);
    const sceneType = asString(contextObj["sceneType"], "dramatic");
    const characters = asUnknownArray(contextObj["characters"]);
    const setting = asString(contextObj["setting"]);
    const emotionalTone = asString(contextObj["emotionalTone"], "neutral");
    const conflictLevel = asString(contextObj["conflictLevel"], "medium");
    const sceneObjectives = asStringArray(contextObj["objectives"]);
    const previousScenes = asUnknownArray(contextObj["previousScenes"]);

    // Build structured prompt
    let prompt = `مهمة توليد المشهد الدرامي\n\n`;

    // Add original text context
    if (originalText) {
      prompt += `السياق الأصلي:\n${originalText}\n\n`;
    }

    // Add scene specifications
    prompt += `مواصفات المشهد:\n`;
    prompt += `- نوع المشهد: ${translateSceneType(sceneType)}\n`;
    prompt += `- النبرة العاطفية: ${translateEmotionalTone(emotionalTone)}\n`;
    prompt += `- مستوى الصراع: ${translateConflictLevel(conflictLevel)}\n\n`;

    // Add characters
    if (characters.length > 0) {
      prompt += `الشخصيات في المشهد:\n`;
      characters.forEach((character, index) => {
        prompt += `${index + 1}. ${formatCharacter(character)}\n`;
      });
      prompt += "\n";
    }

    // Add setting
    if (setting) {
      prompt += `مكان وزمان المشهد:\n${setting}\n\n`;
    }

    // Add scene objectives
    if (sceneObjectives.length > 0) {
      prompt += `أهداف المشهد:\n`;
      sceneObjectives.forEach((objective: string, index: number) => {
        prompt += `${index + 1}. ${objective}\n`;
      });
      prompt += "\n";
    }

    // Add previous scenes context
    if (previousScenes.length > 0) {
      prompt += `ملخص المشاهد السابقة:\n`;
      previousScenes.slice(-2).forEach((scene, index) => {
        prompt += `[مشهد ${index + 1}]: ${summarizeScene(scene)}\n`;
      });
      prompt += "\n";
    }

    // Add specific task
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;

    // Add generation instructions
    prompt += `التعليمات:

1. **وصف المشهد** (2-3 جمل): ابدأ بوصف موجز للمكان والأجواء
2. **الحركة والحوار**: اكتب المشهد بشكل متكامل مع الحوارات والحركات
3. **التوتر الدرامي**: احرص على بناء التوتر وتطوير الصراع
4. **التفاصيل الحسية**: أضف تفاصيل بصرية وسمعية وحسية
5. **النهاية**: اختتم المشهد بشكل يدفع القصة للأمام

اكتب المشهد بأسلوب سينمائي واضح، مع التوازن بين الوصف والحوار والحركة.
لا تستخدم JSON أو رموز البرمجة. اكتب نصاً درامياً صافياً.`;

    return prompt;
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
    const dramaticTension = assessDramaticTension(processedText);
    const dialogueQuality = assessDialogueQuality(processedText);
    const visualClarity = assessVisualClarity(processedText);
    const pacing = assessPacing(processedText);

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
        dialoguePercentage: calculateDialoguePercentage(processedText),
        numberOfCharacters: countCharactersInScene(processedText),
      },
    });
  }

  /**
   * Generate fallback response
   */
  protected override getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    const sceneType = asString(
      asJsonRecord(input.context)["sceneType"],
      "dramatic"
    );

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

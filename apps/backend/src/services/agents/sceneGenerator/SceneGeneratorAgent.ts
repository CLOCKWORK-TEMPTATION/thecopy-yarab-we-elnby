/* eslint-disable max-lines -- cohesive agent module */
import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";
import { SCENE_GENERATOR_AGENT_CONFIG } from "./agent";
import {
  safeCountMultipleTerms,
  sumCounts,
} from "../shared/safe-regexp";

const ARABIC_CHAR_REGEX = /^[أ-ي\s]+:/; // NOSONAR
const LATIN_CHAR_REGEX = /^[A-Z\s]+:/; // NOSONAR
const DIALOGUE_EXTRACT_REGEX = /"[^"]+"/g; // NOSONAR
const ALL_DIALOGUE_EXTRACT_REGEX = /"[^"]+"|«[^»]+»/g; // NOSONAR
const SENTENCE_SPLIT_REGEX = /[.!?]/; // NOSONAR
const SPACES_SPLIT_REGEX = /\s+/; // NOSONAR

interface SceneCharacter {
  name?: string;
  role?: string;
  motivation?: string;
}

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
      SCENE_GENERATOR_AGENT_CONFIG.systemPrompt || ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.8;
  }

  /**
   * Build prompt for scene generation
   */
  // eslint-disable-next-line complexity
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    // Extract relevant context
    const contextObj =
      typeof context === "object" && context !== null
        ? (context as Record<string, unknown>)
        : {};
    const sceneType = (contextObj["sceneType"] as string) || "dramatic";
    const emotionalTone = (contextObj["emotionalTone"] as string) || "neutral";
    const conflictLevel = (contextObj["conflictLevel"] as string) || "medium";

    let prompt = `مهمة توليد المشهد الدرامي\n\n`;
    prompt += this.buildOriginalTextSection((contextObj["originalText"] as string) || "");
    prompt += this.buildSpecsSection(sceneType, emotionalTone, conflictLevel);
    prompt += this.buildCharactersSection((contextObj["characters"] as SceneCharacter[]) || []);
    prompt += this.buildSettingSection((contextObj["setting"] as string) || "");
    prompt += this.buildObjectivesSection((contextObj["objectives"] as string[]) || []);
    prompt += this.buildPreviousScenesSection((contextObj["previousScenes"] as unknown[]) || []);
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

  private buildOriginalTextSection(text: string): string {
    return text ? `السياق الأصلي:\n${text}\n\n` : "";
  }

  private buildSpecsSection(sceneType: string, tone: string, conflict: string): string {
    let s = `مواصفات المشهد:\n`;
    s += `- نوع المشهد: ${this.translateSceneType(sceneType)}\n`;
    s += `- النبرة العاطفية: ${this.translateEmotionalTone(tone)}\n`;
    s += `- مستوى الصراع: ${this.translateConflictLevel(conflict)}\n\n`;
    return s;
  }

  private buildCharactersSection(characters: SceneCharacter[]): string {
    if (characters.length === 0) return "";
    let s = `الشخصيات في المشهد:\n`;
    characters.forEach((character, index) => {
      s += `${index + 1}. ${this.formatCharacter(character)}\n`;
    });
    return s + "\n";
  }

  private buildSettingSection(setting: string): string {
    return setting ? `مكان وزمان المشهد:\n${setting}\n\n` : "";
  }

  private buildObjectivesSection(objectives: string[]): string {
    if (objectives.length === 0) return "";
    let s = `أهداف المشهد:\n`;
    objectives.forEach((obj, i) => { s += `${i + 1}. ${obj}\n`; });
    return s + "\n";
  }

  private buildPreviousScenesSection(scenes: unknown[]): string {
    if (scenes.length === 0) return "";
    let s = `ملخص المشاهد السابقة:\n`;
    scenes.slice(-2).forEach((scene, index) => {
      s += `[مشهد ${index + 1}]: ${this.summarizeScene(scene)}\n`;
    });
    return s + "\n";
  }

  /**
   * Post-process the scene output
   */
  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Clean and format the scene
    const processedText = this.cleanupSceneText(output.text);

    // Assess scene quality
    const dramaticTension = await this.assessDramaticTension(processedText);
    const dialogueQuality = await this.assessDialogueQuality(processedText);
    const visualClarity = await this.assessVisualClarity(processedText);
    const pacing = await this.assessPacing(processedText);

    // Calculate composite quality score
    const qualityScore =
      dramaticTension * 0.3 +
      dialogueQuality * 0.25 +
      visualClarity * 0.25 +
      pacing * 0.2;

    // Adjust confidence based on quality
    const adjustedConfidence = output.confidence * 0.6 + qualityScore * 0.4;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateSceneNotes(
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
    };
  }

  /**
   * Clean up scene text formatting
   */
  private cleanupSceneText(text: string): string {
    // Remove JSON and code artifacts
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    // Format scene elements
    const formatted = this.formatSceneElements(text);

    // Ensure proper scene structure
    const structured = this.structureScene(formatted);

    // Clean up whitespace
    return structured.replace(/\n{3,}/g, "\n\n").trim();
  }

  /**
   * Format scene elements (dialogue, action, description)
   */
  private formatSceneElements(text: string): string {
    const lines = text.split("\n");
    const formatted: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        formatted.push("");
        continue;
      }

      // Format character names in dialogue
      if (this.isCharacterName(trimmed)) {
        formatted.push(`\n${trimmed.toUpperCase()}`);
      }
      // Format dialogue
      else if (this.isDialogue(trimmed)) {
        formatted.push(this.formatDialogue(trimmed));
      }
      // Format stage directions
      else if (this.isStageDirection(trimmed)) {
        formatted.push(`(${trimmed})`);
      }
      // Regular description
      else {
        formatted.push(trimmed);
      }
    }

    return formatted.join("\n");
  }

  /**
   * Structure the scene properly
   */
  private structureScene(text: string): string {
    // Extract main components
    const sceneHeading = this.extractSceneHeading(text);
    const description = this.extractDescription(text);
    const action = this.extractAction(text);

    // Rebuild in proper order
    let structured = "";

    if (sceneHeading) {
      structured += `${sceneHeading}\n\n`;
    }

    if (description) {
      structured += `${description}\n\n`;
    }

    if (action) {
      structured += action;
    }

    // If no clear structure, return original
    return structured || text;
  }

  /**
   * Assess dramatic tension in the scene
   */
  private async assessDramaticTension(text: string): Promise<number> {
    let score = 0.5;

    // Check for conflict indicators
    const conflictWords = [
      "لكن",
      "رغم",
      "ضد",
      "تحدي",
      "صراع",
      "مواجهة",
      "رفض",
      "اعتراض",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const conflictCount = safeCountMultipleTerms(text, conflictWords);
    score += Math.min(0.2, sumCounts(conflictCount) * 0.02);

    // Check for emotional intensity
    const emotionalWords = [
      "غضب",
      "خوف",
      "حب",
      "كره",
      "قلق",
      "صدمة",
      "دهشة",
      "!",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const emotionCount = safeCountMultipleTerms(text, emotionalWords);
    score += Math.min(0.15, sumCounts(emotionCount) * 0.015);

    // Check for turning points
    const turningWords = ["فجأة", "لحظة", "الآن", "أخيراً", "لا يمكن"];
    const hasTurning = turningWords.some((word) => text.includes(word));
    if (hasTurning) score += 0.15;

    return Math.min(1, score);
  }

  /**
   * Assess dialogue quality
   */
  private async assessDialogueQuality(text: string): Promise<number> {
    let score = 0.6;

    // Check for dialogue presence
    const hasDialogue =
      text.includes('"') || text.includes("«") || text.includes(":");
    if (!hasDialogue) return 0.3;

    // Check for varied dialogue lengths
    const dialogueMatches = text.match(DIALOGUE_EXTRACT_REGEX) || [];
    if (dialogueMatches.length > 0) {
      const lengths = dialogueMatches.map((d) => d.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance =
        lengths.reduce((sum, len) => sum + Math.abs(len - avgLength), 0) /
        lengths.length;

      // Higher variance is better (varied dialogue)
      if (variance > 20) score += 0.2;
    }

    // Check for subtext and implication
    const subtextWords = ["ربما", "يبدو", "أظن", "لعل", "..."];
    const hasSubtext = subtextWords.some((word) => text.includes(word));
    if (hasSubtext) score += 0.2;

    return Math.min(1, score);
  }

  /**
   * Assess visual clarity
   */
  private async assessVisualClarity(text: string): Promise<number> {
    let score = 0.5;

    // Check for visual descriptors
    const visualWords = [
      "يرى",
      "ينظر",
      "يشاهد",
      "مشهد",
      "منظر",
      "ضوء",
      "ظلام",
      "لون",
      "حركة",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const visualCount = safeCountMultipleTerms(text, visualWords);
    score += Math.min(0.25, sumCounts(visualCount) * 0.025);

    // Check for spatial indicators
    const spatialWords = [
      "أمام",
      "خلف",
      "يمين",
      "يسار",
      "فوق",
      "تحت",
      "بجانب",
      "وسط",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const spatialCount = safeCountMultipleTerms(text, spatialWords);
    score += Math.min(0.15, sumCounts(spatialCount) * 0.03);

    // Check for action verbs
    const actionVerbs = [
      "يدخل",
      "يخرج",
      "يقف",
      "يجلس",
      "يمشي",
      "يركض",
      "يلتفت",
      "يمسك",
    ];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const actionCount = safeCountMultipleTerms(text, actionVerbs);
    score += Math.min(0.1, sumCounts(actionCount) * 0.02);

    return Math.min(1, score);
  }

  /**
   * Assess pacing
   */
  private async assessPacing(text: string): Promise<number> {
    let score = 0.6;

    // Check sentence variety
    const sentences = text.split(SENTENCE_SPLIT_REGEX);
    const lengths = sentences.map((s) => s.split(SPACES_SPLIT_REGEX).length);

    if (lengths.length > 3) {
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const hasShort = lengths.some((l) => l < avgLength * 0.5);
      const hasLong = lengths.some((l) => l > avgLength * 1.5);

      if (hasShort && hasLong) score += 0.2; // Good variety
    }

    // Check for rhythm markers
    const rhythmWords = ["ثم", "بعد", "فجأة", "ببطء", "بسرعة", "في الحال"];
    // SECURITY FIX: Use safe RegExp utility to prevent injection
    const rhythmCount = safeCountMultipleTerms(text, rhythmWords);
    score += Math.min(0.2, sumCounts(rhythmCount) * 0.04);

    return Math.min(1, score);
  }

  /**
   * Helper methods
   */
  private isCharacterName(line: string): boolean {
    return ARABIC_CHAR_REGEX.test(line) || LATIN_CHAR_REGEX.test(line);
  }

  private isDialogue(line: string): boolean {
    return (
      line.includes('"') ||
      line.includes("«") ||
      (line.includes(":") && line.length > 20)
    );
  }

  private isStageDirection(line: string): boolean {
    return (
      line.startsWith("(") ||
      line.includes("[") ||
      line.toLowerCase().includes("يدخل") ||
      line.toLowerCase().includes("يخرج")
    );
  }

  private formatDialogue(text: string): string {
    if (!text.startsWith('"') && !text.includes("«")) {
      return `"${text}"`;
    }
    return text;
  }

  private extractSceneHeading(text: string): string | null {
    const lines = text.split("\n");
    const heading = lines.find(
      (line) =>
        line.includes("INT.") ||
        line.includes("EXT.") ||
        line.includes("داخلي") ||
        line.includes("خارجي") ||
        line.includes("المشهد")
    );
    return heading || null;
  }

  private extractDescription(text: string): string | null {
    const paragraphs = text.split("\n\n");
    const description = paragraphs.find(
      (p) => p.length > 100 && !p.includes('"') && !p.includes(":")
    );
    return description || null;
  }

  private extractAction(text: string): string {
    // Return everything that's not heading or pure description
    const heading = this.extractSceneHeading(text);
    const description = this.extractDescription(text);

    let action = text;
    if (heading) action = action.replace(heading, "");
    if (description) action = action.replace(description, "");

    return action.trim();
  }

  private calculateDialoguePercentage(text: string): number {
    const dialogueMatches = text.match(ALL_DIALOGUE_EXTRACT_REGEX) || [];
    const dialogueLength = dialogueMatches.join("").length;
    return Math.round((dialogueLength / text.length) * 100);
  }

  private countCharacters(text: string): number {
    const characterNames = new Set<string>();
    const lines = text.split("\n");

    for (const line of lines) {
      if (this.isCharacterName(line)) {
        const name = line.split(":")[0]?.trim();
        if (name) characterNames.add(name);
      }
    }

    return characterNames.size;
  }

  private summarizeScene(scene: unknown): string {
    if (typeof scene === "string") {
      return scene.substring(0, 200) + "...";
    }
    return "مشهد سابق";
  }

  private formatCharacter(character: SceneCharacter | string): string {
    if (typeof character === "string") return character;

    const parts: string[] = [];
    if (character.name) parts.push(character.name);
    if (character.role) parts.push(`(${character.role})`);
    if (character.motivation) parts.push(`- الدافع: ${character.motivation}`);

    return parts.join(" ") || "شخصية";
  }

  /**
   * Generate scene notes
   */
  private generateSceneNotes(
    output: StandardAgentOutput,
    tension: number,
    dialogue: number,
    visual: number,
    pacing: number
  ): string[] {
    const notes: string[] = [];

    // Overall quality
    const avgQuality = (tension + dialogue + visual + pacing) / 4;
    if (avgQuality > 0.8) {
      notes.push("مشهد ممتاز الجودة");
    } else if (avgQuality > 0.6) {
      notes.push("مشهد جيد");
    } else {
      notes.push("يحتاج تحسين");
    }

    // Specific strengths/weaknesses
    if (tension > 0.8) notes.push("توتر درامي قوي");
    if (dialogue > 0.8) notes.push("حوارات متميزة");
    if (visual > 0.8) notes.push("وضوح بصري ممتاز");
    if (pacing > 0.8) notes.push("إيقاع متوازن");

    if (tension < 0.5) notes.push("يحتاج مزيد من الصراع");
    if (dialogue < 0.5) notes.push("الحوار يحتاج تطوير");

    // Add original notes
    if (output.notes) {
      notes.push(...output.notes);
    }

    return notes;
  }

  /**
   * Translation helpers
   */
  private translateSceneType(type: string): string {
    const types: Record<string, string> = {
      dramatic: "درامي",
      action: "حركة",
      dialogue: "حواري",
      emotional: "عاطفي",
      comedic: "كوميدي",
      suspense: "تشويق",
      romantic: "رومانسي",
    };
    return types[type] || type;
  }

  private translateEmotionalTone(tone: string): string {
    const tones: Record<string, string> = {
      neutral: "محايد",
      tense: "متوتر",
      happy: "سعيد",
      sad: "حزين",
      angry: "غاضب",
      fearful: "خائف",
      hopeful: "متفائل",
      melancholic: "حزين عميق",
    };
    return tones[tone] || tone;
  }

  private translateConflictLevel(level: string): string {
    const levels: Record<string, string> = {
      none: "بدون صراع",
      low: "منخفض",
      medium: "متوسط",
      high: "عالي",
      extreme: "شديد جداً",
    };
    return levels[level] || level;
  }

  /**
   * Generate fallback response
   */
  protected override async getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    const sceneType =
      (typeof input["context"] === "object" && input["context"]["sceneType"]) ||
      "dramatic";

    return `وصف المشهد:
مشهد ${this.translateSceneType(sceneType as string)} يحتاج إلى تطوير أعمق للشخصيات والصراع.

نموذج مبسط:
[المكان والزمان]
الشخصيات تدخل المشهد. حوار أساسي يعبر عن الموقف.
تطور في الأحداث يدفع القصة للأمام.

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من التفاصيل عن الشخصيات والسياق للحصول على مشهد أكثر عمقاً وتفصيلاً.`;
  }
}

// Export singleton instance
export const sceneGeneratorAgent = new SceneGeneratorAgent();

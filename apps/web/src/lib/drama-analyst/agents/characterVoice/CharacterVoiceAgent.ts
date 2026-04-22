import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";
import { CHARACTER_VOICE_AGENT_CONFIG } from "./agent";

interface CharacterVoiceContext {
  originalText?: string;
  analysisReport?: any;
  characterProfile?: any;
  sceneContext?: string;
  dialogueObjective?: string;
  existingDialogue?: string[];
  emotionalState?: string;
  relationshipContext?: Record<string, string>;
}

/**
 * Character Voice Agent - وكيل صوت الشخصيات
 * يطبق النمط القياسي: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON
 */
export class CharacterVoiceAgent extends BaseAgent {
  constructor() {
    super(
      "PersonaSynth AI",
      TaskType.CHARACTER_VOICE,
      CHARACTER_VOICE_AGENT_CONFIG.systemPrompt || ""
    );

    // Set agent-specific confidence floor
    this.confidenceFloor = 0.85;
  }

  /**
   * Build prompt for character voice synthesis
   */
  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;

    // Extract relevant context
    const ctx = context as CharacterVoiceContext;
    const characterProfile = ctx?.characterProfile || null;
    const sceneContext = ctx?.sceneContext || "";
    const dialogueObjective = ctx?.dialogueObjective || "";
    const existingDialogue = ctx?.existingDialogue || [];
    const emotionalState = ctx?.emotionalState || "neutral";
    const relationshipContext = ctx?.relationshipContext || {};

    // Build structured prompt
    let prompt = `مهمة تركيب صوت الشخصية\n\n`;

    // Add character profile
    if (characterProfile) {
      prompt += `ملف الشخصية:\n`;
      prompt += this.formatCharacterProfile(characterProfile);
      prompt += "\n\n";
    }

    // Add scene context
    if (sceneContext) {
      prompt += `سياق المشهد:\n${sceneContext}\n\n`;
    }

    // Add emotional state
    prompt += `الحالة العاطفية: ${this.translateEmotionalState(emotionalState)}\n\n`;

    // Add existing dialogue samples
    if (existingDialogue.length > 0) {
      prompt += `نماذج من حوارات الشخصية السابقة:\n`;
      existingDialogue.slice(0, 3).forEach((sample: string, index: number) => {
        prompt += `${index + 1}. "${sample}"\n`;
      });
      prompt += "\n";
    }

    // Add relationship context
    if (Object.keys(relationshipContext).length > 0) {
      prompt += `السياق العلائقي:\n`;
      for (const [character, relationship] of Object.entries(
        relationshipContext
      )) {
        prompt += `- مع ${character}: ${relationship}\n`;
      }
      prompt += "\n";
    }

    // Add dialogue objective
    if (dialogueObjective) {
      prompt += `هدف الحوار: ${dialogueObjective}\n\n`;
    }

    // Add specific task
    prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;

    // Add generation instructions
    prompt += `التعليمات:

1. **تحليل الصوت** (2-3 جمل): حدد الخصائص اللغوية المميزة للشخصية
2. **توليد الحوار**: اكتب الحوار أو المونولوج المطلوب
3. **الاتساق**: احتفظ ببصمة الشخصية اللغوية الفريدة
4. **العمق النفسي**: أظهر الحالة الداخلية من خلال الكلمات

قدم الحوار بشكل طبيعي ومباشر، كما لو كانت الشخصية تتحدث فعلاً.
لا تستخدم JSON أو علامات البرمجة. اكتب النص فقط.`;

    return prompt;
  }

  /**
   * Post-process the character voice output
   */
  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Clean up the dialogue text
    let processedText = this.cleanupDialogue(output.text);

    // Assess voice consistency
    const consistencyScore = await this.assessVoiceConsistency(processedText);
    const naturalityScore = await this.assessNaturality(processedText);
    const emotionalDepth = await this.assessEmotionalDepth(processedText);

    // Calculate adjusted confidence
    const adjustedConfidence =
      output.confidence * 0.4 +
      consistencyScore * 0.3 +
      naturalityScore * 0.2 +
      emotionalDepth * 0.1;

    return {
      ...output,
      text: processedText,
      confidence: adjustedConfidence,
      notes: this.generateVoiceNotes(
        output,
        consistencyScore,
        naturalityScore,
        emotionalDepth
      ),
      metadata: {
        ...output.metadata,
        voiceConsistency: consistencyScore,
        naturality: naturalityScore,
        emotionalDepth: emotionalDepth,
        dialogueType: this.detectDialogueType(processedText),
        wordCount: processedText.split(/\s+/).length,
      } as any,
    };
  }

  /**
   * Clean up dialogue formatting
   */
  private cleanupDialogue(text: string): string {
    // Remove JSON and code artifacts
    text = text.replace(/```json[\s\S]*?```/g, "");
    text = text.replace(/```[\s\S]*?```/g, "");
    text = text.replace(/\{[\s\S]*?\}/g, (match) => {
      if (match.includes('"') && match.includes(":")) return "";
      return match;
    });

    // Extract dialogue portion
    const dialogueSection = this.extractDialogue(text);
    if (dialogueSection) {
      text = dialogueSection;
    }

    // Clean up quotation marks
    text = text.replace(/[""]/g, '"');
    text = text.replace(/['']/g, "'");

    // Ensure proper dialogue formatting
    text = this.formatDialogue(text);

    // Remove excessive whitespace
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    return text;
  }

  /**
   * Extract dialogue from text
   */
  private extractDialogue(text: string): string | null {
    // Look for dialogue markers
    const dialoguePatterns = [
      /(?:الحوار|المحادثة|يقول|تقول|قال|قالت):\s*([\s\S]*)/i,
      /"([^"]+)"/g,
      /«([^»]+)»/g,
    ];

    for (const pattern of dialoguePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        if (pattern.global) {
          return matches.join("\n\n");
        } else if (matches[1]) {
          return matches[1];
        }
      }
    }

    // If no clear dialogue markers, look for conversational content
    const lines = text.split("\n").filter((line) => line.trim());
    const dialogueLines = lines.filter((line) => {
      return (
        !line.startsWith("تحليل") &&
        !line.startsWith("ملاحظة") &&
        !line.startsWith("التعليمات") &&
        line.length > 20
      );
    });

    if (dialogueLines.length > 0) {
      return dialogueLines.join("\n\n");
    }

    return null;
  }

  /**
   * Format dialogue properly
   */
  private formatDialogue(text: string): string {
    // Add quotation marks if missing
    const lines = text.split("\n");
    const formatted = lines.map((line) => {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.startsWith('"') &&
        !trimmed.startsWith("«") &&
        !trimmed.includes(":") &&
        trimmed.length > 10
      ) {
        // This looks like dialogue without quotes
        return `"${trimmed}"`;
      }
      return line;
    });

    return formatted.join("\n");
  }

  /**
   * Assess voice consistency
   */
  private async assessVoiceConsistency(text: string): Promise<number> {
    let score = 0.7; // Base score

    // Check for consistent vocabulary patterns
    const formalWords = ["لقد", "إن", "ذلك", "هذا", "أولئك"];
    const informalWords = ["يعني", "كده", "أوكي", "ماشي"];

    const hasFormal = formalWords.some((word) => text.includes(word));
    const hasInformal = informalWords.some((word) => text.includes(word));

    // Consistency means not mixing styles
    if ((hasFormal && !hasInformal) || (!hasFormal && hasInformal)) {
      score += 0.15;
    }

    // Check for consistent sentence structure
    const sentences = text.split(/[.!?]/);
    if (sentences.length > 2) {
      const avgLength =
        sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) /
        sentences.length;
      const variance =
        sentences.reduce((sum, s) => {
          const len = s.split(/\s+/).length;
          return sum + Math.abs(len - avgLength);
        }, 0) / sentences.length;

      // Low variance means consistent sentence length
      if (variance < 5) score += 0.15;
    }

    return Math.min(1, score);
  }

  /**
   * Assess naturality of dialogue
   */
  private async assessNaturality(text: string): Promise<number> {
    let score = 0.6; // Base score

    // Check for conversational markers
    const conversationalMarkers = [
      "آه",
      "أوه",
      "حسناً",
      "ربما",
      "أعتقد",
      "أظن",
      "يبدو",
    ];
    // SECURITY FIX: Use safe string matching to prevent ReDoS attacks
    const markerCount = conversationalMarkers.reduce((count, marker) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(marker).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.2, markerCount * 0.05);

    // Check for natural interruptions or pauses
    if (text.includes("...") || text.includes("،")) {
      score += 0.1;
    }

    // Check for questions (natural dialogue often has questions)
    if (text.includes("؟")) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  /**
   * Assess emotional depth
   */
  private async assessEmotionalDepth(text: string): Promise<number> {
    let score = 0.5; // Base score

    // Check for emotional vocabulary
    const emotionalWords = [
      "أحب",
      "أكره",
      "خائف",
      "سعيد",
      "حزين",
      "غاضب",
      "قلق",
      "متحمس",
      "محبط",
      "فخور",
      "خجول",
      "متردد",
      "أشعر",
      "إحساس",
      "عاطفة",
      "قلب",
      "روح",
    ];

    // SECURITY FIX: Use safe string matching to prevent ReDoS attacks
    const emotionCount = emotionalWords.reduce((count, word) => {
      // Use simple string matching instead of regex to prevent ReDoS
      const occurrences = text.split(word).length - 1;
      return count + occurrences;
    }, 0);
    score += Math.min(0.3, emotionCount * 0.1);

    // Check for metaphorical language (indicates depth)
    const metaphoricalWords = ["كأن", "مثل", "يشبه", "كما لو"];
    const hasMetaphor = metaphoricalWords.some((word) => text.includes(word));
    if (hasMetaphor) score += 0.2;

    return Math.min(1, score);
  }

  /**
   * Detect dialogue type
   */
  private detectDialogueType(text: string): string {
    if (text.includes("؟") && text.includes("!")) return "حوار متنوع";
    if ((text.match(/؟/g) || []).length > 2) return "حوار استفهامي";
    if ((text.match(/!/g) || []).length > 2) return "حوار انفعالي";
    if (text.length > 500 && !text.includes('"')) return "مونولوج داخلي";
    if ((text.match(/"/g) || []).length > 4) return "حوار متبادل";
    return "حوار عادي";
  }

  /**
   * Generate notes about voice synthesis
   */
  private generateVoiceNotes(
    output: StandardAgentOutput,
    consistencyScore: number,
    naturalityScore: number,
    emotionalDepth: number
  ): string[] {
    const notes: string[] = [];

    // Voice consistency
    if (consistencyScore > 0.85) {
      notes.push("صوت متسق تماماً");
    } else if (consistencyScore > 0.7) {
      notes.push("اتساق جيد للصوت");
    } else {
      notes.push("يحتاج تحسين الاتساق");
    }

    // Naturality
    if (naturalityScore > 0.8) {
      notes.push("حوار طبيعي جداً");
    } else if (naturalityScore > 0.6) {
      notes.push("طبيعية مقبولة");
    }

    // Emotional depth
    if (emotionalDepth > 0.7) {
      notes.push("عمق عاطفي ممتاز");
    }

    // Overall confidence
    if (output.confidence > 0.85) {
      notes.push("جودة عالية");
    }

    // Add original notes
    if (output.notes) {
      notes.push(...output.notes.filter((note) => !notes.includes(note)));
    }

    return notes;
  }

  /**
   * Format character profile
   */
  private formatCharacterProfile(profile: any): string {
    if (typeof profile === "string") return profile;

    const formatted: string[] = [];

    if (profile && typeof profile === "object" && profile.name)
      formatted.push(`الاسم: ${profile.name}`);
    if (profile.age) formatted.push(`العمر: ${profile.age}`);
    if (profile.personality) formatted.push(`الشخصية: ${profile.personality}`);
    if (profile.background) formatted.push(`الخلفية: ${profile.background}`);
    if (profile.goals) formatted.push(`الأهداف: ${profile.goals}`);
    if (profile.fears) formatted.push(`المخاوف: ${profile.fears}`);
    if (profile.speechPattern)
      formatted.push(`نمط الكلام: ${profile.speechPattern}`);

    return formatted.join("\n") || "ملف شخصية عام";
  }

  /**
   * Translate emotional state
   */
  private translateEmotionalState(state: string): string {
    const states: Record<string, string> = {
      neutral: "محايد",
      happy: "سعيد",
      sad: "حزين",
      angry: "غاضب",
      fearful: "خائف",
      anxious: "قلق",
      excited: "متحمس",
      confused: "مرتبك",
      confident: "واثق",
      disappointed: "محبط",
    };
    return states[state] || state;
  }

  /**
   * Generate fallback response
   */
  protected override async getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    const ctx = input.context as CharacterVoiceContext;
    const character = ctx?.characterProfile?.name || "الشخصية";

    return `تحليل صوت ${character}:
الشخصية لديها نمط كلام مميز يعكس خلفيتها وشخصيتها.

نموذج حوار مقترح:
"أحتاج إلى وقت للتفكير في هذا الأمر. الموضوع أكبر مما توقعت."

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من تفاصيل الشخصية للحصول على حوار أكثر دقة واتساقاً.`;
  }
}

// Export singleton instance
export const characterVoiceAgent = new CharacterVoiceAgent();

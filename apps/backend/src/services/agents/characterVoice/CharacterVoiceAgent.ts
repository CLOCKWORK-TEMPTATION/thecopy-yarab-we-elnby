import { TaskType } from "@core/types";
import { BaseAgent } from "../shared/BaseAgent";
import {
  StandardAgentInput,
  StandardAgentOutput,
} from "../shared/standardAgentPattern";
import { CHARACTER_VOICE_AGENT_CONFIG } from "./agent";

interface CharacterProfile {
  name?: string;
  age?: string;
  personality?: string;
  background?: string;
  goals?: string;
  fears?: string;
  speechPattern?: string;
}

interface CharacterVoiceContext {
  originalText?: string;
  analysisReport?: Record<string, unknown>;
  characterProfile?: CharacterProfile | string;
  sceneContext?: string;
  dialogueObjective?: string;
  existingDialogue?: string[];
  emotionalState?: string;
  relationshipContext?: Record<string, string>;
}

/** Character Voice Agent - وكيل صوت الشخصيات */
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

  protected buildPrompt(input: StandardAgentInput): string {
    const { input: taskInput, context } = input;
    const ctx = context as CharacterVoiceContext;

    const parts = [
      `مهمة تركيب صوت الشخصية\n\n`,
      this.buildProfileSection(ctx?.characterProfile),
      this.buildSceneSection(ctx),
      this.buildDialogueSamplesSection(ctx?.existingDialogue || []),
      this.buildRelationshipSection(ctx?.relationshipContext || {}),
      ctx?.dialogueObjective ? `هدف الحوار: ${ctx.dialogueObjective}\n\n` : "",
      `المهمة المطلوبة:\n${taskInput}\n\n`,
      this.getVoiceInstructions(),
    ];
    return parts.join("");
  }

  private buildSceneSection(ctx: CharacterVoiceContext | undefined): string {
    let section = "";
    if (ctx?.sceneContext) section += `سياق المشهد:\n${ctx.sceneContext}\n\n`;
    section += `الحالة العاطفية: ${this.translateEmotionalState(ctx?.emotionalState || "neutral")}\n\n`;
    return section;
  }

  private buildProfileSection(profile: CharacterVoiceContext["characterProfile"]): string {
    if (!profile) return "";
    return `ملف الشخصية:\n${this.formatCharacterProfile(profile)}\n\n`;
  }

  private buildDialogueSamplesSection(existingDialogue: string[]): string {
    if (existingDialogue.length === 0) return "";
    let section = `نماذج من حوارات الشخصية السابقة:\n`;
    existingDialogue.slice(0, 3).forEach((sample: string, index: number) => {
      section += `${index + 1}. "${sample}"\n`;
    });
    return section + "\n";
  }

  private buildRelationshipSection(relationshipContext: Record<string, string>): string {
    if (Object.keys(relationshipContext).length === 0) return "";
    let section = `السياق العلائقي:\n`;
    for (const [character, relationship] of Object.entries(relationshipContext)) {
      section += `- مع ${character}: ${relationship}\n`;
    }
    return section + "\n";
  }

  private getVoiceInstructions(): string {
    return `التعليمات:

1. **تحليل الصوت** (2-3 جمل): حدد الخصائص اللغوية المميزة للشخصية
2. **توليد الحوار**: اكتب الحوار أو المونولوج المطلوب
3. **الاتساق**: احتفظ ببصمة الشخصية اللغوية الفريدة
4. **العمق النفسي**: أظهر الحالة الداخلية من خلال الكلمات

قدم الحوار بشكل طبيعي ومباشر، كما لو كانت الشخصية تتحدث فعلاً.
لا تستخدم JSON أو علامات البرمجة. اكتب النص فقط.`;
  }

  protected override async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Clean up the dialogue text
    const processedText = this.cleanupDialogue(output.text);

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
      },
    };
  }

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

  private async assessVoiceConsistency(text: string): Promise<number> {
    let score = 0.7;
    const hasFormal = ["لقد", "إن", "ذلك", "هذا", "أولئك"].some((w) => text.includes(w));
    const hasInformal = ["يعني", "كده", "أوكي", "ماشي"].some((w) => text.includes(w));
    if ((hasFormal && !hasInformal) || (!hasFormal && hasInformal)) score += 0.15;
    score += this.assessSentenceConsistency(text);
    return Math.min(1, score);
  }

  private assessSentenceConsistency(text: string): number {
    const sentences = text.split(/[.!?]/);
    if (sentences.length <= 2) return 0;
    const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    const variance = sentences.reduce((sum, s) => sum + Math.abs(s.split(/\s+/).length - avgLength), 0) / sentences.length;
    return variance < 5 ? 0.15 : 0;
  }

  private async assessNaturality(text: string): Promise<number> {
    let score = 0.6;
    const markers = ["آه", "أوه", "حسناً", "ربما", "أعتقد", "أظن", "يبدو"];
    const markerCount = markers.reduce((count, m) => count + (text.split(m).length - 1), 0);
    score += Math.min(0.2, markerCount * 0.05);
    if (text.includes("...") || text.includes("،")) score += 0.1;
    if (text.includes("؟")) score += 0.1;
    return Math.min(1, score);
  }

  private async assessEmotionalDepth(text: string): Promise<number> {
    let score = 0.5;
    const emotionalWords = ["أحب", "أكره", "خائف", "سعيد", "حزين", "غاضب", "قلق", "متحمس", "محبط", "فخور", "خجول", "متردد", "أشعر", "إحساس", "عاطفة", "قلب", "روح"];
    const emotionCount = emotionalWords.reduce((count, w) => count + (text.split(w).length - 1), 0);
    score += Math.min(0.3, emotionCount * 0.1);
    if (["كأن", "مثل", "يشبه", "كما لو"].some((w) => text.includes(w))) score += 0.2;
    return Math.min(1, score);
  }

  /**
   * Detect dialogue type
   */
  private detectDialogueType(text: string): string {
    const charCount = (char: string) => (text.match(new RegExp(char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (text.includes("؟") && text.includes("!")) return "حوار متنوع";
    if (charCount("؟") > 2) return "حوار استفهامي";
    if (charCount("!") > 2) return "حوار انفعالي";
    if (text.length > 500 && !text.includes('"')) return "مونولوج داخلي";
    if (charCount('"') > 4) return "حوار متبادل";
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
    if (consistencyScore > 0.85) notes.push("صوت متسق تماماً");
    else if (consistencyScore > 0.7) notes.push("اتساق جيد للصوت");
    else notes.push("يحتاج تحسين الاتساق");
    if (naturalityScore > 0.8) notes.push("حوار طبيعي جداً");
    else if (naturalityScore > 0.6) notes.push("طبيعية مقبولة");
    if (emotionalDepth > 0.7) notes.push("عمق عاطفي ممتاز");
    if (output.confidence > 0.85) notes.push("جودة عالية");
    if (output.notes) notes.push(...output.notes.filter((n) => !notes.includes(n)));
    return notes;
  }

  private static readonly PROFILE_FIELDS: Array<[keyof CharacterProfile, string]> = [
    ["name", "الاسم"], ["age", "العمر"], ["personality", "الشخصية"],
    ["background", "الخلفية"], ["goals", "الأهداف"], ["fears", "المخاوف"],
    ["speechPattern", "نمط الكلام"],
  ];

  private formatCharacterProfile(profile: CharacterProfile | string): string {
    if (typeof profile === "string") return profile;
    const formatted = CharacterVoiceAgent.PROFILE_FIELDS
      .filter(([key]) => profile?.[key])
      .map(([key, label]) => `${label}: ${profile[key]}`);
    return formatted.join("\n") || "ملف شخصية عام";
  }

  private translateEmotionalState(state: string): string {
    const states: Record<string, string> = { neutral: "محايد", happy: "سعيد", sad: "حزين", angry: "غاضب", fearful: "خائف", anxious: "قلق", excited: "متحمس", confused: "مرتبك", confident: "واثق", disappointed: "محبط" };
    return states[state] || state;
  }

  protected override async getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    const ctx = input["context"] as CharacterVoiceContext;
    const profile = ctx?.['characterProfile'];
    const character = (typeof profile === "object" && profile !== null ? (profile as CharacterProfile).name : undefined) || "الشخصية";

    return `تحليل صوت ${character}:
الشخصية لديها نمط كلام مميز يعكس خلفيتها وشخصيتها.

نموذج حوار مقترح:
"أحتاج إلى وقت للتفكير في هذا الأمر. الموضوع أكبر مما توقعت."

ملاحظة: يُرجى تفعيل الخيارات المتقدمة وتوفير المزيد من تفاصيل الشخصية للحصول على حوار أكثر دقة واتساقاً.`;
  }
}

// Export singleton instance
export const characterVoiceAgent = new CharacterVoiceAgent();

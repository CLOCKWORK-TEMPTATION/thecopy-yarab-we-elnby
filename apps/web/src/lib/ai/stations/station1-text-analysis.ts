import { BaseStation, StationInput, StationOptions } from "./base-station";
import { GeminiService, GeminiModel } from "./gemini-service";

export interface Station1Input extends StationInput {
  proseFilePath?: string;
  station1Options?: {
    enableDialogueAnalysis?: boolean;
    enableVoiceDistinction?: boolean;
    minCharacters?: number;
    maxCharacters?: number;
  };
}

export interface CharacterProfile {
  name: string;
  role: "protagonist" | "antagonist" | "supporting" | "minor";
  personalityTraits: string[];
  motivations: string[];
  goals: string[];
  obstacles: string[];
  arc: {
    type: "positive" | "negative" | "flat" | "complex";
    description: string;
    keyMoments: string[];
  };
  confidence: number;
}

export interface DialogueMetrics {
  efficiency: number;
  distinctiveness: number;
  naturalness: number;
  subtext: number;
  issues: {
    type:
      | "redundancy"
      | "inconsistency"
      | "exposition_dump"
      | "on_the_nose"
      | "pacing";
    location: string;
    severity: "low" | "medium" | "high";
    suggestion: string;
  }[];
}

export interface VoiceProfile {
  character: string;
  distinctiveness: number;
  characteristics: string[];
  sampleLines: string[];
}

export interface VoiceAnalysis {
  profiles: Map<string, VoiceProfile>;
  overlapIssues: {
    character1: string;
    character2: string;
    similarity: number;
    examples: string[];
    recommendation: string;
  }[];
  overallDistinctiveness: number;
}

export interface NarrativeStyleAnalysis {
  overallTone: string;
  toneElements: string[];
  pacingAnalysis: {
    overall: "very_slow" | "slow" | "moderate" | "fast" | "very_fast";
    variation: number;
    strengths: string[];
    weaknesses: string[];
  };
  languageStyle: {
    complexity: "simple" | "moderate" | "complex" | "highly_complex";
    vocabulary: "limited" | "standard" | "rich" | "extensive";
    sentenceStructure: string;
    literaryDevices: string[];
  };
  pointOfView: string;
  timeStructure: string;
}

export interface Station1Output {
  logline: string;
  majorCharacters: CharacterProfile[];
  characterAnalysis: Map<string, CharacterProfile>;
  dialogueAnalysis: DialogueMetrics;
  voiceAnalysis: VoiceAnalysis;
  narrativeStyleAnalysis: NarrativeStyleAnalysis;
  textStatistics: {
    totalWords: number;
    totalCharacters: number;
    avgSentenceLength: number;
    dialoguePercentage: number;
    narrativePercentage: number;
  };
  uncertaintyReport: {
    confidence: number;
    uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
      reducible: boolean;
    }[];
  };
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    agentsUsed: string[];
    executionTime: number;
    textLength: number;
    chunksProcessed: number;
  };
}

interface CharactersResponse {
  characters: {
    name: string;
    role: string;
    prominence: number;
  }[];
}

interface CharacterAnalysisResponse {
  personality_traits: string[];
  motivations: string[];
  goals: string[];
  obstacles: string[];
  arc_type: string;
  arc_description: string;
  key_moments: string[];
  confidence: number;
}

interface DialogueAnalysisResponse {
  efficiency: number;
  distinctiveness: number;
  naturalness: number;
  subtext: number;
  issues: {
    type: string;
    location: string;
    severity: string;
    suggestion: string;
  }[];
}

interface VoiceAnalysisResponse {
  profiles: {
    character: string;
    distinctiveness: number;
    characteristics: string[];
    sample_lines: string[];
  }[];
  overlaps: {
    character1: string;
    character2: string;
    similarity: number;
    examples: string[];
    recommendation: string;
  }[];
  overall_distinctiveness: number;
}

interface NarrativeStyleResponse {
  overall_tone: string;
  tone_elements: string[];
  pacing: {
    overall: string;
    variation: number;
    strengths: string[];
    weaknesses: string[];
  };
  language_style: {
    complexity: string;
    vocabulary: string;
    sentence_structure: string;
    literary_devices: string[];
  };
  point_of_view: string;
  time_structure: string;
}

export class Station1TextAnalysis extends BaseStation {
  private readonly CHUNK_SIZE = 25000;
  private readonly MAX_PARALLEL_REQUESTS = 3;

  constructor(geminiService: GeminiService) {
    super(geminiService, "Station 1: Text Analysis", 1);
  }

  protected async execute(
    input: StationInput,
    _options: StationOptions
  ): Promise<Station1Output> {
    const station1Input = input as Station1Input;
    const startTime = Date.now();
    const textLength = station1Input.text.length;
    const chunks = this.chunkText(station1Input.text);

    try {
      const [logline, charactersData, narrativeStyle] = await Promise.all([
        this.generateLogline(station1Input.text),
        this.identifyMajorCharacters(station1Input.text),
        this.analyzeNarrativeStyle(station1Input.text),
      ]);

      const characters = await this.analyzeCharactersInDepth(
        station1Input.text,
        charactersData
      );

      let dialogueAnalysis: DialogueMetrics;
      let voiceAnalysis: VoiceAnalysis;

      if (station1Input.station1Options?.enableDialogueAnalysis !== false) {
        [dialogueAnalysis, voiceAnalysis] = await Promise.all([
          this.analyzeDialogue(station1Input.text, characters),
          this.analyzeVoices(station1Input.text, characters),
        ]);
      } else {
        dialogueAnalysis = this.getDefaultDialogueMetrics();
        voiceAnalysis = this.getDefaultVoiceAnalysis();
      }

      const textStats = this.calculateTextStatistics(station1Input.text);
      const uncertaintyReport = this.buildUncertaintyReport(
        characters,
        dialogueAnalysis,
        voiceAnalysis
      );

      const characterAnalysis = new Map<string, CharacterProfile>();
      characters.forEach((char) => characterAnalysis.set(char.name, char));

      return {
        logline,
        majorCharacters: characters.slice(0, 7),
        characterAnalysis,
        dialogueAnalysis,
        voiceAnalysis,
        narrativeStyleAnalysis: narrativeStyle,
        textStatistics: textStats,
        uncertaintyReport,
        metadata: {
          analysisTimestamp: new Date(),
          status: "Success",
          agentsUsed: this.getAgentsUsed(),
          executionTime: Date.now() - startTime,
          textLength,
          chunksProcessed: chunks.length,
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Station 1 execution failed: ${errorMessage}`);
    }
  }

  private chunkText(text: string): string[] {
    if (text.length <= this.CHUNK_SIZE) {
      return [text];
    }

    const chunks: string[] = [];
    let position = 0;

    while (position < text.length) {
      const chunkEnd = Math.min(position + this.CHUNK_SIZE, text.length);
      let actualEnd = chunkEnd;

      if (chunkEnd < text.length) {
        const lastPeriod = text.lastIndexOf(".", chunkEnd);
        const lastNewline = text.lastIndexOf("\n", chunkEnd);
        const breakPoint = Math.max(lastPeriod, lastNewline);

        if (breakPoint > position && breakPoint > chunkEnd - 1000) {
          actualEnd = breakPoint + 1;
        }
      }

      chunks.push(text.slice(position, actualEnd));
      position = actualEnd;
    }

    return chunks;
  }

  private async generateLogline(text: string): Promise<string> {
    const contextText = text.slice(0, Math.min(15000, text.length));

    const prompt = `Analyze this narrative text and generate a compelling logline.

A logline should be 1-2 sentences that capture:
- The protagonist
- Their goal
- The main obstacle/conflict
- The stakes

Text excerpt:
${contextText}

Generate a concise, engaging logline in Arabic.`;

    const response = await this.geminiService.generate<{ raw: string }>({
      prompt,
      model: GeminiModel.FLASH,
      temperature: 0.6,
      maxTokens: 300,
      systemInstruction:
        "You are an expert story analyst. Provide clear, concise analysis.",
    });

    const logline = this.extractText(response.content);

    if (!logline || logline.length < 20) {
      throw new Error("Failed to generate valid logline");
    }

    return logline;
  }

  private async identifyMajorCharacters(
    text: string
  ): Promise<{ name: string; role: string; prominence: number }[]> {
    const contextText = text.slice(0, Math.min(20000, text.length));

    const prompt = `Analyze this narrative and identify the major characters.

For each character, determine:
- Name
- Role (protagonist/antagonist/supporting/minor)
- Prominence (0-10 scale based on narrative presence)

Focus on characters who:
- Appear frequently
- Drive the plot
- Have clear motivations and goals
- Undergo development

List 3-10 characters in JSON format:
{
  "characters": [
    {"name": "character name", "role": "protagonist", "prominence": 10},
    ...
  ]
}

Text excerpt:
${contextText}`;

    const response = await this.geminiService.generate<{ raw: string }>({
      prompt,
      model: GeminiModel.FLASH,
      temperature: 0.3,
      maxTokens: 1500,
      systemInstruction:
        "You are an expert character analyst. Provide structured JSON output.",
    });

    try {
      const parsed = this.parseJSON<CharactersResponse>(response.content);

      if (!parsed?.characters || !Array.isArray(parsed.characters)) {
        throw new Error("Invalid characters response format");
      }

      return parsed.characters
        .filter((c) => c.name && c.role && typeof c.prominence === "number")
        .sort((a, b) => b.prominence - a.prominence)
        .slice(0, 10);
    } catch (error) {
      throw new Error(
        `Failed to parse characters: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private async analyzeCharactersInDepth(
    text: string,
    charactersData: { name: string; role: string; prominence: number }[]
  ): Promise<CharacterProfile[]> {
    const analyses = await this.processInBatches(
      charactersData,
      this.MAX_PARALLEL_REQUESTS,
      (char) => this.analyzeCharacter(text, char.name, char.role)
    );

    return analyses.filter((a): a is CharacterProfile => a !== null);
  }

  private async analyzeCharacter(
    text: string,
    name: string,
    role: string
  ): Promise<CharacterProfile | null> {
    const contextText = text.slice(0, Math.min(25000, text.length));

    const prompt = `Conduct a deep character analysis for: ${name}

Analyze:
1. Personality traits (list 3-7 key traits)
2. Motivations (what drives this character)
3. Goals (what they want to achieve)
4. Obstacles (what stands in their way)
5. Character arc:
   - Type: positive/negative/flat/complex
   - Description: how they change
   - Key moments: pivotal scenes

Provide JSON:
{
  "personality_traits": ["trait1", "trait2", ...],
  "motivations": ["motivation1", ...],
  "goals": ["goal1", ...],
  "obstacles": ["obstacle1", ...],
  "arc_type": "positive",
  "arc_description": "description",
  "key_moments": ["moment1", ...],
  "confidence": 0.85
}

Text excerpt:
${contextText}`;

    try {
      const response = await this.geminiService.generate<{ raw: string }>({
        prompt,
        model: GeminiModel.PRO,
        temperature: 0.4,
        maxTokens: 2000,
        systemInstruction:
          "You are an expert character psychologist. Provide detailed JSON analysis.",
      });

      const parsed = this.parseJSON<CharacterAnalysisResponse>(
        response.content
      );

      if (!parsed || !Array.isArray(parsed.personality_traits)) {
        return null;
      }

      return {
        name,
        role: this.normalizeRole(role),
        personalityTraits: parsed.personality_traits || [],
        motivations: parsed.motivations || [],
        goals: parsed.goals || [],
        obstacles: parsed.obstacles || [],
        arc: {
          type: this.normalizeArcType(parsed.arc_type),
          description: parsed.arc_description || "",
          keyMoments: parsed.key_moments || [],
        },
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      // SECURITY FIX: Pass name as separate argument to prevent format string injection
      console.error("Failed to analyze character:", name, error);
      return null;
    }
  }

  private async analyzeDialogue(
    text: string,
    characters: CharacterProfile[]
  ): Promise<DialogueMetrics> {
    const contextText = text.slice(0, Math.min(25000, text.length));
    const characterNames = characters.map((c) => c.name).join(", ");

    const prompt = `Analyze the dialogue quality in this narrative.

Main characters: ${characterNames}

Evaluate:
1. Efficiency (0-10): how economical and purposeful
2. Distinctiveness (0-10): how unique each voice is
3. Naturalness (0-10): how realistic and authentic
4. Subtext (0-10): how much is conveyed indirectly

Identify issues:
- Redundancy: repetitive or unnecessary dialogue
- Inconsistency: out of character speech
- Exposition dumps: unnatural information delivery
- On-the-nose: overly explicit dialogue
- Pacing: rhythm problems

Provide JSON:
{
  "efficiency": 7.5,
  "distinctiveness": 8.0,
  "naturalness": 7.0,
  "subtext": 6.5,
  "issues": [
    {
      "type": "redundancy",
      "location": "scene description",
      "severity": "medium",
      "suggestion": "improvement suggestion"
    }
  ]
}

Text excerpt:
${contextText}`;

    try {
      const response = await this.geminiService.generate<{ raw: string }>({
        prompt,
        model: GeminiModel.PRO,
        temperature: 0.3,
        maxTokens: 2500,
        systemInstruction:
          "You are an expert dialogue analyst. Provide detailed JSON analysis.",
      });

      const parsed = this.parseJSON<DialogueAnalysisResponse>(response.content);

      if (!parsed || typeof parsed.efficiency !== "number") {
        return this.getDefaultDialogueMetrics();
      }

      return {
        efficiency: this.clamp(parsed.efficiency, 0, 10),
        distinctiveness: this.clamp(parsed.distinctiveness, 0, 10),
        naturalness: this.clamp(parsed.naturalness, 0, 10),
        subtext: this.clamp(parsed.subtext, 0, 10),
        issues: this.normalizeIssues(parsed.issues || []),
      };
    } catch (error) {
      console.error("Failed to analyze dialogue:", error);
      return this.getDefaultDialogueMetrics();
    }
  }

  private async analyzeVoices(
    text: string,
    characters: CharacterProfile[]
  ): Promise<VoiceAnalysis> {
    if (characters.length < 2) {
      return this.getDefaultVoiceAnalysis();
    }

    const contextText = text.slice(0, Math.min(25000, text.length));
    const characterNames = characters.map((c) => c.name).join(", ");

    const prompt = `Analyze the distinctiveness of character voices.

Characters: ${characterNames}

For each character, assess:
1. Distinctiveness (0-10): how unique their voice is
2. Characteristics: speech patterns, vocabulary, tone
3. Sample lines: representative dialogue

Identify overlaps:
- Characters with similar voices
- Similarity percentage
- Examples of overlap
- Recommendations for differentiation

Provide JSON:
{
  "profiles": [
    {
      "character": "name",
      "distinctiveness": 8.5,
      "characteristics": ["trait1", "trait2"],
      "sample_lines": ["line1", "line2"]
    }
  ],
  "overlaps": [
    {
      "character1": "name1",
      "character2": "name2",
      "similarity": 75,
      "examples": ["example1"],
      "recommendation": "suggestion"
    }
  ],
  "overall_distinctiveness": 7.5
}

Text excerpt:
${contextText}`;

    try {
      const response = await this.geminiService.generate<{ raw: string }>({
        prompt,
        model: GeminiModel.PRO,
        temperature: 0.3,
        maxTokens: 3000,
        systemInstruction:
          "You are an expert in character voice analysis. Provide detailed JSON analysis.",
      });

      const parsed = this.parseJSON<VoiceAnalysisResponse>(response.content);

      if (!parsed || !Array.isArray(parsed.profiles)) {
        return this.getDefaultVoiceAnalysis();
      }

      const profiles = new Map<string, VoiceProfile>();
      parsed.profiles.forEach((p) => {
        profiles.set(p.character, {
          character: p.character,
          distinctiveness: this.clamp(p.distinctiveness, 0, 10),
          characteristics: p.characteristics || [],
          sampleLines: p.sample_lines || [],
        });
      });

      return {
        profiles,
        overlapIssues: (parsed.overlaps || []).map((o) => ({
          character1: o.character1,
          character2: o.character2,
          similarity: this.clamp(o.similarity, 0, 100),
          examples: o.examples || [],
          recommendation: o.recommendation || "",
        })),
        overallDistinctiveness: this.clamp(
          parsed.overall_distinctiveness,
          0,
          10
        ),
      };
    } catch (error) {
      console.error("Failed to analyze voices:", error);
      return this.getDefaultVoiceAnalysis();
    }
  }

  private async analyzeNarrativeStyle(
    text: string
  ): Promise<NarrativeStyleAnalysis> {
    const contextText = text.slice(0, Math.min(20000, text.length));

    const prompt = `Analyze the narrative style of this text.

Assess:
1. Overall tone and tone elements
2. Pacing: overall speed, variation, strengths, weaknesses
3. Language style: complexity, vocabulary, sentence structure, literary devices
4. Point of view
5. Time structure

Provide JSON:
{
  "overall_tone": "tone description",
  "tone_elements": ["element1", "element2"],
  "pacing": {
    "overall": "moderate",
    "variation": 7.5,
    "strengths": ["strength1"],
    "weaknesses": ["weakness1"]
  },
  "language_style": {
    "complexity": "moderate",
    "vocabulary": "rich",
    "sentence_structure": "description",
    "literary_devices": ["device1"]
  },
  "point_of_view": "third person limited",
  "time_structure": "chronological"
}

Text excerpt:
${contextText}`;

    try {
      const response = await this.geminiService.generate<{ raw: string }>({
        prompt,
        model: GeminiModel.PRO,
        temperature: 0.4,
        maxTokens: 2000,
        systemInstruction:
          "You are an expert literary analyst. Provide detailed JSON analysis.",
      });

      const parsed = this.parseJSON<NarrativeStyleResponse>(response.content);

      if (!parsed?.overall_tone) {
        throw new Error("Invalid narrative style response");
      }

      return {
        overallTone: parsed.overall_tone,
        toneElements: parsed.tone_elements || [],
        pacingAnalysis: {
          overall: this.normalizePacingSpeed(parsed.pacing?.overall),
          variation: this.clamp(parsed.pacing?.variation || 5, 0, 10),
          strengths: parsed.pacing?.strengths || [],
          weaknesses: parsed.pacing?.weaknesses || [],
        },
        languageStyle: {
          complexity: this.normalizeComplexity(
            parsed.language_style?.complexity
          ),
          vocabulary: this.normalizeVocabulary(
            parsed.language_style?.vocabulary
          ),
          sentenceStructure: parsed.language_style?.sentence_structure || "",
          literaryDevices: parsed.language_style?.literary_devices || [],
        },
        pointOfView: parsed.point_of_view || "غير محدد",
        timeStructure: parsed.time_structure || "غير محدد",
      };
    } catch (error) {
      throw new Error(
        `Failed to analyze narrative style: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  private calculateTextStatistics(text: string): {
    totalWords: number;
    totalCharacters: number;
    avgSentenceLength: number;
    dialoguePercentage: number;
    narrativePercentage: number;
  } {
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);

    const dialogueMatches = text.match(/["“”«»].*?["“”«»]/g) ?? [];
    const dialogueText = dialogueMatches.join(" ");
    const dialogueWords = dialogueText.split(/\s+/).filter((w) => w.length > 0);

    const totalWords = words.length;
    const dialoguePercentage =
      totalWords > 0 ? (dialogueWords.length / totalWords) * 100 : 0;

    return {
      totalWords,
      totalCharacters: text.length,
      avgSentenceLength:
        sentences.length > 0 ? totalWords / sentences.length : 0,
      dialoguePercentage: Math.round(dialoguePercentage * 10) / 10,
      narrativePercentage: Math.round((100 - dialoguePercentage) * 10) / 10,
    };
  }

  private buildUncertaintyReport(
    characters: CharacterProfile[],
    dialogue: DialogueMetrics,
    voice: VoiceAnalysis
  ): {
    confidence: number;
    uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
      reducible: boolean;
    }[];
  } {
    const uncertainties: {
      type: "epistemic" | "aleatoric";
      aspect: string;
      note: string;
      reducible: boolean;
    }[] = [];

    const avgCharConfidence =
      characters.length > 0
        ? characters.reduce((sum, c) => sum + c.confidence, 0) /
          characters.length
        : 0.5;

    if (avgCharConfidence < 0.7) {
      uncertainties.push({
        type: "epistemic",
        aspect: "تحليل الشخصيات",
        note: "مستوى الثقة في تحليل بعض الشخصيات منخفض نسبياً",
        reducible: true,
      });
    }

    if (dialogue.distinctiveness < 6) {
      uncertainties.push({
        type: "aleatoric",
        aspect: "تميز الحوار",
        note: "أصوات الشخصيات قد تكون غير متميزة بشكل كافٍ",
        reducible: false,
      });
    }

    if (voice.overlapIssues.length > 0) {
      uncertainties.push({
        type: "epistemic",
        aspect: "تداخل الأصوات",
        note: `تم اكتشاف ${voice.overlapIssues.length} حالات تداخل بين أصوات الشخصيات`,
        reducible: true,
      });
    }

    const overallConfidence = this.clamp(
      avgCharConfidence * 0.5 +
        (dialogue.distinctiveness / 10) * 0.3 +
        (voice.overallDistinctiveness / 10) * 0.2,
      0,
      1
    );

    return {
      confidence: Math.round(overallConfidence * 100) / 100,
      uncertainties,
    };
  }

  private async processInBatches<T, R>(
    items: T[],
    batchSize: number,
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(processor));
      results.push(...batchResults);
    }

    return results;
  }

  private parseJSON<T>(content: { raw?: unknown } | string): T {
    let text: string;

    if (typeof content === "string") {
      text = content;
    } else if (content && typeof content === "object" && "raw" in content) {
      text = String(content.raw ?? "");
    } else {
      throw new Error("Invalid content format");
    }

    const jsonMatch = /\{[\s\S]*\}/.exec(text);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    return JSON.parse(jsonMatch[0]);
  }

  private extractText(content: { raw?: unknown } | string): string {
    if (typeof content === "string") {
      return content.trim();
    }
    if (content && typeof content === "object" && "raw" in content) {
      return String(content.raw ?? "").trim();
    }
    return "";
  }

  private normalizeRole(
    role: string
  ): "protagonist" | "antagonist" | "supporting" | "minor" {
    const normalized = role.toLowerCase();
    if (normalized.includes("protag") || normalized.includes("بطل"))
      return "protagonist";
    if (normalized.includes("antag") || normalized.includes("خصم"))
      return "antagonist";
    if (normalized.includes("support") || normalized.includes("مساعد"))
      return "supporting";
    return "minor";
  }

  private normalizeArcType(
    type: string
  ): "positive" | "negative" | "flat" | "complex" {
    const normalized = type.toLowerCase();
    if (normalized.includes("positive") || normalized.includes("إيجابي"))
      return "positive";
    if (normalized.includes("negative") || normalized.includes("سلبي"))
      return "negative";
    if (normalized.includes("complex") || normalized.includes("معقد"))
      return "complex";
    return "flat";
  }

  private normalizeIssues(issues: any[]): DialogueMetrics["issues"] {
    return issues
      .filter((i) => i?.type && i.location)
      .map((i) => ({
        type: this.normalizeIssueType(i.type),
        location: String(i.location),
        severity: this.normalizeSeverity(i.severity),
        suggestion: String(i.suggestion ?? ""),
      }));
  }

  private normalizeIssueType(
    type: string
  ):
    | "redundancy"
    | "inconsistency"
    | "exposition_dump"
    | "on_the_nose"
    | "pacing" {
    const normalized = type.toLowerCase();
    if (normalized.includes("redundan")) return "redundancy";
    if (normalized.includes("inconsist")) return "inconsistency";
    if (normalized.includes("exposition")) return "exposition_dump";
    if (normalized.includes("nose")) return "on_the_nose";
    return "pacing";
  }

  private normalizeSeverity(severity: string): "low" | "medium" | "high" {
    const normalized = (severity || "").toLowerCase();
    if (normalized.includes("high") || normalized.includes("عالي"))
      return "high";
    if (normalized.includes("low") || normalized.includes("منخفض"))
      return "low";
    return "medium";
  }

  private normalizePacingSpeed(
    speed: string
  ): "very_slow" | "slow" | "moderate" | "fast" | "very_fast" {
    const normalized = (speed || "").toLowerCase();
    if (normalized.includes("very_slow") || normalized.includes("بطيء جداً"))
      return "very_slow";
    if (normalized.includes("slow") || normalized.includes("بطيء"))
      return "slow";
    if (normalized.includes("fast") && normalized.includes("very"))
      return "very_fast";
    if (normalized.includes("fast") || normalized.includes("سريع"))
      return "fast";
    return "moderate";
  }

  private normalizeComplexity(
    complexity: string
  ): "simple" | "moderate" | "complex" | "highly_complex" {
    const normalized = (complexity || "").toLowerCase();
    if (normalized.includes("highly") || normalized.includes("معقد جداً"))
      return "highly_complex";
    if (normalized.includes("complex") || normalized.includes("معقد"))
      return "complex";
    if (normalized.includes("simple") || normalized.includes("بسيط"))
      return "simple";
    return "moderate";
  }

  private normalizeVocabulary(
    vocabulary: string
  ): "limited" | "standard" | "rich" | "extensive" {
    const normalized = (vocabulary || "").toLowerCase();
    if (normalized.includes("extensive") || normalized.includes("واسع"))
      return "extensive";
    if (normalized.includes("rich") || normalized.includes("ثري"))
      return "rich";
    if (normalized.includes("limited") || normalized.includes("محدود"))
      return "limited";
    return "standard";
  }

  private getDefaultDialogueMetrics(): DialogueMetrics {
    return {
      efficiency: 5.0,
      distinctiveness: 5.0,
      naturalness: 5.0,
      subtext: 5.0,
      issues: [],
    };
  }

  private getDefaultVoiceAnalysis(): VoiceAnalysis {
    return {
      profiles: new Map(),
      overlapIssues: [],
      overallDistinctiveness: 5.0,
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  protected getAgentsUsed(): string[] {
    return [
      "Logline Generator",
      "Character Identifier",
      "Character Deep Analyzer",
      "Dialogue Forensics",
      "Voice Analyzer",
      "Narrative Style Analyzer",
      "Text Statistics Calculator",
    ];
  }
}

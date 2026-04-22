import { Plugin, PluginInput, PluginOutput } from "../../types";
import { v4 as uuidv4 } from "uuid";

interface MoodBoardItem {
  id: string;
  type: "color" | "texture" | "reference" | "style";
  value: string;
  description: string;
  descriptionAr: string;
  tags: string[];
}

interface InspirationResult {
  id: string;
  sceneDescription: string;
  mood: string;
  era: string;
  colorPalette: string[];
  styleReferences: string[];
  moodBoard: MoodBoardItem[];
  suggestions: string[];
  suggestionsAr: string[];
}

interface AnalyzeSceneInput {
  description: string;
  mood?: string;
  era?: string;
  genre?: string;
  references?: string[];
}

export class CreativeInspirationAssistant implements Plugin {
  id = "creative-inspiration";
  name = "Creative Inspiration AI Assistant";
  nameAr = "المساعد الإبداعي للإلهام البصري";
  version = "1.0.0";
  description =
    "Suggests visual references based on scene descriptions and creates automatic mood boards";
  descriptionAr =
    "اقتراح مراجع بصرية ذات صلة بناءً على وصف المشهد وإنشاء لوحات مزاجية تلقائية";
  category = "ai-analytics" as const;

  private styleDatabase: Map<string, string[]> = new Map();
  private colorPalettes: Map<string, string[]> = new Map();

  async initialize(): Promise<void> {
    this.initializeStyleDatabase();
    this.initializeColorPalettes();
    console.log(
      `[${this.name}] Initialized with ${this.styleDatabase.size} style categories`
    );
  }

  private initializeStyleDatabase(): void {
    this.styleDatabase.set("noir", [
      "High contrast lighting",
      "Deep shadows",
      "Venetian blind effects",
      "Rain-slicked streets",
      "Neon reflections",
    ]);
    this.styleDatabase.set("romantic", [
      "Soft golden hour lighting",
      "Warm color tones",
      "Intimate framing",
      "Bokeh backgrounds",
      "Natural textures",
    ]);
    this.styleDatabase.set("horror", [
      "Low-key lighting",
      "Desaturated colors",
      "Dutch angles",
      "Fog and mist",
      "Decay and rust textures",
    ]);
    this.styleDatabase.set("sci-fi", [
      "Cool blue tones",
      "Geometric shapes",
      "LED accent lighting",
      "Sleek surfaces",
      "Holographic elements",
    ]);
    this.styleDatabase.set("period", [
      "Natural light sources",
      "Rich earth tones",
      "Ornate details",
      "Textured fabrics",
      "Candlelight effects",
    ]);
    this.styleDatabase.set("arabic", [
      "Warm desert tones",
      "Geometric patterns",
      "Arabesque details",
      "Natural materials",
      "Calligraphy elements",
    ]);
  }

  private initializeColorPalettes(): void {
    this.colorPalettes.set("warm", [
      "#D4A574",
      "#C9956B",
      "#8B6914",
      "#CD853F",
      "#DEB887",
    ]);
    this.colorPalettes.set("cool", [
      "#4A90A4",
      "#2F6B7E",
      "#1A4A5E",
      "#87CEEB",
      "#5F9EA0",
    ]);
    this.colorPalettes.set("neutral", [
      "#8B8B83",
      "#696969",
      "#A9A9A9",
      "#C0C0C0",
      "#D3D3D3",
    ]);
    this.colorPalettes.set("dark", [
      "#1C1C1C",
      "#2F2F2F",
      "#3D3D3D",
      "#4A4A4A",
      "#5C5C5C",
    ]);
    this.colorPalettes.set("vibrant", [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FFEAA7",
    ]);
    this.colorPalettes.set("desert", [
      "#C19A6B",
      "#D2B48C",
      "#F5DEB3",
      "#DEB887",
      "#D2691E",
    ]);
  }

  async execute(input: PluginInput): Promise<PluginOutput> {
    switch (input.type) {
      case "analyze":
        return this.analyzeScene(input.data as unknown as AnalyzeSceneInput);
      case "generate-moodboard":
        return this.generateMoodBoard(
          input.data as unknown as AnalyzeSceneInput
        );
      case "suggest-palette":
        return this.suggestColorPalette(
          input.data as { mood: string; era?: string }
        );
      case "get-references":
        return this.getStyleReferences(input.data as { style: string });
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private async analyzeScene(data: AnalyzeSceneInput): Promise<PluginOutput> {
    if (!data.description) {
      return {
        success: false,
        error: "Scene description is required",
      };
    }

    const detectedMood = this.detectMood(data.description);
    const detectedEra = this.detectEra(data.description);
    const style = this.detectStyle(data.description, data.genre);
    const colorPalette = this.selectColorPalette(detectedMood, detectedEra);
    const styleReferences =
      this.styleDatabase.get(style) || this.styleDatabase.get("neutral") || [];

    const result: InspirationResult = {
      id: uuidv4(),
      sceneDescription: data.description,
      mood: data.mood || detectedMood,
      era: data.era || detectedEra,
      colorPalette,
      styleReferences,
      moodBoard: this.generateMoodBoardItems(detectedMood, style, colorPalette),
      suggestions: this.generateSuggestions(detectedMood, style, detectedEra),
      suggestionsAr: this.generateSuggestionsAr(
        detectedMood,
        style,
        detectedEra
      ),
    };

    return {
      success: true,
      data: result as unknown as Record<string, unknown>,
    };
  }

  private detectMood(description: string): string {
    const lowerDesc = description.toLowerCase();
    if (
      lowerDesc.includes("dark") ||
      lowerDesc.includes("mystery") ||
      lowerDesc.includes("suspense")
    )
      return "dark";
    if (
      lowerDesc.includes("romantic") ||
      lowerDesc.includes("love") ||
      lowerDesc.includes("warm")
    )
      return "romantic";
    if (
      lowerDesc.includes("horror") ||
      lowerDesc.includes("scary") ||
      lowerDesc.includes("fear")
    )
      return "horror";
    if (
      lowerDesc.includes("action") ||
      lowerDesc.includes("intense") ||
      lowerDesc.includes("dynamic")
    )
      return "intense";
    if (
      lowerDesc.includes("calm") ||
      lowerDesc.includes("peaceful") ||
      lowerDesc.includes("serene")
    )
      return "calm";
    return "neutral";
  }

  private detectEra(description: string): string {
    const lowerDesc = description.toLowerCase();
    if (
      lowerDesc.includes("future") ||
      lowerDesc.includes("sci-fi") ||
      lowerDesc.includes("2100")
    )
      return "futuristic";
    if (
      lowerDesc.includes("1920") ||
      lowerDesc.includes("1930") ||
      lowerDesc.includes("vintage")
    )
      return "1920s-1930s";
    if (
      lowerDesc.includes("1940") ||
      lowerDesc.includes("1950") ||
      lowerDesc.includes("noir")
    )
      return "1940s-1950s";
    if (
      lowerDesc.includes("medieval") ||
      lowerDesc.includes("ancient") ||
      lowerDesc.includes("historical")
    )
      return "historical";
    if (
      lowerDesc.includes("1980") ||
      lowerDesc.includes("1990") ||
      lowerDesc.includes("retro")
    )
      return "1980s-1990s";
    return "contemporary";
  }

  private detectStyle(description: string, genre?: string): string {
    const lowerDesc = description.toLowerCase();
    const lowerGenre = (genre || "").toLowerCase();

    if (lowerDesc.includes("noir") || lowerGenre.includes("noir"))
      return "noir";
    if (lowerDesc.includes("romance") || lowerGenre.includes("romance"))
      return "romantic";
    if (lowerDesc.includes("horror") || lowerGenre.includes("horror"))
      return "horror";
    if (
      lowerDesc.includes("sci-fi") ||
      lowerDesc.includes("future") ||
      lowerGenre.includes("sci-fi")
    )
      return "sci-fi";
    if (lowerDesc.includes("period") || lowerDesc.includes("historical"))
      return "period";
    if (
      lowerDesc.includes("arabic") ||
      lowerDesc.includes("middle east") ||
      lowerDesc.includes("desert")
    )
      return "arabic";
    return "neutral";
  }

  private selectColorPalette(mood: string, era: string): string[] {
    if (mood === "dark" || mood === "horror")
      return this.colorPalettes.get("dark") || [];
    if (mood === "romantic" || mood === "calm")
      return this.colorPalettes.get("warm") || [];
    if (era === "futuristic") return this.colorPalettes.get("cool") || [];
    if (era === "historical") return this.colorPalettes.get("warm") || [];
    return this.colorPalettes.get("neutral") || [];
  }

  private generateMoodBoardItems(
    mood: string,
    style: string,
    colors: string[]
  ): MoodBoardItem[] {
    const items: MoodBoardItem[] = [];

    colors.slice(0, 3).forEach((color, i) => {
      items.push({
        id: uuidv4(),
        type: "color",
        value: color,
        description: `Primary color ${i + 1} for ${mood} mood`,
        descriptionAr: `اللون الأساسي ${i + 1} للمزاج ${mood}`,
        tags: [mood, style, "color"],
      });
    });

    const styleRefs = this.styleDatabase.get(style) || [];
    styleRefs.slice(0, 2).forEach((ref) => {
      items.push({
        id: uuidv4(),
        type: "reference",
        value: ref,
        description: `Style reference: ${ref}`,
        descriptionAr: `مرجع الأسلوب: ${ref}`,
        tags: [style, "reference"],
      });
    });

    return items;
  }

  private generateSuggestions(
    mood: string,
    style: string,
    era: string
  ): string[] {
    return [
      `Consider using ${mood} lighting to enhance the atmosphere`,
      `Reference classic ${era} films for authentic visual language`,
      `Incorporate ${style} elements in set design and color grading`,
      `Pay attention to texture and material authenticity for the era`,
      `Use practical lighting sources when possible for realism`,
    ];
  }

  private generateSuggestionsAr(
    mood: string,
    style: string,
    era: string
  ): string[] {
    return [
      `فكر في استخدام إضاءة ${mood} لتعزيز الأجواء`,
      `ارجع إلى أفلام ${era} الكلاسيكية للغة بصرية أصيلة`,
      `ادمج عناصر ${style} في تصميم المشهد وتدرج الألوان`,
      `انتبه لأصالة الملمس والمواد للحقبة الزمنية`,
      `استخدم مصادر الإضاءة العملية قدر الإمكان للواقعية`,
    ];
  }

  private async generateMoodBoard(
    data: AnalyzeSceneInput
  ): Promise<PluginOutput> {
    const analysisResult = await this.analyzeScene(data);
    if (!analysisResult.success) return analysisResult;

    const analysis = analysisResult.data as unknown as InspirationResult;

    return {
      success: true,
      data: {
        id: uuidv4(),
        title: `Mood Board for: ${data.description.substring(0, 50)}...`,
        titleAr: `لوحة المزاج لـ: ${data.description.substring(0, 50)}...`,
        items: analysis.moodBoard,
        colorPalette: analysis.colorPalette,
        styleGuide: analysis.styleReferences,
        createdAt: new Date().toISOString(),
      },
    };
  }

  private async suggestColorPalette(data: {
    mood: string;
    era?: string;
  }): Promise<PluginOutput> {
    const palette = this.selectColorPalette(
      data.mood,
      data.era || "contemporary"
    );

    return {
      success: true,
      data: {
        mood: data.mood,
        era: data.era || "contemporary",
        palette,
        usage: {
          primary: palette[0],
          secondary: palette[1],
          accent: palette[2],
          background: palette[3],
          highlight: palette[4],
        },
      },
    };
  }

  private async getStyleReferences(data: {
    style: string;
  }): Promise<PluginOutput> {
    const references = this.styleDatabase.get(data.style.toLowerCase());

    if (!references) {
      return {
        success: false,
        error: `Style "${data.style}" not found. Available styles: ${Array.from(this.styleDatabase.keys()).join(", ")}`,
      };
    }

    return {
      success: true,
      data: {
        style: data.style,
        references,
        count: references.length,
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shut down`);
  }
}

export const creativeInspiration = new CreativeInspirationAssistant();

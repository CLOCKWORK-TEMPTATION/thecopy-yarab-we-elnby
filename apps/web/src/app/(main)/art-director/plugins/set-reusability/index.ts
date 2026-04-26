import { v4 as uuidv4 } from "uuid";

import { Plugin, PluginInput, PluginOutput } from "../../types";

interface SetPiece {
  id: string;
  name: string;
  nameAr: string;
  category:
    | "wall"
    | "floor"
    | "furniture"
    | "prop"
    | "backdrop"
    | "structure"
    | "lighting-rig";
  dimensions: { width: number; height: number; depth: number };
  materials: string[];
  condition: "excellent" | "good" | "fair" | "poor";
  currentLocation: string;
  originalProduction: string;
  photos: string[];
  estimatedValue: number;
  reusabilityScore: number;
  tags: string[];
  modifications: Modification[];
  createdAt: Date;
  lastUsed: Date;
}

interface Modification {
  id: string;
  description: string;
  descriptionAr: string;
  estimatedCost: number;
  estimatedTime: number;
  difficulty: "easy" | "medium" | "hard";
  resultingStyle: string;
}

interface ReusabilitySuggestion {
  setPiece: SetPiece;
  targetProduction: string;
  modifications: Modification[];
  totalCost: number;
  totalTime: number;
  savingsComparedToNew: number;
  compatibilityScore: number;
}

interface AnalyzeSetInput {
  name: string;
  category: string;
  dimensions: { width: number; height: number; depth: number };
  materials: string[];
  style: string;
  currentCondition: string;
}

interface FindReusableInput {
  targetStyle: string;
  requiredCategory?: string;
  maxBudget?: number;
  minCondition?: string;
}

export class SetReusabilityOptimizer implements Plugin {
  id = "set-reusability";
  name = "Set Reusability Optimizer";
  nameAr = "محسّن إعادة استخدام الديكورات";
  version = "1.0.0";
  description =
    "Analyzes set pieces and suggests ways to reuse them across productions";
  descriptionAr =
    "تحليل الديكورات واقتراح طرق لإعادة استخدامها في إنتاجات مختلفة";
  category = "sustainability" as const;

  private inventory = new Map<string, SetPiece>();
  private styleTransformations = new Map<string, Modification[]>();

  async initialize(): Promise<void> {
    this.initializeTransformations();
    console.log(
      `[${this.name}] Initialized with ${this.styleTransformations.size} transformation templates`
    );
  }

  private initializeTransformations(): void {
    this.styleTransformations.set("modern-to-period", [
      {
        id: "add-molding",
        description: "Add decorative molding and trim",
        descriptionAr: "إضافة زخارف وحواف ديكورية",
        estimatedCost: 500,
        estimatedTime: 8,
        difficulty: "medium",
        resultingStyle: "period",
      },
      {
        id: "age-surface",
        description: "Apply aging and patina effects",
        descriptionAr: "تطبيق تأثيرات التقادم والصدأ",
        estimatedCost: 300,
        estimatedTime: 4,
        difficulty: "easy",
        resultingStyle: "period",
      },
    ]);

    this.styleTransformations.set("period-to-modern", [
      {
        id: "smooth-surfaces",
        description: "Smooth surfaces and remove ornate details",
        descriptionAr: "تنعيم الأسطح وإزالة التفاصيل المزخرفة",
        estimatedCost: 400,
        estimatedTime: 6,
        difficulty: "medium",
        resultingStyle: "modern",
      },
      {
        id: "paint-neutral",
        description: "Apply neutral modern color palette",
        descriptionAr: "تطبيق لوحة ألوان عصرية محايدة",
        estimatedCost: 200,
        estimatedTime: 3,
        difficulty: "easy",
        resultingStyle: "modern",
      },
    ]);

    this.styleTransformations.set("neutral-to-scifi", [
      {
        id: "add-panels",
        description: "Add geometric panels and LED strips",
        descriptionAr: "إضافة ألواح هندسية وشرائط LED",
        estimatedCost: 800,
        estimatedTime: 12,
        difficulty: "hard",
        resultingStyle: "sci-fi",
      },
      {
        id: "metallic-finish",
        description: "Apply metallic and reflective finishes",
        descriptionAr: "تطبيق تشطيبات معدنية وعاكسة",
        estimatedCost: 600,
        estimatedTime: 8,
        difficulty: "medium",
        resultingStyle: "sci-fi",
      },
    ]);

    this.styleTransformations.set("any-to-arabic", [
      {
        id: "add-mashrabiya",
        description: "Add mashrabiya patterns and arabesques",
        descriptionAr: "إضافة أنماط المشربية والأرابيسك",
        estimatedCost: 700,
        estimatedTime: 10,
        difficulty: "hard",
        resultingStyle: "arabic",
      },
      {
        id: "warm-tones",
        description: "Apply warm desert color palette",
        descriptionAr: "تطبيق ألوان صحراوية دافئة",
        estimatedCost: 250,
        estimatedTime: 4,
        difficulty: "easy",
        resultingStyle: "arabic",
      },
    ]);
  }

  async execute(input: PluginInput): Promise<PluginOutput> {
    switch (input.type) {
      case "add-piece":
        return this.addSetPiece(input.data);
      case "analyze":
        return this.analyzeReusability(
          input.data as unknown as AnalyzeSetInput
        );
      case "find-reusable":
        return this.findReusablePieces(
          input.data as unknown as FindReusableInput
        );
      case "suggest-modifications":
        return this.suggestModifications(
          input.data as { pieceId: string; targetStyle: string }
        );
      case "calculate-savings":
        return this.calculateSavings(
          input.data as {
            pieceId: string;
            modifications: string[];
            newBuildCost: number;
          }
        );
      case "inventory":
        return this.getInventory(
          input.data
        );
      case "sustainability-report":
        return this.generateSustainabilityReport(
          input.data as { productionId: string }
        );
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private async addSetPiece(data: Partial<SetPiece>): Promise<PluginOutput> {
    if (!data.name || !data.category) {
      return {
        success: false,
        error: "Set piece name and category are required",
      };
    }

    const piece: SetPiece = {
      id: uuidv4(),
      name: data.name,
      nameAr: data.nameAr ?? data.name,
      category: data.category,
      dimensions: data.dimensions ?? { width: 0, height: 0, depth: 0 },
      materials: data.materials ?? [],
      condition: (data.condition!) || "good",
      currentLocation: data.currentLocation ?? "",
      originalProduction: data.originalProduction ?? "",
      photos: data.photos ?? [],
      estimatedValue: data.estimatedValue ?? 0,
      reusabilityScore: this.calculateReusabilityScore(data),
      tags: data.tags ?? [],
      modifications: data.modifications ?? [],
      createdAt: new Date(),
      lastUsed: new Date(),
    };

    this.inventory.set(piece.id, piece);

    return {
      success: true,
      data: {
        message: "Set piece added to inventory",
        messageAr: "تمت إضافة قطعة الديكور للمخزون",
        piece: piece as unknown as Record<string, unknown>,
      },
    };
  }

  private calculateReusabilityScore(data: Partial<SetPiece>): number {
    let score = 50;

    const conditionScores: Record<string, number> = {
      excellent: 25,
      good: 15,
      fair: 5,
      poor: -10,
    };
    score += conditionScores[data.condition ?? "good"] ?? 0;

    const neutralMaterials = ["wood", "mdf", "plywood", "fabric"];
    const materialScore =
      (data.materials ?? []).filter((m) =>
        neutralMaterials.some((nm) => m.toLowerCase().includes(nm))
      ).length * 5;
    score += Math.min(materialScore, 15);

    const standardCategories = ["wall", "floor", "backdrop"];
    if (standardCategories.includes(data.category ?? "")) {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private async analyzeReusability(
    data: AnalyzeSetInput
  ): Promise<PluginOutput> {
    const analysis = {
      name: data.name,
      category: data.category,
      reusabilityScore: this.calculateReusabilityScore(
        data as Partial<SetPiece>
      ),
      potentialStyles: [] as string[],
      recommendations: [] as string[],
      recommendationsAr: [] as string[],
      estimatedLifespan: 0,
      environmentalImpact: {
        carbonSavedIfReused: 0,
        wasteDivertedKg: 0,
      },
    };

    analysis.potentialStyles = this.getPotentialStyles(data.style);

    if (
      data.currentCondition === "excellent" ||
      data.currentCondition === "good"
    ) {
      analysis.recommendations.push(
        "This piece has high reuse potential with minimal modifications"
      );
      analysis.recommendationsAr.push(
        "هذه القطعة لديها إمكانية إعادة استخدام عالية مع تعديلات طفيفة"
      );
    }

    const volume =
      data.dimensions.width * data.dimensions.height * data.dimensions.depth;
    analysis.estimatedLifespan =
      data.currentCondition === "excellent"
        ? 5
        : data.currentCondition === "good"
          ? 3
          : 1;
    analysis.environmentalImpact.carbonSavedIfReused = volume * 0.5;
    analysis.environmentalImpact.wasteDivertedKg = volume * 0.3;

    return {
      success: true,
      data: analysis as unknown as Record<string, unknown>,
    };
  }

  private getPotentialStyles(currentStyle: string): string[] {
    const allStyles = [
      "modern",
      "period",
      "sci-fi",
      "arabic",
      "neutral",
      "industrial",
    ];
    return allStyles.filter((s) => s !== currentStyle);
  }

  private async findReusablePieces(
    data: FindReusableInput
  ): Promise<PluginOutput> {
    let pieces = Array.from(this.inventory.values());

    if (data.requiredCategory) {
      pieces = pieces.filter((p) => p.category === data.requiredCategory);
    }

    if (data.minCondition) {
      const conditionOrder = ["poor", "fair", "good", "excellent"];
      const minIndex = conditionOrder.indexOf(data.minCondition);
      pieces = pieces.filter(
        (p) => conditionOrder.indexOf(p.condition) >= minIndex
      );
    }

    const suggestions: ReusabilitySuggestion[] = [];

    for (const piece of pieces) {
      const transformKey = this.findTransformationKey(data.targetStyle);
      const modifications = transformKey
        ? this.styleTransformations.get(transformKey) ?? []
        : [];

      const totalCost = modifications.reduce(
        (sum, m) => sum + m.estimatedCost,
        0
      );

      if (data.maxBudget && totalCost > data.maxBudget) continue;

      const totalTime = modifications.reduce(
        (sum, m) => sum + m.estimatedTime,
        0
      );
      const newBuildCost = piece.estimatedValue * 2;

      suggestions.push({
        setPiece: piece,
        targetProduction: data.targetStyle,
        modifications,
        totalCost,
        totalTime,
        savingsComparedToNew: newBuildCost - totalCost,
        compatibilityScore: piece.reusabilityScore,
      });
    }

    suggestions.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    return {
      success: true,
      data: {
        count: suggestions.length,
        suggestions: suggestions.slice(0, 10) as unknown as Record<
          string,
          unknown
        >[],
      },
    };
  }

  private findTransformationKey(targetStyle: string): string | undefined {
    for (const key of this.styleTransformations.keys()) {
      if (key.endsWith(`-to-${targetStyle}`) || key.startsWith("any-to-")) {
        return key;
      }
    }
    return undefined;
  }

  private async suggestModifications(data: {
    pieceId: string;
    targetStyle: string;
  }): Promise<PluginOutput> {
    const piece = this.inventory.get(data.pieceId);

    if (!piece) {
      return {
        success: false,
        error: `Set piece with ID "${data.pieceId}" not found`,
      };
    }

    const transformKey = this.findTransformationKey(data.targetStyle);
    const modifications = transformKey
      ? this.styleTransformations.get(transformKey) ?? []
      : [];

    return {
      success: true,
      data: {
        piece: { id: piece.id, name: piece.name },
        targetStyle: data.targetStyle,
        modifications: modifications as unknown as Record<string, unknown>[],
        totalCost: modifications.reduce((sum, m) => sum + m.estimatedCost, 0),
        totalTime: modifications.reduce((sum, m) => sum + m.estimatedTime, 0),
      },
    };
  }

  private async calculateSavings(data: {
    pieceId: string;
    modifications: string[];
    newBuildCost: number;
  }): Promise<PluginOutput> {
    const piece = this.inventory.get(data.pieceId);

    if (!piece) {
      return {
        success: false,
        error: `Set piece with ID "${data.pieceId}" not found`,
      };
    }

    let modificationCost = 0;
    for (const modId of data.modifications) {
      for (const mods of this.styleTransformations.values()) {
        const mod = mods.find((m) => m.id === modId);
        if (mod) modificationCost += mod.estimatedCost;
      }
    }

    const savings = data.newBuildCost - modificationCost;
    const savingsPercentage = (savings / data.newBuildCost) * 100;

    return {
      success: true,
      data: {
        pieceId: piece.id,
        pieceName: piece.name,
        modificationCost,
        newBuildCost: data.newBuildCost,
        savings,
        savingsPercentage: Math.round(savingsPercentage),
        recommendation:
          savingsPercentage > 50
            ? "Highly recommended to reuse"
            : savingsPercentage > 25
              ? "Reuse is cost-effective"
              : "Consider building new",
      },
    };
  }

  private async getInventory(data: {
    category?: string;
    minCondition?: string;
  }): Promise<PluginOutput> {
    let pieces = Array.from(this.inventory.values());

    if (data.category) {
      pieces = pieces.filter((p) => p.category === data.category);
    }

    if (data.minCondition) {
      const conditionOrder = ["poor", "fair", "good", "excellent"];
      const minIndex = conditionOrder.indexOf(data.minCondition);
      pieces = pieces.filter(
        (p) => conditionOrder.indexOf(p.condition) >= minIndex
      );
    }

    return {
      success: true,
      data: {
        count: pieces.length,
        pieces: pieces as unknown as Record<string, unknown>[],
      },
    };
  }

  private async generateSustainabilityReport(data: {
    productionId: string;
  }): Promise<PluginOutput> {
    const pieces = Array.from(this.inventory.values());

    const report = {
      productionId: data.productionId,
      generatedAt: new Date().toISOString(),
      totalPiecesInInventory: pieces.length,
      byCondition: {
        excellent: pieces.filter((p) => p.condition === "excellent").length,
        good: pieces.filter((p) => p.condition === "good").length,
        fair: pieces.filter((p) => p.condition === "fair").length,
        poor: pieces.filter((p) => p.condition === "poor").length,
      },
      reusabilityMetrics: {
        averageReusabilityScore:
          pieces.length > 0
            ? pieces.reduce((sum, p) => sum + p.reusabilityScore, 0) /
              pieces.length
            : 0,
        highlyReusable: pieces.filter((p) => p.reusabilityScore >= 70).length,
        moderatelyReusable: pieces.filter(
          (p) => p.reusabilityScore >= 40 && p.reusabilityScore < 70
        ).length,
        lowReusability: pieces.filter((p) => p.reusabilityScore < 40).length,
      },
      estimatedEnvironmentalImpact: {
        potentialCarbonSavingsKg: pieces.reduce((sum, p) => {
          const volume =
            p.dimensions.width * p.dimensions.height * p.dimensions.depth;
          return sum + volume * 0.5 * (p.reusabilityScore / 100);
        }, 0),
        potentialWasteDivertedKg: pieces.reduce((sum, p) => {
          const volume =
            p.dimensions.width * p.dimensions.height * p.dimensions.depth;
          return sum + volume * 0.3 * (p.reusabilityScore / 100);
        }, 0),
      },
      recommendations: [
        "Prioritize reusing excellent and good condition pieces",
        "Consider restoration for fair condition pieces with high value",
        "Recycle materials from poor condition pieces",
      ],
      recommendationsAr: [
        "أعط الأولوية لإعادة استخدام القطع في حالة ممتازة وجيدة",
        "فكر في ترميم القطع في حالة متوسطة ذات القيمة العالية",
        "أعد تدوير المواد من القطع في حالة سيئة",
      ],
    };

    return {
      success: true,
      data: report as unknown as Record<string, unknown>,
    };
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shut down`);
  }
}

export const setReusability = new SetReusabilityOptimizer();

/* eslint-disable */
// CineArchitect AI - AI Visual Consistency Analyzer Plugin
// محلل الاتساق البصري الذكي

import {
  Plugin,
  PluginInput,
  PluginOutput,
  VisualAnalysisResult,
  VisualIssue,
} from "../../types";

interface AnalyzeInput {
  scenes: Array<{
    id: string;
    name: string;
    colorPalette?: {
      primary: string[];
      secondary: string[];
    };
    lighting?: {
      type: string;
      colorTemperature: number;
      intensity: number;
    };
    costumes?: Array<{
      character: string;
      items: string[];
      colors: string[];
    }>;
    props?: Array<{
      name: string;
      position: string;
    }>;
  }>;
  referenceScene?: string;
}

export class VisualConsistencyAnalyzer implements Plugin {
  id = "visual-analyzer";
  name = "AI Visual Consistency Analyzer";
  nameAr = "محلل الاتساق البصري الذكي";
  version = "1.0.0";
  description =
    "Detects color inconsistencies and errors in costumes and sets across scenes";
  descriptionAr = "كشف التناقضات اللونية والأخطاء في الأزياء والديكورات";
  category = "ai-analytics" as const;

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initialized`);
  }

  async execute(input: PluginInput): Promise<PluginOutput> {
    switch (input.type) {
      case "analyze":
        return this.analyzeVisualConsistency(
          input.data as unknown as AnalyzeInput,
        );
      case "compare":
        return this.compareScenes(input.data as any);
      default:
        return {
          success: false,
          error: `Unknown operation type: ${input.type}`,
        };
    }
  }

  private async analyzeVisualConsistency(
    data: AnalyzeInput,
  ): Promise<PluginOutput> {
    const issues: VisualIssue[] = [];
    const suggestions: string[] = [];

    if (!data.scenes || data.scenes.length === 0) {
      return {
        success: false,
        error: "No scenes provided for analysis",
      };
    }

    // Analyze color consistency across scenes
    const colorIssues = this.analyzeColorConsistency(data.scenes);
    issues.push(...colorIssues);

    // Analyze lighting consistency
    const lightingIssues = this.analyzeLightingConsistency(data.scenes);
    issues.push(...lightingIssues);

    // Analyze costume continuity
    const costumeIssues = this.analyzeCostumeConsistency(data.scenes);
    issues.push(...costumeIssues);

    // Generate suggestions
    if (colorIssues.length > 0) {
      suggestions.push(
        "Consider creating a master color reference sheet for all scenes",
      );
      suggestions.push("قم بإنشاء مرجع رئيسي للألوان لجميع المشاهد");
    }

    if (lightingIssues.length > 0) {
      suggestions.push(
        "Use consistent color temperature across matching scenes",
      );
      suggestions.push("استخدم درجة حرارة لونية متسقة عبر المشاهد المتطابقة");
    }

    const score = this.calculateConsistencyScore(issues, data.scenes.length);

    const result: VisualAnalysisResult = {
      consistent: issues.filter((i) => i.severity === "high").length === 0,
      issues,
      suggestions,
      score,
    };

    return {
      success: true,
      data: result as unknown as Record<string, unknown>,
    };
  }

  private analyzeColorConsistency(
    scenes: AnalyzeInput["scenes"],
  ): VisualIssue[] {
    const issues: VisualIssue[] = [];

    for (let i = 0; i < scenes.length - 1; i++) {
      const scene1 = scenes[i];
      const scene2 = scenes[i + 1];
      if (!scene1 || !scene2) {
        continue;
      }

      if (scene1.colorPalette && scene2.colorPalette) {
        const primaryDiff = this.compareColorArrays(
          scene1.colorPalette.primary,
          scene2.colorPalette.primary,
        );

        if (primaryDiff > 0.3) {
          issues.push({
            type: "color",
            severity: primaryDiff > 0.6 ? "high" : "medium",
            description: `Significant color palette difference between "${scene1.name}" and "${scene2.name}"`,
            descriptionAr: `اختلاف كبير في لوحة الألوان بين "${scene1.name}" و "${scene2.name}"`,
            location: `Scenes ${scene1.id} - ${scene2.id}`,
            suggestion: "Review color grading to maintain visual continuity",
          });
        }
      }
    }

    return issues;
  }

  private analyzeLightingConsistency(
    scenes: AnalyzeInput["scenes"],
  ): VisualIssue[] {
    const issues: VisualIssue[] = [];

    for (let i = 0; i < scenes.length - 1; i++) {
      const scene1 = scenes[i];
      const scene2 = scenes[i + 1];
      if (!scene1 || !scene2) {
        continue;
      }

      if (scene1.lighting && scene2.lighting) {
        const tempDiff = Math.abs(
          scene1.lighting.colorTemperature - scene2.lighting.colorTemperature,
        );

        if (tempDiff > 1000) {
          issues.push({
            type: "lighting",
            severity: tempDiff > 2000 ? "high" : "medium",
            description: `Color temperature mismatch: ${scene1.lighting.colorTemperature}K vs ${scene2.lighting.colorTemperature}K`,
            descriptionAr: `عدم تطابق درجة حرارة اللون: ${scene1.lighting.colorTemperature}K مقابل ${scene2.lighting.colorTemperature}K`,
            location: `Scenes ${scene1.id} - ${scene2.id}`,
            suggestion: `Adjust lighting to maintain consistency (target: ${Math.round((scene1.lighting.colorTemperature + scene2.lighting.colorTemperature) / 2)}K)`,
          });
        }
      }
    }

    return issues;
  }

  private analyzeCostumeConsistency(
    scenes: AnalyzeInput["scenes"],
  ): VisualIssue[] {
    const issues: VisualIssue[] = [];
    const characterCostumes: Map<string, Set<string>> = new Map();

    for (const scene of scenes) {
      if (scene.costumes) {
        for (const costume of scene.costumes) {
          const existing = characterCostumes.get(costume.character);
          const costumeKey = costume.items.sort().join(",");

          if (existing && !existing.has(costumeKey)) {
            // Check if this is intentional scene change
            issues.push({
              type: "costume",
              severity: "medium",
              description: `Costume change detected for "${costume.character}" - verify if intentional`,
              descriptionAr: `تم اكتشاف تغيير في الملابس لـ "${costume.character}" - تحقق إذا كان مقصوداً`,
              location: `Scene ${scene.id}`,
              suggestion: "Document costume changes in continuity notes",
            });
          }

          if (!existing) {
            characterCostumes.set(costume.character, new Set([costumeKey]));
          } else {
            existing.add(costumeKey);
          }
        }
      }
    }

    return issues;
  }

  private compareColorArrays(colors1: string[], colors2: string[]): number {
    if (!colors1.length || !colors2.length) return 0;

    let totalDiff = 0;
    const maxComparisons = Math.min(colors1.length, colors2.length);

    for (let i = 0; i < maxComparisons; i++) {
      const left = colors1[i];
      const right = colors2[i];
      if (!left || !right) {
        continue;
      }

      totalDiff += this.colorDifference(left, right);
    }

    return totalDiff / maxComparisons;
  }

  private colorDifference(color1: string, color2: string): number {
    // Simple hex color difference calculation
    const rgb1 = this.hexToRgb(color1);
    const rgb2 = this.hexToRgb(color2);

    if (!rgb1 || !rgb2) return 0.5;

    const diff = Math.sqrt(
      Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2),
    );

    return diff / 441.67; // Max possible difference (sqrt(255^2 * 3))
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1] ?? "00", 16),
          g: parseInt(result[2] ?? "00", 16),
          b: parseInt(result[3] ?? "00", 16),
        }
      : null;
  }

  private calculateConsistencyScore(
    issues: VisualIssue[],
    _sceneCount: number,
  ): number {
    const baseScore = 100;
    let deductions = 0;

    for (const issue of issues) {
      switch (issue.severity) {
        case "high":
          deductions += 15;
          break;
        case "medium":
          deductions += 8;
          break;
        case "low":
          deductions += 3;
          break;
      }
    }

    return Math.max(0, Math.min(100, baseScore - deductions));
  }

  private async compareScenes(data: {
    scene1: any;
    scene2: any;
  }): Promise<PluginOutput> {
    return this.analyzeVisualConsistency({
      scenes: [data.scene1, data.scene2],
    });
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shut down`);
  }
}

export const visualAnalyzer = new VisualConsistencyAnalyzer();

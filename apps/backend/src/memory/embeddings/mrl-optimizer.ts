/**
 * MRL (Matryoshka Representation Learning) Optimizer
 * محسن الأبعاد المتداخلة
 */

import type { DimensionSize } from "../types";

export interface MRLOptimizationConfig {
  highPrecisionTasks: DimensionSize;
  balancedTasks: DimensionSize;
  storageOptimized: DimensionSize;
}

export class MRLOptimizer {
  private config: MRLOptimizationConfig = {
    highPrecisionTasks: 3072,
    balancedTasks: 1536,
    storageOptimized: 768,
  };

  /**
   * تحديد البُعد الأمثل بناءً على نوع المحتوى والاستخدام
   */
  getOptimalDimension(
    contentType: "code" | "documentation" | "decision" | "architecture",
    priority: "precision" | "balanced" | "storage" = "balanced",
  ): DimensionSize {
    if (priority === "precision") return this.config.highPrecisionTasks;
    if (priority === "storage") return this.config.storageOptimized;

    switch (contentType) {
      case "code":
        return 3072;
      case "documentation":
        return 1536;
      case "decision":
        return 1536;
      case "architecture":
        return 3072;
      default:
        return 1536;
    }
  }

  /**
   * تقليص تضمين كامل البعد إلى بُعد أصغر (MRL slicing)
   */
  truncateEmbedding(
    embedding: number[],
    targetDimension: DimensionSize,
  ): number[] {
    if (embedding.length <= targetDimension) {
      return embedding;
    }
    return embedding.slice(0, targetDimension);
  }

  /**
   * حساب توفير التخزين عند استخدام MRL
   */
  calculateStorageSavings(
    originalDimension: 3072,
    targetDimension: DimensionSize,
    documentCount: number,
  ): { savedBytes: number; percentage: number } {
    const bytesPerFloat = 4;
    const originalSize = originalDimension * bytesPerFloat * documentCount;
    const targetSize = targetDimension * bytesPerFloat * documentCount;
    const savedBytes = originalSize - targetSize;

    return {
      savedBytes,
      percentage: (savedBytes / originalSize) * 100,
    };
  }

  /**
   * اقتراح البُعد بناءً على سياق الاستخدام
   */
  suggestDimension(context: {
    expectedDocumentCount: number;
    queryFrequency: "high" | "medium" | "low";
    precisionRequirement: "critical" | "standard" | "flexible";
    storageBudgetMB?: number;
  }): DimensionSize {
    const {
      expectedDocumentCount,
      queryFrequency,
      precisionRequirement,
      storageBudgetMB,
    } = context;

    // Calculate storage for each dimension
    const storage3072 = this.calculateStorage(3072, expectedDocumentCount);
    const storage1536 = this.calculateStorage(1536, expectedDocumentCount);

    // If storage budget is tight
    if (storageBudgetMB && storage3072 > storageBudgetMB) {
      if (
        storage1536 <= storageBudgetMB &&
        precisionRequirement !== "critical"
      ) {
        return 1536;
      }
      return 768;
    }

    // Based on precision requirement
    if (precisionRequirement === "critical") {
      return 3072;
    }

    if (precisionRequirement === "flexible" || queryFrequency === "low") {
      return 768;
    }

    return 1536;
  }

  private calculateStorage(dimension: number, documentCount: number): number {
    const bytesPerFloat = 4;
    const metadataOverhead = 200;
    const totalBytes =
      (dimension * bytesPerFloat + metadataOverhead) * documentCount;
    return totalBytes / (1024 * 1024);
  }
}

export const mrlOptimizer = new MRLOptimizer();

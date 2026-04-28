import type { ClassifiedDraft, ElementType } from "./classification-types";
import type { BlockAnalysis } from "./context-memory-types";

export function analyzeContextMemoryBlock(
  runtimeRecords: ClassifiedDraft[],
  startIdx: number,
  endIdx: number
): BlockAnalysis {
  const safeStart = Math.max(0, startIdx);
  const safeEnd = Math.min(runtimeRecords.length - 1, endIdx);
  const slice = runtimeRecords.slice(safeStart, safeEnd + 1);

  const typeDistribution: Record<string, number> = {};
  let linesEndingWithColon = 0;
  let actionWithoutStrongSignal = 0;
  let hasConsecutiveSameType = false;

  for (let i = 0; i < slice.length; i++) {
    const entry = slice[i];
    if (!entry) continue;
    typeDistribution[entry.type] = (typeDistribution[entry.type] ?? 0) + 1;

    if (/[:：]\s*$/.test(entry.text.trim())) {
      linesEndingWithColon++;
    }

    if (entry.type === "action" && !/^[-–—]/.test(entry.text.trim())) {
      actionWithoutStrongSignal++;
    }

    const previous = i > 0 ? slice[i - 1] : undefined;
    if (previous?.type === entry.type) {
      hasConsecutiveSameType = true;
    }
  }

  return {
    totalLines: slice.length,
    linesEndingWithColon,
    actionWithoutStrongSignal,
    typeDistribution,
    hasConsecutiveSameType,
    dominantType: resolveDominantType(typeDistribution),
  };
}

function resolveDominantType(typeDistribution: Record<string, number>) {
  let dominantType: ElementType | null = null;
  let maxCount = 0;
  for (const [typeKey, count] of Object.entries(typeDistribution)) {
    if (count > maxCount) {
      maxCount = count;
      dominantType = typeKey as ElementType;
    }
  }
  return dominantType;
}

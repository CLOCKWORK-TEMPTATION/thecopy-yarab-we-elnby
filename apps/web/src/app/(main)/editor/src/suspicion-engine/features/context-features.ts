import type { ClassifiedDraft } from "@editor/extensions/classification-types";
import type {
  ContextFeatures,
  ElementType,
} from "@editor/suspicion-engine/types";

function resolvePreviousType(
  lineIndex: number,
  neighbors: readonly ClassifiedDraft[]
): ElementType | null {
  if (lineIndex > 0 && neighbors.length > 0) {
    return neighbors.find((_, i) => i === 0)?.type ?? null;
  }
  return null;
}

function resolveNextType(
  lineIndex: number,
  totalLines: number,
  neighbors: readonly ClassifiedDraft[]
): ElementType | null {
  if (lineIndex < totalLines - 1 && neighbors.length > 1) {
    return neighbors.find((_, i) => i === neighbors.length - 1)?.type ?? null;
  }
  return null;
}

function computeDialogueBlockDepth(
  neighbors: readonly ClassifiedDraft[]
): number {
  let depth = 0;
  for (const n of neighbors) {
    if (
      n.type === "dialogue" ||
      n.type === "character" ||
      n.type === "parenthetical"
    ) {
      depth++;
    } else {
      break;
    }
  }
  return depth;
}

function computeDistanceFromLastCharacter(
  neighbors: readonly ClassifiedDraft[]
): number {
  for (let i = neighbors.length - 1; i >= 0; i--) {
    const n = neighbors[i];
    if (!n) continue;
    if (n.type === "character") {
      return neighbors.length - 1 - i;
    }
  }
  return -1;
}

function computeDistanceFromLastSceneHeader(
  neighbors: readonly ClassifiedDraft[]
): number {
  for (let i = neighbors.length - 1; i >= 0; i--) {
    const n = neighbors[i];
    if (!n) continue;
    const t = n.type;
    if (
      t === "scene_header_1" ||
      t === "scene_header_2" ||
      t === "scene_header_3"
    ) {
      return neighbors.length - 1 - i;
    }
  }
  return -1;
}

export function extractContextFeatures(
  lineIndex: number,
  neighbors: readonly ClassifiedDraft[],
  totalLines: number
): ContextFeatures {
  return {
    previousType: resolvePreviousType(lineIndex, neighbors),
    nextType: resolveNextType(lineIndex, totalLines, neighbors),
    dialogueBlockDepth: computeDialogueBlockDepth(neighbors),
    distanceFromLastCharacter: computeDistanceFromLastCharacter(neighbors),
    distanceFromLastSceneHeader: computeDistanceFromLastSceneHeader(neighbors),
  };
}

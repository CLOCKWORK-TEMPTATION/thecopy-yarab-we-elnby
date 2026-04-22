import type { ClassifiedDraft } from "@editor/extensions/classification-types";
import type {
  ContextFeatures,
  ElementType,
} from "@editor/suspicion-engine/types";

export function extractContextFeatures(
  lineIndex: number,
  neighbors: readonly ClassifiedDraft[],
  totalLines: number
): ContextFeatures {
  const previousType: ElementType | null =
    lineIndex > 0 && neighbors.length > 0
      ? (neighbors.find((_, i) => i === 0)?.type ?? null)
      : null;
  const nextType: ElementType | null =
    lineIndex < totalLines - 1 && neighbors.length > 1
      ? (neighbors.find((_, i) => i === neighbors.length - 1)?.type ?? null)
      : null;

  let dialogueBlockDepth = 0;
  for (const n of neighbors) {
    if (
      n.type === "dialogue" ||
      n.type === "character" ||
      n.type === "parenthetical"
    ) {
      dialogueBlockDepth++;
    } else {
      break;
    }
  }

  let distanceFromLastCharacter = -1;
  for (let i = neighbors.length - 1; i >= 0; i--) {
    const n = neighbors[i];
    if (!n) continue;
    if (n.type === "character") {
      distanceFromLastCharacter = neighbors.length - 1 - i;
      break;
    }
  }

  let distanceFromLastSceneHeader = -1;
  for (let i = neighbors.length - 1; i >= 0; i--) {
    const n = neighbors[i];
    if (!n) continue;
    const t = n.type;
    if (
      t === "scene_header_1" ||
      t === "scene_header_2" ||
      t === "scene_header_3"
    ) {
      distanceFromLastSceneHeader = neighbors.length - 1 - i;
      break;
    }
  }

  return {
    previousType,
    nextType,
    dialogueBlockDepth,
    distanceFromLastCharacter,
    distanceFromLastSceneHeader,
  };
}

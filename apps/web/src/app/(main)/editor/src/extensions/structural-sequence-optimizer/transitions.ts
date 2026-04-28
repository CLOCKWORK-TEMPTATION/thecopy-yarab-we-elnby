import { NUM_TYPES, TYPE_INDEX } from "./model";

import type { ElementType } from "../classification-types";

const DEFAULT_PENALTY = -10.0;

const buildTransitionMatrix = (): Float64Array => {
  const matrix = new Float64Array(NUM_TYPES * NUM_TYPES).fill(DEFAULT_PENALTY);

  const set = (from: ElementType, to: ElementType, score: number): void => {
    const fromIndex = TYPE_INDEX.get(from)!;
    const toIndex = TYPE_INDEX.get(to)!;
    matrix[fromIndex * NUM_TYPES + toIndex] = score;
  };

  set("basmala", "scene_header_1", 2.0);
  set("basmala", "action", 1.0);
  set("basmala", "character", 0.5);

  set("scene_header_1", "scene_header_2", 2.5);
  set("scene_header_1", "scene_header_3", 1.0);
  set("scene_header_1", "action", 0.5);
  set("scene_header_1", "scene_header_1", -4.0);

  set("scene_header_2", "scene_header_3", 2.0);
  set("scene_header_2", "action", 2.0);
  set("scene_header_2", "character", 1.5);
  set("scene_header_2", "transition", 0.0);
  set("scene_header_2", "scene_header_1", -2.0);

  set("scene_header_3", "action", 2.0);
  set("scene_header_3", "character", 1.5);

  set("action", "action", 1.0);
  set("action", "character", 1.5);
  set("action", "transition", 0.5);
  set("action", "scene_header_1", 0.5);
  set("action", "dialogue", -2.0);
  set("action", "parenthetical", -3.0);

  set("character", "dialogue", 2.5);
  set("character", "parenthetical", 1.5);
  set("character", "character", -8.0);
  set("character", "action", -5.0);
  set("character", "transition", -7.0);

  set("dialogue", "dialogue", 1.0);
  set("dialogue", "character", 1.5);
  set("dialogue", "action", 1.0);
  set("dialogue", "transition", 0.5);
  set("dialogue", "parenthetical", 0.5);
  set("dialogue", "scene_header_1", 0.0);

  set("parenthetical", "dialogue", 2.5);
  set("parenthetical", "parenthetical", -4.0);
  set("parenthetical", "character", -5.0);
  set("parenthetical", "action", -4.0);

  set("transition", "scene_header_1", 2.0);
  set("transition", "action", 0.5);
  set("transition", "transition", -6.0);
  set("transition", "character", -3.0);
  set("transition", "dialogue", -6.0);

  return matrix;
};

export const TRANSITION_MATRIX = buildTransitionMatrix();

import type { ElementType } from "../classification-types";

export const VITERBI_TYPES: readonly ElementType[] = [
  "basmala",
  "scene_header_1",
  "scene_header_2",
  "scene_header_3",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
] as const;

export const TYPE_INDEX = new Map<ElementType, number>(
  VITERBI_TYPES.map((type, index) => [type, index])
);

export const NUM_TYPES = VITERBI_TYPES.length;

export const FORWARD_BIAS_SCALE = 0.04;

export const readNumericValue = (
  values: ArrayLike<number>,
  index: number
): number => values[index] ?? 0;

export const adjustNumericValue = (
  values: Float64Array,
  index: number,
  delta: number
): void => {
  values[index] = readNumericValue(values, index) + delta;
};

export const getRequiredItem = <T>(
  values: readonly T[],
  index: number,
  label: string
): T => {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing ${label} at index ${index}`);
  }
  return value;
};

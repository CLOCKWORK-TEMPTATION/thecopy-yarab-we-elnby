/**
 * Shared constants for particle letter rendering
 *
 * These constants define the typography and positioning for both
 * particle-background.tsx and particle-background-optimized.tsx
 * to ensure visual parity between the two implementations.
 */

// Typography constants
export const STROKE_WIDTH = 0.035;
export const BASELINE = -0.3;
export const X_HEIGHT = 0.35;
export const ASCENDER_HEIGHT = 0.65;
export const DESCENDER_DEPTH = -0.25;
export const ARABIC_HEIGHT = 0.45;

// Letter X positions (horizontal placement)
export const LETTER_POSITIONS = {
  // English letters
  T: -1.7,
  H: -1.25,
  E: -0.6,
  C: 0.0,
  O: 0.5,
  P: 1.0,
  Y: 1.9,

  // Separator
  DASH: 2.4,

  // Arabic letters
  ALEF: 2.9,
  LAM: 3.3,
  NOON: 3.75,
  SEEN: 4.25,
  KHAA: 4.75,
  TAA_MARBOUTA: 5.2,
} as const;

// Sampling bounds for particle generation
export const SAMPLING_BOUNDS = {
  minX: -2.1,
  maxX: 5.6,
  minY: -0.4,
  maxY: 0.85,
} as const;

// Particle generation thresholds
export const PARTICLE_THRESHOLDS = {
  english: 0.01,
  arabic: 0.015, // Higher threshold for Arabic letters to improve density
} as const;

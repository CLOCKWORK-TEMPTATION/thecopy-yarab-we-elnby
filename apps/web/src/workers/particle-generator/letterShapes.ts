import {
  sdBox,
  sdCircle,
  sdRing,
  sdSegment,
  sdArc,
  opUnion,
  opSubtract,
} from "./sdfCore";

// Character constants
export const STROKE_WIDTH = 0.035;
export const BASELINE = 0.0;
export const X_HEIGHT = 0.35;
export const ASCENDER_HEIGHT = 0.65;
export const DESCENDER_DEPTH = -0.25;
export const ARABIC_HEIGHT = 0.45;

// Letters SDF definitions
export const dist_t = (px: number, py: number): number => {
  const x = -1.7;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ASCENDER_HEIGHT - 0.05,
    x,
    BASELINE,
    STROKE_WIDTH
  );
  const crossbar = sdSegment(
    px,
    py,
    x - 0.15,
    BASELINE + ASCENDER_HEIGHT,
    x + 0.15,
    BASELINE + ASCENDER_HEIGHT,
    STROKE_WIDTH
  );
  return opUnion(stem, crossbar);
};

export const dist_h = (px: number, py: number): number => {
  const x = -1.25;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ASCENDER_HEIGHT,
    x,
    BASELINE,
    STROKE_WIDTH
  );
  const shoulder = sdArc(
    px,
    py,
    x,
    BASELINE + X_HEIGHT * 0.8,
    0.22,
    -Math.PI / 2,
    0,
    STROKE_WIDTH
  );
  const rightLeg = sdSegment(
    px,
    py,
    x + 0.22,
    BASELINE + X_HEIGHT * 0.8,
    x + 0.22,
    BASELINE,
    STROKE_WIDTH
  );
  return opUnion(opUnion(stem, shoulder), rightLeg);
};

export const dist_e = (px: number, py: number): number => {
  const cx = -0.6;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  let ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  ring = opSubtract(ring, cutBox);
  const bar = sdSegment(px, py, cx - r, cy, cx + r * 0.7, cy, STROKE_WIDTH);
  return opUnion(ring, bar);
};

export const dist_c = (px: number, py: number): number => {
  const cx = 0.0;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  const ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  return opSubtract(ring, cutBox);
};

export const dist_o = (px: number, py: number): number => {
  const cx = 0.5;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  return sdRing(px, py, cx, cy, r, STROKE_WIDTH);
};

export const dist_p = (px: number, py: number): number => {
  const x = 1.0;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + X_HEIGHT,
    x,
    BASELINE + DESCENDER_DEPTH,
    STROKE_WIDTH
  );
  const bowl = sdRing(px, py, x + 0.2, cy, 0.17, STROKE_WIDTH);
  return opUnion(stem, bowl);
};

export const dist_y = (px: number, py: number): number => {
  const x = 1.9;
  const top = BASELINE + X_HEIGHT;
  const mid = BASELINE + X_HEIGHT * 0.2;
  const leftArm = sdSegment(px, py, x - 0.15, top, x, mid, STROKE_WIDTH);
  const rightArm = sdSegment(px, py, x + 0.15, top, x, mid, STROKE_WIDTH);
  const descender = sdSegment(
    px,
    py,
    x,
    mid,
    x + 0.05,
    BASELINE + DESCENDER_DEPTH,
    STROKE_WIDTH
  );
  return opUnion(opUnion(leftArm, rightArm), descender);
};

export const dist_dash = (px: number, py: number): number => {
  const x = 2.4;
  return sdSegment(
    px,
    py,
    x - 0.1,
    BASELINE + X_HEIGHT * 0.5,
    x + 0.1,
    BASELINE + X_HEIGHT * 0.5,
    STROKE_WIDTH * 0.8
  );
};

export const dist_alef = (px: number, py: number): number => {
  const x = 2.9;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ARABIC_HEIGHT * 0.95,
    x,
    BASELINE,
    STROKE_WIDTH * 1.2
  );
  const base = sdSegment(
    px,
    py,
    x - 0.03,
    BASELINE,
    x + 0.03,
    BASELINE,
    STROKE_WIDTH * 1.5
  );
  return opUnion(stem, base);
};

export const dist_lam = (px: number, py: number): number => {
  const x = 3.3;
  const stem = sdSegment(
    px,
    py,
    x,
    BASELINE + ARABIC_HEIGHT * 0.95,
    x,
    BASELINE + 0.08,
    STROKE_WIDTH * 1.2
  );
  const hook = sdArc(
    px,
    py,
    x - 0.12,
    BASELINE + 0.08,
    0.12,
    0,
    Math.PI / 2,
    STROKE_WIDTH * 1.1
  );
  const hookEnd = sdSegment(
    px,
    py,
    x - 0.24,
    BASELINE,
    x - 0.15,
    BASELINE,
    STROKE_WIDTH
  );
  return opUnion(opUnion(stem, hook), hookEnd);
};

export const dist_noon = (px: number, py: number): number => {
  const x = 3.75;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;
  const mainArc = sdArc(
    px,
    py,
    x,
    cy,
    0.18,
    -Math.PI * 0.15,
    Math.PI * 0.85,
    STROKE_WIDTH * 1.1
  );
  const connector = sdSegment(
    px,
    py,
    x - 0.17,
    cy - 0.05,
    x - 0.08,
    BASELINE + 0.02,
    STROKE_WIDTH
  );
  const base = sdSegment(
    px,
    py,
    x - 0.08,
    BASELINE + 0.02,
    x + 0.1,
    BASELINE,
    STROKE_WIDTH
  );
  const dot = sdCircle(px, py, x, cy + 0.28, 0.035);
  return opUnion(opUnion(opUnion(mainArc, connector), base), dot);
};

export const dist_seen = (px: number, py: number): number => {
  const x = 4.25;
  const baseY = BASELINE + 0.02;
  const toothHeight = ARABIC_HEIGHT * 0.35;
  const baseLine = sdSegment(
    px,
    py,
    x - 0.28,
    baseY,
    x + 0.28,
    baseY,
    STROKE_WIDTH * 1.1
  );
  const tooth1 = sdArc(
    px,
    py,
    x - 0.18,
    baseY + toothHeight * 0.6,
    0.1,
    Math.PI * 0.9,
    Math.PI * 0.1,
    STROKE_WIDTH
  );
  const tooth2 = sdArc(
    px,
    py,
    x,
    baseY + toothHeight * 0.8,
    0.12,
    Math.PI * 0.9,
    Math.PI * 0.1,
    STROKE_WIDTH
  );
  const tooth3 = sdArc(
    px,
    py,
    x + 0.18,
    baseY + toothHeight * 0.6,
    0.1,
    Math.PI * 0.9,
    Math.PI * 0.1,
    STROKE_WIDTH
  );
  const connect1 = sdSegment(
    px,
    py,
    x - 0.18,
    baseY,
    x - 0.18,
    baseY + toothHeight * 0.5,
    STROKE_WIDTH * 0.8
  );
  const connect2 = sdSegment(
    px,
    py,
    x,
    baseY,
    x,
    baseY + toothHeight * 0.7,
    STROKE_WIDTH * 0.8
  );
  const connect3 = sdSegment(
    px,
    py,
    x + 0.18,
    baseY,
    x + 0.18,
    baseY + toothHeight * 0.5,
    STROKE_WIDTH * 0.8
  );
  return opUnion(
    opUnion(
      opUnion(
        opUnion(opUnion(opUnion(baseLine, tooth1), tooth2), tooth3),
        connect1
      ),
      connect2
    ),
    connect3
  );
};

export const dist_khaa = (px: number, py: number): number => {
  const x = 4.75;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;
  const mainArc = sdArc(
    px,
    py,
    x,
    cy,
    0.2,
    Math.PI * 0.6,
    Math.PI * 2.4,
    STROKE_WIDTH * 1.1
  );
  const rightConnect = sdSegment(
    px,
    py,
    x + 0.15,
    cy - 0.12,
    x + 0.12,
    BASELINE,
    STROKE_WIDTH
  );
  const leftConnect = sdSegment(
    px,
    py,
    x - 0.15,
    cy - 0.12,
    x - 0.08,
    BASELINE,
    STROKE_WIDTH
  );
  const dot = sdCircle(px, py, x, cy + 0.28, 0.035);
  return opUnion(opUnion(opUnion(mainArc, rightConnect), leftConnect), dot);
};

export const dist_taa_marbouta = (px: number, py: number): number => {
  const x = 5.2;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;
  let circle = sdRing(px, py, x, cy, 0.17, STROKE_WIDTH * 1.1);
  const opening = sdBox(px - x, py - (cy - 0.05), 0.08, 0.08, 0);
  circle = opSubtract(circle, opening);
  const dot1 = sdCircle(px, py, x - 0.07, cy + 0.28, 0.03);
  const dot2 = sdCircle(px, py, x + 0.07, cy + 0.28, 0.03);
  return opUnion(opUnion(circle, dot1), dot2);
};

// Combine all letters
export const dist_all = (px: number, py: number): number => {
  return Math.min(
    dist_t(px, py),
    dist_h(px, py),
    dist_e(px, py),
    dist_c(px, py),
    dist_o(px, py),
    dist_p(px, py),
    dist_y(px, py),
    dist_dash(px, py),
    dist_alef(px, py),
    dist_lam(px, py),
    dist_noon(px, py),
    dist_seen(px, py),
    dist_khaa(px, py),
    dist_taa_marbouta(px, py)
  );
};

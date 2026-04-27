// SDF primitives + letter glyphs for the "the copy" wordmark particle animation.
// Pure math; shared across particle-background variants in apps/web/src/components/.

import {
  ARABIC_HEIGHT,
  ASCENDER_HEIGHT,
  BASELINE,
  DESCENDER_DEPTH,
  LETTER_POSITIONS,
  STROKE_WIDTH,
  X_HEIGHT,
} from "@/lib/particle-letters.constants";

const clamp = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(max, value));
};

const sdBox = (
  px: number,
  py: number,
  bx: number,
  by: number,
  r: number
): number => {
  const dx = Math.abs(px) - bx;
  const dy = Math.abs(py) - by;
  return (
    Math.sqrt(Math.max(dx, 0) ** 2 + Math.max(dy, 0) ** 2) +
    Math.min(Math.max(dx, dy), 0) -
    r
  );
};

const sdCircle = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
): number => {
  return Math.hypot(px - cx, py - cy) - r;
};

const sdRing = (
  ...[px, py, cx, cy, r, thickness]: [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
): number => {
  return Math.abs(sdCircle(px, py, cx, cy, r)) - thickness;
};

const sdSegment = (
  ...[px, py, ax, ay, bx, by, r]: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
): number => {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = clamp((pax * bax + pay * bay) / (bax * bax + bay * bay), 0, 1);
  const dx = pax - bax * h;
  const dy = pay - bay * h;
  return Math.sqrt(dx * dx + dy * dy) - r;
};

const sdArc = (
  ...[px, py, cx, cy, r, startAngle, endAngle, thickness]: [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
): number => {
  const dx = px - cx;
  const dy = py - cy;
  const angle = Math.atan2(dy, dx);

  let normAngle = angle;
  while (normAngle < startAngle) normAngle += Math.PI * 2;
  while (normAngle > endAngle + Math.PI * 2) normAngle -= Math.PI * 2;

  const clampedAngle = clamp(normAngle, startAngle, endAngle);
  const targetX = cx + Math.cos(clampedAngle) * r;
  const targetY = cy + Math.sin(clampedAngle) * r;

  return Math.hypot(px - targetX, py - targetY) - thickness;
};

const opUnion = (a: number, b: number): number => Math.min(a, b);
const opSubtract = (a: number, b: number): number => Math.max(a, -b);

const dist_t = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.T;
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

const dist_h = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.H;
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

const dist_e = (px: number, py: number): number => {
  const cx = LETTER_POSITIONS.E;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;

  let ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  ring = opSubtract(ring, cutBox);

  const bar = sdSegment(px, py, cx - r, cy, cx + r * 0.7, cy, STROKE_WIDTH);

  return opUnion(ring, bar);
};

const dist_c = (px: number, py: number): number => {
  const cx = LETTER_POSITIONS.C;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;

  let ring = sdRing(px, py, cx, cy, r, STROKE_WIDTH);
  const cutBox = sdBox(px - (cx + r * 0.5), py - cy, 0.15, 0.14, 0);
  ring = opSubtract(ring, cutBox);

  return ring;
};

const dist_o = (px: number, py: number): number => {
  const cx = LETTER_POSITIONS.O;
  const cy = BASELINE + X_HEIGHT * 0.5;
  const r = 0.2;
  return sdRing(px, py, cx, cy, r, STROKE_WIDTH);
};

const dist_p = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.P;
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

const dist_y = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.Y;
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

const dist_dash = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.DASH;
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

const dist_alef = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.ALEF;
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

const dist_lam = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.LAM;
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

const dist_noon = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.NOON;
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

const dist_seen = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.SEEN;
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

const dist_khaa = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.KHAA;
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

const dist_taa_marbouta = (px: number, py: number): number => {
  const x = LETTER_POSITIONS.TAA_MARBOUTA;
  const cy = BASELINE + ARABIC_HEIGHT * 0.4;

  let circle = sdRing(px, py, x, cy, 0.17, STROKE_WIDTH * 1.1);
  const opening = sdBox(px - x, py - (cy - 0.05), 0.08, 0.08, 0);
  circle = opSubtract(circle, opening);

  const dot1 = sdCircle(px, py, x - 0.07, cy + 0.28, 0.03);
  const dot2 = sdCircle(px, py, x + 0.07, cy + 0.28, 0.03);

  return opUnion(opUnion(circle, dot1), dot2);
};

const dist_all = (px: number, py: number): number => {
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

export const dist = (px: number, py: number): number => dist_all(px, py);

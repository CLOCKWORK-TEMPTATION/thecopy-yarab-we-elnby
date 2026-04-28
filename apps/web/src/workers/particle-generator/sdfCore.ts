// Utility function
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// ====== SDF Functions ======

export const sdBox = (
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

export const sdCircle = (
  px: number,
  py: number,
  cx: number,
  cy: number,
  r: number
): number => {
  return Math.hypot(px - cx, py - cy) - r;
};

export const sdRing = (
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

export const sdSegment = (
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

export const sdArc = (
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

// SDF boolean operations
export const opUnion = (a: number, b: number): number => Math.min(a, b);
export const opSubtract = (a: number, b: number): number => Math.max(a, -b);

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getStepPrecision(step: number): number {
  if (!Number.isFinite(step)) {
    return 0;
  }

  const normalized = step.toString().toLowerCase();
  if (normalized.includes("e-")) {
    const [, exponent] = normalized.split("e-");
    return Number(exponent);
  }

  const [, decimals = ""] = normalized.split(".");
  return decimals.length;
}

export function roundToStep(value: number, min: number, step: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) {
    return value;
  }

  const precision = getStepPrecision(step);
  const rounded = Math.round((value - min) / step) * step + min;
  return Number(rounded.toFixed(precision));
}

export function clampToStep(
  value: number,
  min: number,
  max: number,
  step: number
): number {
  return clampValue(roundToStep(value, min, step), min, max);
}

export function parseNumericInput(raw: string): number | null {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

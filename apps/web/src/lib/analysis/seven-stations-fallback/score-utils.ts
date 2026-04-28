export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatOverallRating(
  score: number
): "Masterpiece" | "Excellent" | "Good" | "Fair" | "Needs Work" {
  if (score >= 90) return "Masterpiece";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  return "Needs Work";
}

export function formatEfficiencyRating(
  score: number
): "Excellent" | "Good" | "Fair" | "Poor" | "Critical" {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 55) return "Fair";
  if (score >= 35) return "Poor";
  return "Critical";
}

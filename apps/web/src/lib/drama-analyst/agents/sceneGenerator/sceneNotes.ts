import type { StandardAgentOutput } from "../shared/standardAgentPattern";

export function generateSceneNotes(
  output: StandardAgentOutput,
  tension: number,
  dialogue: number,
  visual: number,
  pacing: number
): string[] {
  const notes: string[] = [];

  // Overall quality
  const avgQuality = (tension + dialogue + visual + pacing) / 4;
  if (avgQuality > 0.8) {
    notes.push("مشهد ممتاز الجودة");
  } else if (avgQuality > 0.6) {
    notes.push("مشهد جيد");
  } else {
    notes.push("يحتاج تحسين");
  }

  // Specific strengths/weaknesses
  if (tension > 0.8) notes.push("توتر درامي قوي");
  if (dialogue > 0.8) notes.push("حوارات متميزة");
  if (visual > 0.8) notes.push("وضوح بصري ممتاز");
  if (pacing > 0.8) notes.push("إيقاع متوازن");

  if (tension < 0.5) notes.push("يحتاج مزيد من الصراع");
  if (dialogue < 0.5) notes.push("الحوار يحتاج تطوير");

  // Add original notes
  if (output.notes) {
    notes.push(...output.notes);
  }

  return notes;
}

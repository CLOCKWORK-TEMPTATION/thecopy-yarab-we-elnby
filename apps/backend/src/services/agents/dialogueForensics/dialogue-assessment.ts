/**
 * Dialogue Forensics Assessment Helpers
 * Extracted to reduce file size of DialogueForensicsAgent.ts
 */
import { safeCountMultipleTerms, sumCounts } from "../shared/safe-regexp";

export function assessAuthenticity(text: string): number {
  let score = 0.5;

  const authenticityTerms = [
    "طبيعي", "واقعي", "أصيل", "حقيقي", "مقنع", "صادق", "عفوي",
  ];
  const termCount = safeCountMultipleTerms(text, authenticityTerms);
  score += Math.min(0.25, sumCounts(termCount) * 0.04);

  const negativeTerms = ["مفتعل", "غير طبيعي", "متكلف", "مصطنع"];
  const negCount = safeCountMultipleTerms(text, negativeTerms);
  score -= Math.min(0.2, sumCounts(negCount) * 0.05);

  const hasExamples = (text.match(/["«]/g) ?? []).length >= 3;
  if (hasExamples) score += 0.15;

  return Math.min(1, Math.max(0, score));
}

export function assessCharacterization(text: string): number {
  let score = 0.6;

  const charTerms = [
    "صوت الشخصية", "تمايز", "مميز", "فريد", "اتساق", "متسق", "يعكس",
  ];
  const charCount = safeCountMultipleTerms(text, charTerms);
  score += Math.min(0.25, sumCounts(charCount) * 0.03);

  const hasVoiceAnalysis = text.includes("الشخصية") && text.includes("حوار");
  if (hasVoiceAnalysis) score += 0.15;

  return Math.min(1, score);
}

export function assessFunctionality(text: string): number {
  let score = 0.5;

  const functionalTerms = [
    "يدفع", "يكشف", "يطور", "يبني", "وظيفة", "يخدم", "يساهم",
  ];
  const funcCount = safeCountMultipleTerms(text, functionalTerms);
  score += Math.min(0.3, sumCounts(funcCount) * 0.03);

  const hasPurposeAnalysis =
    text.includes("الغرض") || text.includes("الهدف") || text.includes("الوظيفة");
  if (hasPurposeAnalysis) score += 0.2;

  return Math.min(1, score);
}

export function assessTechnicalQuality(text: string): number {
  let score = 0.6;

  const technicalTerms = [
    "إيقاع", "تدفق", "توازن", "وتيرة", "تنوع", "بنية", "صياغة",
  ];
  const techCount = safeCountMultipleTerms(text, technicalTerms);
  score += Math.min(0.25, sumCounts(techCount) * 0.04);

  if (text.length > 1500) score += 0.15;

  return Math.min(1, score);
}

export function countProblems(text: string): number {
  const problemMarkers = text.match(
    /مشكلة|خطأ|ضعف|يحتاج تحسين|افتعال|تكرار غير مبرر/gi
  );
  return problemMarkers ? Math.min(problemMarkers.length, 10) : 0;
}

export function countRecommendations(text: string): number {
  const recMarkers = text.match(
    /يُنصح|يُفضل|توصية|اقتراح|يمكن تحسين|بدلاً من|الأفضل/gi
  );
  return recMarkers ? Math.min(recMarkers.length, 12) : 0;
}

export function countDialogueSamples(text: string): number {
  const samples = text.match(/["«]/g);
  return samples ? Math.floor(samples.length / 2) : 0;
}

export function cleanupDialogueText(text: string): string {
  let cleaned = text.replace(/```json[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/```[\s\S]*?```/g, "");
  cleaned = cleaned.replace(/\{[\s\S]*?\}/g, (match) => {
    if (match.includes('"') && match.includes(":")) return "";
    return match;
  });
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

export function translateFocusArea(area: string): string {
  const areas: Record<string, string> = {
    authenticity: "الأصالة والطبيعية",
    subtext: "النص الباطني",
    rhythm: "الإيقاع والتدفق",
    "character-voice": "صوت الشخصية",
    exposition: "الشرح والتوضيح",
    conflict: "بناء الصراع",
    pacing: "الوتيرة",
  };
  return areas[area] ?? area;
}

interface ThresholdCheck {
  value: number;
  high: number;
  highMsg: string;
  low?: number;
  lowMsg?: string;
}

export function addDialogueThresholdNotes(notes: string[], checks: ThresholdCheck[]): void {
  for (const check of checks) {
    if (check.value > check.high) notes.push(check.highMsg);
    else if (check.low !== undefined && check.lowMsg && check.value < check.low) notes.push(check.lowMsg);
  }
}

export function generateDialogueNotes(
  outputNotes: string[] | undefined,
  authenticity: number,
  characterization: number,
  functionality: number,
  technical: number,
): string[] {
  const notes: string[] = [];

  const avg = (authenticity + characterization + functionality + technical) / 4;
  if (avg > 0.8) notes.push("تحليل حواري ممتاز");
  else if (avg > 0.65) notes.push("تحليل جيد");
  else notes.push("يحتاج عمق أكبر");

  addDialogueThresholdNotes(notes, [
    { value: authenticity, high: 0.75, highMsg: "تقييم أصالة دقيق", low: 0.5, lowMsg: "يحتاج تركيز على الطبيعية" },
    { value: characterization, high: 0.75, highMsg: "تحليل أصوات قوي", low: 0.5, lowMsg: "يحتاج تحليل أعمق للأصوات" },
    { value: functionality, high: 0.75, highMsg: "تقييم وظيفي جيد", low: 0.5, lowMsg: "يحتاج تقييم أفضل للوظيفة" },
    { value: technical, high: 0.75, highMsg: "تحليل تقني شامل" },
  ]);

  if (outputNotes) notes.push(...outputNotes);
  return notes;
}

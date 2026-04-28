export function translateSceneType(type: string): string {
  const types: Record<string, string> = {
    dramatic: "درامي",
    action: "حركة",
    dialogue: "حواري",
    emotional: "عاطفي",
    comedic: "كوميدي",
    suspense: "تشويق",
    romantic: "رومانسي",
  };
  return types[type] ?? type;
}

export function translateEmotionalTone(tone: string): string {
  const tones: Record<string, string> = {
    neutral: "محايد",
    tense: "متوتر",
    happy: "سعيد",
    sad: "حزين",
    angry: "غاضب",
    fearful: "خائف",
    hopeful: "متفائل",
    melancholic: "حزين عميق",
  };
  return tones[tone] ?? tone;
}

export function translateConflictLevel(level: string): string {
  const levels: Record<string, string> = {
    none: "بدون صراع",
    low: "منخفض",
    medium: "متوسط",
    high: "عالي",
    extreme: "شديد جداً",
  };
  return levels[level] ?? level;
}

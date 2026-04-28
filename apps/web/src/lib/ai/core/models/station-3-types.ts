// Station 3 Types

export interface Station3Input extends StationInput {
  previousAnalysis: {
    station1: Station1Output;
    station2: Station2Output;
  };
}

export interface Station3Output {
  // شبكة الصراعات
  conflictNetwork: {
    characters: Map<string, Character>;
    relationships: Map<string, Relationship>;
    conflicts: Map<string, Conflict>;
    snapshots: NetworkSnapshot[]; // لقطات تطور الشبكة
  };

  // تحليل الشبكة
  networkAnalysis: {
    density: number; // كثافة العلاقات
    complexity: number; // تعقيد الشبكة
    balance: number; // توازن القوى
    dynamicRange: number; // مدى التغير
    centralityScores: Map<string, number>; // أهمية كل شخصية
  };

  // تحليل الصراعات
  conflictAnalysis: {
    mainConflict: Conflict;
    subConflicts: Conflict[];
    conflictTypes: Map<string, number>;
    intensityProgression: number[]; // منحنى شدة الصراع
    resolutionQuality: number; // جودة الحلول
  };

  // أقواس الشخصيات
  characterArcs: Map<string, CharacterArc>;

  // النقاط المحورية
  pivotPoints: {
    timestamp: string;
    description: string;
    impact: number;
    affectedElements: string[];
  }[];

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين
  uncertaintyReport?: UncertaintyReport;
}
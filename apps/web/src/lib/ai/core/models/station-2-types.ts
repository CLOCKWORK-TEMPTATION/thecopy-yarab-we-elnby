// Station 2 Types

export interface Station2Input extends StationInput {
  previousAnalysis: Station1Output;
}

export interface Station2Output {
  // البيانات المفاهيمية
  storyStatement: string; // بيان القصة الأساسي
  elevatorPitch: string; // عرض مختصر (40 كلمة)
  hybridGenre: {
    primary: string;
    secondary: string[];
    genreBlend: string;
    originalityScore: number; // 0-10
  };

  // المواضيع والرسائل
  themes: {
    primary: Theme[];
    secondary: Theme[];
    messages: {
      explicit: string[];
      implicit: string[];
      contradictions: string[];
    };
  };

  // الجمهور والسوق
  targetAudience: AudienceProfile;
  marketAnalysis: {
    producibility: number; // سهولة الإنتاج (0-10)
    commercialPotential: number; // إمكانية تجارية (0-10)
    uniqueness: number; // الأصالة (0-10)
    culturalResonance: number; // التوافق الثقافي (0-10)
  };

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين
  uncertaintyReport?: UncertaintyReport;
}
import type {
  ArtisticReferencesResult,
  DynamicToneResult,
  GenreMatrixResult,
  Station2Context,
  ThemeAnalysis,
  ThreeDMapResult,
} from "./types";

export function getDefault3DMap(): ThreeDMapResult {
  return {
    horizontalEventsAxis: [
      {
        event: "حدث افتراضي",
        sceneRef: "مشهد افتراضي",
        timestamp: "00:00:00",
        narrativeWeight: 5,
      },
    ],
    verticalMeaningAxis: [
      {
        eventRef: "حدث افتراضي",
        symbolicLayer: "طبقة رمزية افتراضية",
        thematicConnection: "صلة ثيماتية افتراضية",
        depth: 5,
      },
    ],
    temporalDevelopmentAxis: {
      pastInfluence: "تأثير الماضي الافتراضي",
      presentChoices: "الخيارات الحالية الافتراضية",
      futureExpectations: "توقعات المستقبل الافتراضية",
      heroArcConnection: "صلة قوس البطل الافتراضية",
      causality: "سببية افتراضية",
    },
  };
}

export function getDefaultGenreMatrix(hybridGenre: string): GenreMatrixResult {
  return {
    [hybridGenre]: {
      conflictContribution: "مساهمة افتراضية في الصراع",
      pacingContribution: "مساهمة افتراضية في الإيقاع",
      visualCompositionContribution: "مساهمة افتراضية في التكوين البصري",
      soundMusicContribution: "مساهمة افتراضية في الصوت والموسيقى",
      charactersContribution: "مساهمة افتراضية في الشخصيات",
      weight: 1.0,
    },
  };
}

export function getDefaultDynamicTone(
  _context: Station2Context
): DynamicToneResult {
  return {
    setup: {
      visualAtmosphereDescribed: "جو بصري افتراضي للبداية",
      writtenPacing: "إيقاع كتابي افتراضي للبداية",
      dialogueStructure: "بنية حوار افتراضية للبداية",
      soundIndicationsDescribed: "توجيهات صوتية افتراضية للبداية",
      emotionalIntensity: 5,
    },
    confrontation: {
      visualAtmosphereDescribed: "جو بصري افتراضي للمواجهة",
      writtenPacing: "إيقاع كتابي افتراضي للمواجهة",
      dialogueStructure: "بنية حوار افتراضية للمواجهة",
      soundIndicationsDescribed: "توجيهات صوتية افتراضية للمواجهة",
      emotionalIntensity: 7,
    },
    resolution: {
      visualAtmosphereDescribed: "جو بصري افتراضي للحل",
      writtenPacing: "إيقاع كتابي افتراضي للحل",
      dialogueStructure: "بنية حوار افتراضية للحل",
      soundIndicationsDescribed: "توجيهات صوتية افتراضية للحل",
      emotionalIntensity: 4,
    },
  };
}

export function getDefaultArtisticReferences(
  _hybridGenre: string
): ArtisticReferencesResult {
  return {
    visualReferences: [
      {
        work: "عمل فني افتراضي",
        artist: "فنان افتراضي",
        reason: "سبب افتراضي",
        sceneApplication: "تطبيق افتراضي",
      },
    ],
    musicalMood: "مزاج موسيقي افتراضي",
    cinematicInfluences: [
      {
        film: "فيلم افتراضي",
        director: "مخرج افتراضي",
        aspect: "جانب مستوحى افتراضي",
      },
    ],
    literaryParallels: [
      {
        work: "عمل أدبي افتراضي",
        author: "كاتب افتراضي",
        connection: "صلة افتراضية",
      },
    ],
  };
}

export function getDefaultThemeAnalysis(): ThemeAnalysis {
  return {
    primaryThemes: [
      {
        theme: "ثيمة افتراضية",
        evidence: ["دليل افتراضي 1", "دليل افتراضي 2"],
        strength: 5,
        development: "تطور افتراضي",
      },
    ],
    secondaryThemes: [
      {
        theme: "ثيمة ثانوية افتراضية",
        occurrences: 3,
      },
    ],
    thematicConsistency: 5,
  };
}

export const STATION2_AGENTS_USED: readonly string[] = Object.freeze([
  "Story Statement Generator",
  "3D Map Builder",
  "Genre Analyzer",
  "Theme Analyzer",
  "Target Audience Identifier",
  "Market Analyzer",
]);

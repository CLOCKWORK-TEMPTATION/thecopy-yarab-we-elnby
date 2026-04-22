import { BaseStation, StationInput, StationOptions } from "./base-station";
import { GeminiService, GeminiModel } from "./gemini-service";
import { Station1Output } from "./station1-text-analysis";
import { toText, safeSub } from "../utils/text-utils";

export interface Station2Context {
  majorCharacters: Array<{ name: string; role: string }>;
  relationshipSummary: string;
  narrativeTone: string;
  fullText: string;
  logline: string;
  conflictSummary: string;
  dialogueQuality: number;
}

export interface Station2Input extends StationInput {
  station1Output: Station1Output;
}

export interface ThreeDMapResult {
  horizontalEventsAxis: Array<{
    event: string;
    sceneRef: string;
    timestamp: string;
    narrativeWeight: number;
  }>;
  verticalMeaningAxis: Array<{
    eventRef: string;
    symbolicLayer: string;
    thematicConnection: string;
    depth: number;
  }>;
  temporalDevelopmentAxis: {
    pastInfluence: string;
    presentChoices: string;
    futureExpectations: string;
    heroArcConnection: string;
    causality: string;
  };
}

export interface GenreMatrixResult {
  [genreName: string]: {
    conflictContribution: string;
    pacingContribution: string;
    visualCompositionContribution: string;
    soundMusicContribution: string;
    charactersContribution: string;
    weight: number;
  };
}

export interface DynamicToneResult {
  [stageName: string]: {
    visualAtmosphereDescribed: string;
    writtenPacing: string;
    dialogueStructure: string;
    soundIndicationsDescribed: string;
    emotionalIntensity: number;
  };
}

export interface ArtisticReferencesResult {
  visualReferences: Array<{
    work: string;
    artist?: string;
    reason: string;
    sceneApplication: string;
  }>;
  musicalMood: string;
  cinematicInfluences: Array<{
    film: string;
    director?: string;
    aspect: string;
  }>;
  literaryParallels: Array<{
    work: string;
    author?: string;
    connection: string;
  }>;
}

export interface ThemeAnalysis {
  primaryThemes: Array<{
    theme: string;
    evidence: string[];
    strength: number;
    development: string;
  }>;
  secondaryThemes: Array<{
    theme: string;
    occurrences: number;
  }>;
  thematicConsistency: number;
}

export interface Station2Output {
  storyStatement: string;
  alternativeStatements: string[];
  threeDMap: ThreeDMapResult;
  elevatorPitch: string;
  hybridGenre: string;
  genreAlternatives: string[];
  genreContributionMatrix: GenreMatrixResult;
  dynamicTone: DynamicToneResult;
  artisticReferences: ArtisticReferencesResult;
  themeAnalysis: ThemeAnalysis;
  targetAudience: {
    primaryAudience: string;
    demographics: string[];
    psychographics: string[];
  };
  marketAnalysis: {
    producibility: number;
    commercialPotential: number;
    uniqueness: number;
  };
  metadata: {
    analysisTimestamp: Date;
    status: "Success" | "Partial" | "Failed";
    processingTime: number;
    confidenceScore: number;
  };
}

export class Station2ConceptualAnalysis extends BaseStation {
  constructor(geminiService: GeminiService) {
    super(geminiService, "Station 2: Conceptual Analysis", 2);
  }

  protected async execute(
    input: StationInput,
    _options: StationOptions
  ): Promise<Station2Output> {
    const station2Input = input as Station2Input;
    const startTime = Date.now();
    const context = this.buildContextFromStation1(
      station2Input.station1Output,
      station2Input.text
    );

    try {
      const [
        storyStatements,
        threeDMap,
        hybridGenreOptions,
        themeAnalysis,
        targetAudience,
      ] = await Promise.all([
        this.generateStoryStatements(context),
        this.generate3DMap(context),
        this.generateHybridGenre(context),
        this.analyzeThemes(context),
        this.identifyTargetAudience(context),
      ]);

      const storyStatement = storyStatements[0] || "فشل توليد بيان القصة";
      const hybridGenre = hybridGenreOptions[0] || "دراما عامة";

      const [
        elevatorPitch,
        genreMatrix,
        dynamicTone,
        artisticReferences,
        marketAnalysis,
      ] = await Promise.all([
        this.generateElevatorPitch(storyStatement, context),
        this.generateGenreMatrix(hybridGenre, context),
        this.generateDynamicTone(hybridGenre, context),
        this.generateArtisticReferences(hybridGenre, context),
        this.analyzeMarketPotential(hybridGenre, context),
      ]);

      const processingTime = Date.now() - startTime;

      return {
        storyStatement,
        alternativeStatements: storyStatements.slice(1),
        threeDMap,
        elevatorPitch: elevatorPitch || "فشل توليد العرض المختصر",
        hybridGenre,
        genreAlternatives: hybridGenreOptions.slice(1),
        genreContributionMatrix: genreMatrix,
        dynamicTone,
        artisticReferences,
        themeAnalysis,
        targetAudience,
        marketAnalysis,
        metadata: {
          analysisTimestamp: new Date(),
          status: "Success",
          processingTime,
          confidenceScore: this.calculateConfidenceScore(
            storyStatements,
            threeDMap,
            themeAnalysis
          ),
        },
      };
    } catch (error) {
      console.error("[Station2] Processing error:", error);
      return this.getErrorFallback();
    }
  }

  private buildContextFromStation1(
    s1Output: Station1Output,
    fullText: string
  ): Station2Context {
    const relationshipSummary = "علاقات الشخصيات الرئيسية";
    const conflictSummary = "الصراعات الأساسية في النص";

    return {
      majorCharacters: s1Output.majorCharacters,
      relationshipSummary: relationshipSummary || "لم يتم تحديد علاقات رئيسية.",
      narrativeTone: s1Output.narrativeStyleAnalysis.overallTone,
      fullText,
      logline: s1Output.logline,
      conflictSummary: conflictSummary || "لم يتم تحديد صراعات واضحة.",
      dialogueQuality: s1Output.dialogueAnalysis.efficiency,
    };
  }

  private async generateStoryStatements(
    context: Station2Context
  ): Promise<string[]> {
    const prompt = `
بصفتك خبير تحليل درامي، قم بصياغة **ثلاثة (3)** بيانات قصة (Story Statements) متميزة ومحكمة البناء.

**السياق المتاح:**
- الشخصيات الرئيسية: ${context.majorCharacters.map((c) => c.name).join("، ")}
- العلاقات الأساسية: ${context.relationshipSummary}
- الصراعات: ${context.conflictSummary}
- النبرة السردية: ${context.narrativeTone}
- ملخص القصة: ${context.logline}

**متطلبات كل بيان (4 جمل):**
1. **الحدث المحوري**: الحدث الجامع أو نقطة الانطلاق الدرامية
2. **الصراعات المتشابكة**: الدوافع المتقاطعة والتوترات المركزية
3. **العالم القصصي**: السياق الفريد والبيئة الدرامية المميزة
4. **السؤال الفلسفي**: الثيمة الجامعة أو القضية الفكرية المطروحة

**التنسيق المطلوب:**
قدم الإجابة كنص عادي، كل بيان في فقرة منفصلة بدون ترقيم أو عناوين.
كل فقرة يجب أن تحتوي على 4 جمل متماسكة ومترابطة.

**ملاحظة مهمة:** 
- استخدم لغة سينمائية قوية ومباشرة
- تجنب التعميمات والعبارات المبهمة
- ركز على التفاصيل الدرامية الملموسة
- اجعل كل بيان يقدم زاوية مختلفة للقصة
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 30000),
      model: GeminiModel.FLASH,
      temperature: 0.85,
    });

    if (!result.content) {
      return ["فشل توليد بيان القصة"];
    }

    const statements = toText(result.content)
      .split("\n\n")
      .filter((s) => s.trim().length > 50)
      .slice(0, 3);

    return statements.length > 0 ? statements : ["فشل توليد بيانات قصة متعددة"];
  }

  private async generate3DMap(
    context: Station2Context
  ): Promise<ThreeDMapResult> {
    const prompt = `
قم بإنشاء **خريطة ثلاثية الأبعاد (3D Map)** شاملة للبنية الدرامية بناءً على السياق التالي:

**السياق:**
${JSON.stringify(
  {
    characters: context.majorCharacters.map((c) => c.name),
    relationships: context.relationshipSummary,
    conflicts: context.conflictSummary,
    tone: context.narrativeTone,
  },
  null,
  2
)}

**المحاور الثلاثة المطلوبة:**

1. **المحور الأفقي (الأحداث):**
   قدم قائمة بالأحداث الرئيسية مرتبة زمنياً، مع:
   - اسم الحدث (موجز ووصفي)
   - إشارة للمشهد المقابل (إن أمكن)
   - الوزن السردي (1-10)

2. **المحور العمودي (المعنى):**
   لكل حدث رئيسي، حدد:
   - الطبقة الرمزية أو الثيمة المرتبطة
   - العمق الفلسفي أو النفسي
   - الصلة بالثيمات الأساسية

3. **المحور الزمني (التطور):**
   حلل:
   - تأثير الماضي على الحاضر
   - الخيارات الحالية وعواقبها
   - توقعات المستقبل
   - الصلة بقوس تطور البطل
   - السببية (كيف يؤدي حدث لآخر)

**التنسيق:**
قدم إجابة JSON صارمة بدون أي نص إضافي:
{
  "horizontalEventsAxis": [
    {
      "event": "...",
      "sceneRef": "...",
      "timestamp": "...",
      "narrativeWeight": 8
    }
  ],
  "verticalMeaningAxis": [
    {
      "eventRef": "...",
      "symbolicLayer": "...",
      "thematicConnection": "...",
      "depth": 7
    }
  ],
  "temporalDevelopmentAxis": {
    "pastInfluence": "...",
    "presentChoices": "...",
    "futureExpectations": "...",
    "heroArcConnection": "...",
    "causality": "..."
  }
}
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 25000),
      model: GeminiModel.FLASH,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(toText(result.content));
      return this.validate3DMap(parsed);
    } catch (error) {
      console.error("[Station2] Failed to parse 3D Map:", error);
      return this.getDefault3DMap();
    }
  }

  private validate3DMap(parsed: any): ThreeDMapResult {
    return {
      horizontalEventsAxis: Array.isArray(parsed.horizontalEventsAxis)
        ? parsed.horizontalEventsAxis.map((e: any) => ({
            event: e.event || "",
            sceneRef: e.sceneRef || "",
            timestamp: e.timestamp || "",
            narrativeWeight: e.narrativeWeight || 5,
          }))
        : [],
      verticalMeaningAxis: Array.isArray(parsed.verticalMeaningAxis)
        ? parsed.verticalMeaningAxis.map((m: any) => ({
            eventRef: m.eventRef || "",
            symbolicLayer: m.symbolicLayer || "",
            thematicConnection: m.thematicConnection || "",
            depth: m.depth || 5,
          }))
        : [],
      temporalDevelopmentAxis: {
        pastInfluence: parsed.temporalDevelopmentAxis?.pastInfluence || "",
        presentChoices: parsed.temporalDevelopmentAxis?.presentChoices || "",
        futureExpectations:
          parsed.temporalDevelopmentAxis?.futureExpectations || "",
        heroArcConnection:
          parsed.temporalDevelopmentAxis?.heroArcConnection || "",
        causality: parsed.temporalDevelopmentAxis?.causality || "",
      },
    };
  }

  private async generateElevatorPitch(
    storyStatement: string,
    context: Station2Context
  ): Promise<string> {
    const prompt = `
بناءً على:
- **بيان القصة**: "${storyStatement}"
- **الشخصيات**: ${context.majorCharacters.map((c) => c.name).join("، ")}
- **النبرة**: ${context.narrativeTone}

صغ **Elevator Pitch** احترافي وجذاب:
- لا يتجاوز 40 كلمة
- يركز على الصراع المحوري
- يثير الفضول والتشويق
- يستهدف المنتجين/الممولين

قدم النص فقط بدون مقدمات أو تنسيقات.
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.FLASH,
      temperature: 0.9,
    });

    return toText(result.content) || "فشل توليد العرض المختصر";
  }

  private async generateHybridGenre(
    context: Station2Context
  ): Promise<string[]> {
    const prompt = `
بناءً على التحليل الشامل للنص:

**السياق:**
- الشخصيات: ${context.majorCharacters.map((c) => c.name).join("، ")}
- النبرة: ${context.narrativeTone}
- الصراعات: ${context.conflictSummary}
- جودة الحوار: ${context.dialogueQuality}/10

**المطلوب:**
اقترح **5 بدائل** لتركيبة نوع هجين (Hybrid Genre) دقيقة ومبتكرة.

**معايير الاقتراح:**
- دمج 2-3 أنواع رئيسية بطريقة منطقية
- تجنب الأنواع العامة جداً (مثل: "دراما")
- استخدم مصطلحات صناعة السينما المعاصرة
- ركز على الأنواع القابلة للتسويق

**أمثلة للتوضيح:**
- "Psychological Thriller مع عناصر Family Drama"
- "Dark Comedy بطابع Film Noir"
- "Social Realism مع لمسات Magical Realism"

**التنسيق:**
قدم كل بديل في سطر واحد، بدون ترقيم أو شرح إضافي.
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 20000),
      model: GeminiModel.FLASH,
      temperature: 0.85,
    });

    if (!result.content) {
      return ["دراما نفسية"];
    }

    const genres = toText(result.content)
      .split("\n")
      .filter((line) => line.trim().length > 5)
      .map((line) => line.replace(/^[-•*]\s*/, "").trim())
      .slice(0, 5);

    return genres.length > 0 ? genres : ["دراما معاصرة"];
  }

  private async generateGenreMatrix(
    hybridGenre: string,
    context: Station2Context
  ): Promise<GenreMatrixResult> {
    const prompt = `
للنوع الهجين المحدد: **"${hybridGenre}"**

قم بإنشاء **مصفوفة مساهمة النوع** تفصيلية توضح كيف يُثري كل نوع فرعي العناصر الخمسة التالية:

**العناصر المطلوب تحليلها:**
1. **الصراعات** (Conflict Structure)
2. **الإيقاع** (Pacing)
3. **التكوين البصري** (Visual Composition)
4. **الصوت والموسيقى** (Sound & Music)
5. **الشخصيات** (Characters)

**مثال للتوضيح:**
إذا كان النوع "Psychological Thriller + Family Drama"، فيجب تحليل:
- كيف يساهم "Psychological Thriller" في بناء الصراعات؟
- كيف يؤثر "Family Drama" على إيقاع السرد؟
- إلخ...

**التنسيق المطلوب:**
قدم JSON بدون أي نص إضافي:
{
  "النوع الأول": {
    "conflictContribution": "شرح تفصيلي",
    "pacingContribution": "شرح تفصيلي",
    "visualCompositionContribution": "شرح تفصيلي",
    "soundMusicContribution": "شرح تفصيلي",
    "charactersContribution": "شرح تفصيلي",
    "weight": 0.6
  },
  "النوع الثاني": {
    ...
    "weight": 0.4
  }
}

**ملاحظة:** weight يمثل الوزن النسبي للنوع في التركيبة الهجينة (مجموع الأوزان = 1).
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 15000),
      model: GeminiModel.FLASH,
      temperature: 0.75,
    });

    try {
      const parsed = JSON.parse(toText(result.content));
      return this.validateGenreMatrix(parsed);
    } catch (error) {
      console.error("[Station2] Failed to parse genre matrix:", error);
      return this.getDefaultGenreMatrix(hybridGenre);
    }
  }

  private validateGenreMatrix(parsed: any): GenreMatrixResult {
    const result: GenreMatrixResult = {};

    for (const [genre, contributions] of Object.entries(parsed)) {
      if (typeof contributions === "object" && contributions !== null) {
        result[genre] = {
          conflictContribution:
            (contributions as any).conflictContribution || "",
          pacingContribution: (contributions as any).pacingContribution || "",
          visualCompositionContribution:
            (contributions as any).visualCompositionContribution || "",
          soundMusicContribution:
            (contributions as any).soundMusicContribution || "",
          charactersContribution:
            (contributions as any).charactersContribution || "",
          weight: (contributions as any).weight || 0.5,
        };
      }
    }

    return result;
  }

  private async generateDynamicTone(
    hybridGenre: string,
    context: Station2Context
  ): Promise<DynamicToneResult> {
    const prompt = `
للنوع الهجين: **"${hybridGenre}"**
والنبرة السردية: **"${context.narrativeTone}"**

حلل **النبرة الديناميكية (Dynamic Tone)** عبر مراحل السيناريو الثلاث.

**المراحل المطلوبة:**
1. **الفصل الأول (Setup)**
2. **الفصل الثاني (Confrontation)**
3. **الفصل الثالث (Resolution)**

**لكل مرحلة، قدم:**
- **الجو البصري** (Visual Atmosphere): الإضاءة، الألوان، التكوين
- **الإيقاع الكتابي** (Written Pacing): سرعة السرد، طول المشاهد
- **بنية الحوار** (Dialogue Structure): كثافة الحوار، نمطه
- **التوجيهات الصوتية** (Sound Indications): الموسيقى، المؤثرات
- **الكثافة العاطفية** (Emotional Intensity): مقياس من 1-10

**التنسيق:**
JSON صارم بدون أي نص إضافي:
{
  "setup": {
    "visualAtmosphereDescribed": "...",
    "writtenPacing": "...",
    "dialogueStructure": "...",
    "soundIndicationsDescribed": "...",
    "emotionalIntensity": 5
  },
  "confrontation": {...},
  "resolution": {...}
}
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 15000),
      model: GeminiModel.FLASH,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(toText(result.content));
      return this.validateDynamicTone(parsed);
    } catch (error) {
      console.error("[Station2] Failed to parse dynamic tone:", error);
      return this.getDefaultDynamicTone(context);
    }
  }

  private validateDynamicTone(parsed: any): DynamicToneResult {
    const result: DynamicToneResult = {};
    const stages = ["setup", "confrontation", "resolution"];

    for (const stage of stages) {
      if (parsed[stage] && typeof parsed[stage] === "object") {
        result[stage] = {
          visualAtmosphereDescribed:
            parsed[stage].visualAtmosphereDescribed || "",
          writtenPacing: parsed[stage].writtenPacing || "",
          dialogueStructure: parsed[stage].dialogueStructure || "",
          soundIndicationsDescribed:
            parsed[stage].soundIndicationsDescribed || "",
          emotionalIntensity: parsed[stage].emotionalIntensity || 5,
        };
      }
    }

    return result;
  }

  private async generateArtisticReferences(
    hybridGenre: string,
    context: Station2Context
  ): Promise<ArtisticReferencesResult> {
    const prompt = `
للنوع الهجين: **"${hybridGenre}"**
والسياق الدرامي المتاح

اقترح **مراجع فنية شاملة** تشمل:

1. **مراجع بصرية (3-5 أعمال):**
   - لوحات فنية أو أعمال تصوير فوتوغرافي
   - سبب الاختيار وكيفية التطبيق على المشاهد

2. **المزاج الموسيقي:**
   - النمط الموسيقي العام
   - أمثلة لمؤلفين أو أعمال مرجعية

3. **تأثيرات سينمائية (3-5 أفلام):**
   - أفلام مرجعية مع أسماء المخرجين
   - الجانب المستوحى (إضاءة، إيقاع، بناء مشهد)

4. **موازيات أدبية (2-3 أعمال):**
   - أعمال أدبية ذات صلة
   - أوجه التشابه الثيمية أو الأسلوبية

**التنسيق:**
JSON صارم:
{
  "visualReferences": [
    {
      "work": "...",
      "artist": "...",
      "reason": "...",
      "sceneApplication": "..."
    }
  ],
  "musicalMood": "...",
  "cinematicInfluences": [
    {
      "film": "...",
      "director": "...",
      "aspect": "..."
    }
  ],
  "literaryParallels": [
    {
      "work": "...",
      "author": "...",
      "connection": "..."
    }
  ]
}
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 12000),
      model: GeminiModel.FLASH,
      temperature: 0.8,
    });

    try {
      const parsed = JSON.parse(toText(result.content));
      return this.validateArtisticReferences(parsed);
    } catch (error) {
      console.error("[Station2] Failed to parse artistic references:", error);
      return this.getDefaultArtisticReferences(hybridGenre);
    }
  }

  private validateArtisticReferences(parsed: any): ArtisticReferencesResult {
    return {
      visualReferences: Array.isArray(parsed.visualReferences)
        ? parsed.visualReferences.map((ref: any) => ({
            work: ref.work || "",
            artist: ref.artist || undefined,
            reason: ref.reason || "",
            sceneApplication: ref.sceneApplication || "",
          }))
        : [],
      musicalMood: parsed.musicalMood || "",
      cinematicInfluences: Array.isArray(parsed.cinematicInfluences)
        ? parsed.cinematicInfluences.map((inf: any) => ({
            film: inf.film || "",
            director: inf.director || undefined,
            aspect: inf.aspect || "",
          }))
        : [],
      literaryParallels: Array.isArray(parsed.literaryParallels)
        ? parsed.literaryParallels.map((par: any) => ({
            work: par.work || "",
            author: par.author || undefined,
            connection: par.connection || "",
          }))
        : [],
    };
  }

  private async analyzeThemes(
    context: Station2Context
  ): Promise<ThemeAnalysis> {
    const prompt = `
بناءً على السياق الدرامي الكامل:

**السياق:**
${JSON.stringify(
  {
    characters: context.majorCharacters.map((c) => ({
      name: c.name,
      role: c.role,
    })),
    tone: context.narrativeTone,
    conflicts: context.conflictSummary,
  },
  null,
  2
)}

قم بتحليل **الثيمات (Themes)** بشكل شامل:

**المطلوب:**
1. **الثيمات الأساسية (3-5):**
   - اسم الثيمة
   - أدلة نصية تدعمها (3-5 أمثلة)
   - قوة الثيمة (1-10)
   - كيفية تطورها عبر السيناريو

2. **الثيمات الثانوية (2-4):**
   - اسم الثيمة
   - عدد مرات ظهورها

3. **اتساق الثيمات:**
   - مقياس من 1-10 لمدى اتساق الثيمات

**التنسيق:**
JSON صارم:
{
  "primaryThemes": [
    {
      "theme": "...",
      "evidence": ["...", "...", "..."],
      "strength": 8,
      "development": "..."
    }
  ],
  "secondaryThemes": [
    {
      "theme": "...",
      "occurrences": 5
    }
  ],
  "thematicConsistency": 8
}
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      context: safeSub(context.fullText, 0, 20000),
      model: GeminiModel.FLASH,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(toText(result.content));
      return this.validateThemeAnalysis(parsed);
    } catch (error) {
      console.error("[Station2] Failed to parse theme analysis:", error);
      return this.getDefaultThemeAnalysis();
    }
  }

  private validateThemeAnalysis(parsed: any): ThemeAnalysis {
    return {
      primaryThemes: Array.isArray(parsed.primaryThemes)
        ? parsed.primaryThemes.map((t: any) => ({
            theme: t.theme || "",
            evidence: Array.isArray(t.evidence) ? t.evidence : [],
            strength: t.strength || 5,
            development: t.development || "",
          }))
        : [],
      secondaryThemes: Array.isArray(parsed.secondaryThemes)
        ? parsed.secondaryThemes.map((t: any) => ({
            theme: t.theme || "",
            occurrences: t.occurrences || 1,
          }))
        : [],
      thematicConsistency: parsed.thematicConsistency || 5,
    };
  }

  private async identifyTargetAudience(context: Station2Context): Promise<{
    primaryAudience: string;
    demographics: string[];
    psychographics: string[];
  }> {
    const prompt = `
بناءً على السياق الدرامي:
- الشخصيات: ${context.majorCharacters.map((c) => c.name).join("، ")}
- النبرة: ${context.narrativeTone}
- الصراعات: ${context.conflictSummary}

حدد الجمهور المستهدف بدقة:

**المطلوب:**
1. **الجمهور الأساسي**: وصف موجز (مثال: "شباب بالغون 18-35 سنة")
2. **الخصائص الديموغرافية**: 3-5 خصائص (عمر، جنس، موقع، تعليم، دخل)
3. **الخصائص النفسية**: 3-5 خصائص (اهتمامات، قيم، نمط حياة)

**التنسيق:**
JSON صارم:
{
  "primaryAudience": "...",
  "demographics": ["...", "...", "..."],
  "psychographics": ["...", "...", "..."]
}
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.FLASH,
      temperature: 0.7,
    });

    try {
      const parsed = JSON.parse(toText(result.content));
      return {
        primaryAudience: parsed.primaryAudience || "جمهور عام",
        demographics: Array.isArray(parsed.demographics)
          ? parsed.demographics
          : [],
        psychographics: Array.isArray(parsed.psychographics)
          ? parsed.psychographics
          : [],
      };
    } catch (error) {
      console.error("[Station2] Failed to parse target audience:", error);
      return {
        primaryAudience: "جمهور عام",
        demographics: ["بالغون", "كلا الجنسين"],
        psychographics: ["مهتمو الدراما"],
      };
    }
  }

  private async analyzeMarketPotential(
    hybridGenre: string,
    _context: Station2Context
  ): Promise<{
    producibility: number;
    commercialPotential: number;
    uniqueness: number;
  }> {
    const prompt = `
للنوع الهجين: **"${hybridGenre}"**
والسياق الدرامي المتاح

قم بتقييم إمكانات السوق من خلال ثلاثة مؤشرات:

**المؤشرات المطلوبة (مقياس 1-10):**
1. **إمكانية الإنتاج** (Producibility):
   - سهولة التنفيذ التقني
   - متطلبات الموارد
   - التعقيد الإنتاجي

2. **الإمكانية التجارية** (Commercial Potential):
   - جاذبية السوق
   - حجم الجمهور المحتمل
   - فرص التوزيع

3. **الأصالة** (Uniqueness):
   - التميز عن الأعمال المشابهة
   - الابتكار في المفهوم
   - الجاذبية الفنية

**التنسيق:**
JSON صارم:
{
  "producibility": 7,
  "commercialPotential": 8,
  "uniqueness": 6
}
`;

    const result = await this.geminiService.generate<string>({
      prompt,
      model: GeminiModel.FLASH,
      temperature: 0.6,
    });

    try {
      const parsed = JSON.parse(toText(result.content));
      return {
        producibility: parsed.producibility || 5,
        commercialPotential: parsed.commercialPotential || 5,
        uniqueness: parsed.uniqueness || 5,
      };
    } catch (error) {
      console.error("[Station2] Failed to parse market analysis:", error);
      return {
        producibility: 5,
        commercialPotential: 5,
        uniqueness: 5,
      };
    }
  }

  private calculateConfidenceScore(
    storyStatements: string[],
    threeDMap: ThreeDMapResult,
    themeAnalysis: ThemeAnalysis
  ): number {
    // Calculate confidence based on the quality and completeness of outputs
    let score = 0.5; // Base score

    // Story statements contribution
    if (storyStatements.length >= 3) {
      score += 0.15;
    } else if (storyStatements.length >= 2) {
      score += 0.1;
    } else if (storyStatements.length >= 1) {
      score += 0.05;
    }

    // 3D Map contribution
    const hasValidEvents = threeDMap.horizontalEventsAxis.length > 0;
    const hasValidMeaning = threeDMap.verticalMeaningAxis.length > 0;
    const hasValidTemporal =
      threeDMap.temporalDevelopmentAxis.pastInfluence.length > 0;

    if (hasValidEvents && hasValidMeaning && hasValidTemporal) {
      score += 0.2;
    } else if (hasValidEvents || hasValidMeaning || hasValidTemporal) {
      score += 0.1;
    }

    // Theme analysis contribution
    const hasPrimaryThemes = themeAnalysis.primaryThemes.length > 0;
    const hasSecondaryThemes = themeAnalysis.secondaryThemes.length > 0;
    const hasConsistencyScore = themeAnalysis.thematicConsistency > 0;

    if (hasPrimaryThemes && hasSecondaryThemes && hasConsistencyScore) {
      score += 0.15;
    } else if (hasPrimaryThemes || hasSecondaryThemes) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  private getErrorFallback(): Station2Output {
    return {
      storyStatement: "فشل في تحليل المفهوم",
      alternativeStatements: [],
      threeDMap: this.getDefault3DMap(),
      elevatorPitch: "فشل في توليد العرض المختصر",
      hybridGenre: "دراما عامة",
      genreAlternatives: [],
      genreContributionMatrix: this.getDefaultGenreMatrix("دراما عامة"),
      dynamicTone: this.getDefaultDynamicTone({
        majorCharacters: [],
        relationshipSummary: "",
        narrativeTone: "",
        fullText: "",
        logline: "",
        conflictSummary: "",
        dialogueQuality: 5,
      }),
      artisticReferences: this.getDefaultArtisticReferences("دراما عامة"),
      themeAnalysis: this.getDefaultThemeAnalysis(),
      targetAudience: {
        primaryAudience: "جمهور عام",
        demographics: ["بالغون"],
        psychographics: ["مهتمو الدراما"],
      },
      marketAnalysis: {
        producibility: 5,
        commercialPotential: 5,
        uniqueness: 5,
      },
      metadata: {
        analysisTimestamp: new Date(),
        status: "Failed",
        processingTime: 0,
        confidenceScore: 0.1,
      },
    };
  }

  private getDefault3DMap(): ThreeDMapResult {
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

  private getDefaultGenreMatrix(hybridGenre: string): GenreMatrixResult {
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

  private getDefaultDynamicTone(_context: Station2Context): DynamicToneResult {
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

  private getDefaultArtisticReferences(
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

  private getDefaultThemeAnalysis(): ThemeAnalysis {
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

  protected getAgentsUsed(): string[] {
    return [
      "Story Statement Generator",
      "3D Map Builder",
      "Genre Analyzer",
      "Theme Analyzer",
      "Target Audience Identifier",
      "Market Analyzer",
    ];
  }
}

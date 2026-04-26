// frontend/src/lib/ai/constitutional/multi-agent-debate.ts

import { stripHtmlTags } from "@/lib/security/sanitize-html";

import { GeminiService } from "../../ai/stations/gemini-service";

export interface DebateParticipant {
  role: "prosecutor" | "defender" | "judge";
  name: string;
  perspective: string;
}

export interface DebateArgument {
  participant: string;
  argument: string;
  evidence: string[];
  strength: number;
}

export interface DebateRound {
  round: number;
  prosecutorArgument: DebateArgument;
  defenderArgument: DebateArgument;
  judgeComments: string;
}

export interface ConsensusArea {
  aspect: string;
  agreement: string;
  confidence: number;
}

export interface DisputedArea {
  aspect: string;
  prosecutorView: string;
  defenderView: string;
  judgeOpinion: string;
  resolution: string;
}

export interface FinalVerdict {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: number;
}

export interface DebateVerdict {
  consensusAreas: ConsensusArea[];
  disputedAreas: DisputedArea[];
  finalVerdict: FinalVerdict;
}

export interface DebateDynamics {
  rounds: number;
  convergenceScore: number; // مدى تقارب الآراء
  controversialTopics: string[];
}

export interface DebateResult {
  participants: DebateParticipant[];
  rounds: DebateRound[];
  verdict: DebateVerdict;
  debateDynamics: DebateDynamics;
}

export class MultiAgentDebateSystem {
  constructor(private geminiService: GeminiService) {}

  /**
   * إجراء نقاش متعدد الوكلاء حول تحليل
   */
  async conductDebate(
    text: string,
    analysis: string,
    context: {
      analysisType: string;
      previousResults?: any;
    },
    maxRounds = 3
  ): Promise<DebateResult> {
    console.log(
      `[Multi-Agent Debate] Starting debate with max ${maxRounds} rounds`
    );

    // Define participants
    const participants: DebateParticipant[] = [
      {
        role: "prosecutor",
        name: "المدعي الناقد",
        perspective: "تحديد نقاط الضعف والأخطاء والتحيزات",
      },
      {
        role: "defender",
        name: "المدافع البناء",
        perspective: "إبراز نقاط القوة والجوانب الإيجابية",
      },
      {
        role: "judge",
        name: "القاضي الموضوعي",
        perspective: "التوصل لحكم متوازن وشامل",
      },
    ];

    const rounds: DebateRound[] = [];

    // Conduct debate rounds
    for (let i = 0; i < maxRounds; i++) {
      console.log(`[Multi-Agent Debate] Round ${i + 1}/${maxRounds}`);

      const round = await this.conductDebateRound(
        i + 1,
        text,
        analysis,
        context,
        rounds // Previous rounds for context
      );

      rounds.push(round);

      // Check for convergence
      const convergence = await this.checkConvergence(rounds);
      if (convergence > 0.8 && i >= 1) {
        console.log(`[Multi-Agent Debate] Converged after ${i + 1} rounds`);
        break;
      }
    }

    // Generate final verdict
    const verdict = await this.generateVerdict(text, analysis, rounds);

    // Calculate debate dynamics
    const debateDynamics = {
      rounds: rounds.length,
      convergenceScore: await this.checkConvergence(rounds),
      controversialTopics: await this.identifyControversialTopics(rounds),
    };

    console.log(`[Multi-Agent Debate] Complete after ${rounds.length} rounds`);

    return {
      participants,
      rounds,
      verdict,
      debateDynamics,
    };
  }

  /**
   * إجراء جولة نقاش واحدة
   */
  private async conductDebateRound(
    roundNumber: number,
    text: string,
    analysis: string,
    _context: any,
    previousRounds: DebateRound[]
  ): Promise<DebateRound> {
    // Build context from previous rounds
    let debateContext = "";
    if (previousRounds.length > 0) {
      debateContext = "\n\nالجولات السابقة:\n";
      previousRounds.forEach((round, index) => {
        debateContext += `\nجولة ${index + 1}:\n`;
        debateContext += `المدعي: ${round.prosecutorArgument.argument.substring(0, 200)}...\n`;
        debateContext += `المدافع: ${round.defenderArgument.argument.substring(0, 200)}...\n`;
      });
    }

    // Prosecutor's argument
    const prosecutorArg = await this.generateProsecutorArgument(
      text,
      analysis,
      debateContext
    );

    // Defender's response
    const defenderArg = await this.generateDefenderArgument(
      text,
      analysis,
      prosecutorArg.argument,
      debateContext
    );

    // Judge's comments
    const judgeComments = await this.generateJudgeComments(
      prosecutorArg,
      defenderArg
    );

    return {
      round: roundNumber,
      prosecutorArgument: prosecutorArg,
      defenderArgument: defenderArg,
      judgeComments,
    };
  }

  /**
   * توليد حجة المدعي
   */
  private async generateProsecutorArgument(
    text: string,
    analysis: string,
    debateContext: string
  ): Promise<DebateArgument> {
    const prompt = `
أنت المدعي الناقد في نقاش علمي حول جودة التحليل.
مهمتك: تحديد نقاط الضعف والأخطاء والتحيزات في التحليل المقدم.

النص الأصلي:
"""
 ${text.substring(0, 2000)}
"""

التحليل المقدم:
"""
 ${analysis.substring(0, 2000)}
"""

 ${debateContext}

قدم حجتك النقدية مع التركيز على:
1. **الأخطاء المنطقية**: هل هناك تناقضات أو قفزات منطقية؟
2. **التحيزات**: هل يظهر التحليل تحيزاً معيناً؟
3. **النقاط غير المدعومة**: ادعاءات بدون دليل كافٍ
4. **الإغفالات**: جوانب مهمة لم يتطرق لها التحليل

قدم إجابتك بالصيغة التالية:
الحجة: [حجتك النقدية الرئيسية]
الأدلة: 
- [دليل 1]
- [دليل 2]
- [دليل 3]
قوة الحجة: [رقم من 0 إلى 10]
`;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.6,
        maxTokens: 2048,
        validator: (value): value is string => typeof value === "string",
      });

      return this.parseDebateArgument(result.content, "المدعي الناقد");
    } catch (error) {
      console.error("Failed to generate prosecutor argument:", error);
      // Return a default argument in case of failure
      return {
        participant: "المدعي الناقد",
        argument: "تعذر إنشاء حجة بسبب خطأ في الخدمة.",
        evidence: [],
        strength: 0,
      };
    }
  }

  /**
   * توليد حجة المدافع
   */
  private async generateDefenderArgument(
    text: string,
    analysis: string,
    prosecutorArgument: string,
    debateContext: string
  ): Promise<DebateArgument> {
    const prompt = `
أنت المدافع البناء في نقاش علمي حول جودة التحليل.
مهمتك: إبراز نقاط القوة والرد على اتهامات المدعي بشكل موضوعي.

النص الأصلي:
"""
 ${text.substring(0, 2000)}
"""

التحليل المقدم:
"""
 ${analysis.substring(0, 2000)}
"""

حجة المدعي:
"""
 ${prosecutorArgument}
"""

 ${debateContext}

قدم دفاعك مع التركيز على:
1. **نقاط القوة**: ما الجيد في هذا التحليل؟
2. **الرد على الاتهامات**: رد موضوعي على نقاط المدعي
3. **السياق المفقود**: جوانب لم يأخذها المدعي بعين الاعتبار
4. **القيمة الإجمالية**: ما القيمة التي يضيفها هذا التحليل؟

قدم إجابتك بالصيغة التالية:
الحجة: [حجتك الدفاعية الرئيسية]
الأدلة:
- [دليل 1]
- [دليل 2]
- [دليل 3]
قوة الحجة: [رقم من 0 إلى 10]
`;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.6,
        maxTokens: 2048,
        validator: (value): value is string => typeof value === "string",
      });

      return this.parseDebateArgument(result.content, "المدافع البناء");
    } catch (error) {
      console.error("Failed to generate defender argument:", error);
      // Return a default argument in case of failure
      return {
        participant: "المدافع البناء",
        argument: "تعذر إنشاء حجة بسبب خطأ في الخدمة.",
        evidence: [],
        strength: 0,
      };
    }
  }

  /**
   * توليد تعليقات القاضي
   */
  private async generateJudgeComments(
    prosecutorArg: DebateArgument,
    defenderArg: DebateArgument
  ): Promise<string> {
    const prompt = `
أنت القاضي الموضوعي في نقاش علمي.
مهمتك: تقييم حجج الطرفين بموضوعية والتعليق على الجولة.

حجة المدعي:
 ${prosecutorArg.argument}

حجة المدافع:
 ${defenderArg.argument}

قدم تعليقاً موجزاً (3-4 جمل) يتضمن:
1. تقييم قوة كل حجة
2. النقاط الصحيحة من كل طرف
3. ما الذي نتفق عليه حتى الآن؟
`;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.3,
        maxTokens: 512,
        validator: (value): value is string => typeof value === "string",
      });
      return result.content;
    } catch (error) {
      console.error("Failed to generate judge comments:", error);
      return "تعذر إنشاء تعليقات القاضي بسبب خطأ في الخدمة.";
    }
  }

  /**
   * توليد الحكم النهائي
   */
  private async generateVerdict(
    _text: string,
    _analysis: string,
    rounds: DebateRound[]
  ): Promise<DebateVerdict> {
    // Build summary of debate
    let debateSummary = "ملخص النقاش:\n\n";
    rounds.forEach((round, index) => {
      debateSummary += `جولة ${index + 1}:\n`;
      debateSummary += `- المدعي: ${round.prosecutorArgument.argument.substring(0, 150)}...\n`;
      debateSummary += `- المدافع: ${round.defenderArgument.argument.substring(0, 150)}...\n`;
      debateSummary += `- تعليق القاضي: ${round.judgeComments.substring(0, 100)}...\n\n`;
    });

    const prompt = `
بصفتك القاضي الموضوعي، قدم حكمك النهائي على التحليل بناءً على النقاش الكامل.

 ${debateSummary}

قدم حكمك بالصيغة التالية (JSON):
{
  "consensusAreas": [
    {
      "aspect": "الجانب المتفق عليه",
      "agreement": "وصف الاتفاق",
      "confidence": 0.9
    }
  ],
  "disputedAreas": [
    {
      "aspect": "الجانب الخلافي",
      "prosecutorView": "رأي المدعي",
      "defenderView": "رأي المدافع",
      "judgeOpinion": "رأيك كقاضي",
      "resolution": "الحل المقترح"
    }
  ],
  "finalVerdict": {
    "overallAssessment": "تقييم شامل للتحليل",
    "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
    "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
    "recommendations": ["توصية 1", "توصية 2"],
    "confidence": 0.85
  }
}
`;

    try {
      const result = await this.geminiService.generate<string>({
        prompt,
        temperature: 0.2,
        maxTokens: 3072,
        validator: (value): value is string => typeof value === "string",
      });

      // Try to parse the JSON result
      return JSON.parse(result.content);
    } catch (error) {
      console.error("Failed to generate verdict:", error);
      // Return a default verdict in case of failure
      return {
        consensusAreas: [],
        disputedAreas: [],
        finalVerdict: {
          overallAssessment: "تعذر إصدار حكم نهائي بسبب خطأ في الخدمة.",
          strengths: [],
          weaknesses: [],
          recommendations: [],
          confidence: 0,
        },
      };
    }
  }

  /**
   * فحص التقارب بين الآراء
   */
  private async checkConvergence(rounds: DebateRound[]): Promise<number> {
    if (rounds.length < 2) return 0;

    // Simple heuristic: compare strength scores
    const lastRound = rounds[rounds.length - 1];
    const prevRound = rounds[rounds.length - 2];

    if (!lastRound || !prevRound) {
      return 0.5; // Return default convergence if rounds are missing
    }

    const lastDiff = Math.abs(
      lastRound.prosecutorArgument.strength -
        lastRound.defenderArgument.strength
    );
    const prevDiff = Math.abs(
      prevRound.prosecutorArgument.strength -
        prevRound.defenderArgument.strength
    );

    // If difference is decreasing, we're converging
    if (lastDiff < prevDiff) {
      return 0.7 + (prevDiff - lastDiff) / 10;
    }

    return 0.3;
  }

  /**
   * تحديد المواضيع الخلافية
   */
  private async identifyControversialTopics(
    rounds: DebateRound[]
  ): Promise<string[]> {
    const topics: string[] = [];

    for (const round of rounds) {
      // Find topics where prosecutor and defender strongly disagree
      const strengthDiff = Math.abs(
        round.prosecutorArgument.strength - round.defenderArgument.strength
      );

      if (strengthDiff > 5) {
        // Extract topic from arguments
        const prosecutorTopics = this.extractTopics(
          round.prosecutorArgument.argument
        );
        const defenderTopics = this.extractTopics(
          round.defenderArgument.argument
        );

        // Find common topics (they're arguing about the same thing)
        const commonTopics = prosecutorTopics.filter((t) =>
          defenderTopics.some((dt) => dt.includes(t) || t.includes(dt))
        );

        topics.push(...commonTopics);
      }
    }

    // Return unique topics
    return [...new Set(topics)].slice(0, 5);
  }

  /**
   * استخراج المواضيع من نص
   */
  private extractTopics(text: string): string[] {
    // Simple keyword extraction
    const keywords = [
      "شخصية",
      "حبكة",
      "حوار",
      "موضوع",
      "بنية",
      "أسلوب",
      "رسالة",
    ];
    return keywords.filter((keyword) => text.includes(keyword));
  }

  /**
   * تحليل حجة من نص
   */
  private parseDebateArgument(
    text: string,
    participant: string
  ): DebateArgument {
    const argumentMatch = /الحجة:\s*([^\n]+(?:\n(?!الأدلة|قوة)[^\n]+)*)/.exec(
      text
    );
    const evidenceMatch = /الأدلة:\s*((?:\n\s*-[^\n]+)+)/.exec(text);
    const strengthMatch = /قوة الحجة:\s*(\d+(?:\.\d+)?)/.exec(text);

    const argument = argumentMatch?.[1]?.trim() ?? text;
    const evidenceText = evidenceMatch?.[1] ?? "";
    const strength = strengthMatch?.[1] ? parseFloat(strengthMatch[1]) : 5;

    // Parse evidence list
    const evidence = evidenceText
      .split("\n")
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter((line) => line.length > 0);

    return {
      participant,
      // Sanitize AI content to prevent XSS
      argument: stripHtmlTags(argument),
      evidence: evidence.map((e) => stripHtmlTags(e)),
      strength,
    };
  }
}

// Export singleton instance
let debateSystemInstance: MultiAgentDebateSystem | null = null;

export function getMultiAgentDebateSystem(
  geminiService: GeminiService
): MultiAgentDebateSystem {
  if (!debateSystemInstance) {
    debateSystemInstance = new MultiAgentDebateSystem(geminiService);
  }
  return debateSystemInstance;
}

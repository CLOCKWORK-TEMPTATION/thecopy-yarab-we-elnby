import { logger } from "@/lib/ai/utils/logger";
import { platformGenAIService } from "@/lib/drama-analyst/services/platformGenAIService";
import { geminiService as dramaAnalystGeminiService } from "@/lib/drama-analyst/services/geminiService";

/**
 * خدمة Gemini لتحليل السيناريوهات وتوليد الميزانيات
 *
 * @description
 * طبقة orchestration رقيقة على `platformGenAIService` الموحّد.
 * مسؤولة عن بناء prompts الميزانية وvalidation بعد الاستجابة — دون إنشاء
 * مزود Gemini مباشرة. يضمن تمرير كل استدعاء عبر provider واحد مع retry/timeout
 * وتحليل JSON مركزي.
 *
 * السبب: توحيد كل استدعاءات Gemini عبر طبقة واحدة تحوي guardrails مركزية،
 * وتجنّب تكرار إنشاء عميل `GoogleGenAI` لكل ميزة من ميزات المنتج.
 */

import { Budget, AIAnalysis, Section, Category, LineItem } from "./types";

/**
 * خطأ API من Gemini
 */
interface GeminiApiError extends Error {
  message: string;
  code?: string;
}

/**
 * النموذج الافتراضي لاستدعاءات الميزانية — دقة عالية لمخرجات JSON المعقدة.
 */
const BUDGET_MODEL = "gemini-2.0-flash-exp";

export class GeminiService {
  private readonly model = BUDGET_MODEL;

  constructor() {
    // تنبيه مبكر في حال عدم تهيئة الطبقة التحتية — الخطأ الفعلي يُرفع عند أول استدعاء.
    if (!dramaAnalystGeminiService.isInitialized()) {
      logger.warn(
        "[GeminiService] platformGenAIService غير مُهيّأ. تأكد من ضبط GEMINI_API_KEY أو NEXT_PUBLIC_GEMINI_API_KEY في ملف البيئة."
      );
    }
  }

  /**
   * توليد ميزانية من السيناريو
   *
   * يحلل نص السيناريو ويُنشئ ميزانية مفصلة باستخدام قالب الميزانية المُقدم.
   * السبب: أتمتة عملية تقدير التكاليف التي تتطلب عادةً خبرة سنوات في الإنتاج.
   */
  async generateBudgetFromScript(
    scriptContent: string,
    template: Budget
  ): Promise<Budget> {
    this.ensureInitialized();

    const prompt = this.buildBudgetPrompt(scriptContent, template);

    try {
      const budget = await platformGenAIService.generateJson<Budget>(prompt, {
        model: this.model,
        temperature: 0.2,
        maxTokens: 8192,
      });
      return this.validateAndFixBudget(budget);
    } catch (error: unknown) {
      if (this.isJsonParseError(error)) {
        const details = error instanceof Error ? error.message : String(error);
        throw new Error(
          `استجابة الذكاء الاصطناعي ليست JSON صالحة (${details}). يرجى المحاولة مرة أخرى.`
        );
      }
      throw this.handleApiError(error);
    }
  }

  /**
   * تحليل شامل للسيناريو من منظور إنتاجي (مخاطر/توصيات/فرص توفير).
   */
  async analyzeScript(scriptContent: string): Promise<AIAnalysis> {
    this.ensureInitialized();

    const prompt = `
      You are a veteran Film Production Analyst and Line Producer with expertise in production planning and budgeting.

      COMPREHENSIVE SCRIPT ANALYSIS:
      Perform an in-depth analysis of this script for production planning purposes.

      SCRIPT:
      ${scriptContent.substring(0, 15000)}

      ANALYSIS FRAMEWORK:

      1. PRODUCTION SUMMARY:
         - Genre and tone identification
         - Production scale assessment
         - Key production challenges
         - Unique requirements or concerns
         - Estimated crew size needed
         - Equipment tier recommendation

      2. DETAILED RECOMMENDATIONS:
         - Optimal shooting schedule structure
         - Location scouting priorities
         - Casting strategy suggestions
         - Equipment package recommendations
         - Post-production workflow advice
         - Budget allocation priorities
         - Cost-saving strategies without compromising quality

      3. RISK FACTORS IDENTIFICATION:
         - Weather-dependent scenes
         - Complex stunt sequences
         - VFX-heavy scenes
         - Difficult locations
         - Large crowd scenes
         - Animal or child actors
         - Night shoots or underwater work
         - Permit or legal concerns
         - Time-sensitive elements

      4. COST OPTIMIZATION OPPORTUNITIES:
         - Location bundling possibilities
         - Schedule efficiency improvements
         - Equipment sharing opportunities
         - Crew multi-tasking potential
         - VFX vs practical effects analysis
         - Stock footage usage possibilities
         - Regional tax incentive opportunities
         - Co-production or partnership options

      5. SHOOTING SCHEDULE ESTIMATION:
         - Count total scenes from script
         - Estimate pages per day (2-5 based on complexity)
         - Calculate total shooting days
         - Recommend prep period (2-4 weeks)
         - Estimate post-production timeline
         - Suggest rehearsal time needed

      Return ONLY a JSON object with this exact structure:
      {
        "summary": "Detailed 3-4 sentence production overview including genre, scale, key challenges, and opportunities",
        "recommendations": [
          "Specific actionable recommendation 1",
          "Specific actionable recommendation 2",
          "Specific actionable recommendation 3",
          "Specific actionable recommendation 4",
          "Specific actionable recommendation 5"
        ],
        "riskFactors": [
          "Identified risk factor 1 with mitigation",
          "Identified risk factor 2 with mitigation",
          "Identified risk factor 3 with mitigation",
          "Identified risk factor 4 with mitigation"
        ],
        "costOptimization": [
          "Cost optimization strategy 1",
          "Cost optimization strategy 2",
          "Cost optimization strategy 3",
          "Cost optimization strategy 4",
          "Cost optimization strategy 5"
        ],
        "shootingSchedule": {
          "totalDays": 25,
          "phases": {
            "preProduction": 20,
            "production": 25,
            "postProduction": 45
          }
        }
      }
    `;

    try {
      return await platformGenAIService.generateJson<AIAnalysis>(prompt, {
        model: this.model,
        temperature: 0.2,
      });
    } catch (error: unknown) {
      if (this.isJsonParseError(error)) {
        const details = error instanceof Error ? error.message : String(error);
        throw new Error(
          `فشل في تحليل استجابة الذكاء الاصطناعي (${details}). يرجى المحاولة مرة أخرى.`
        );
      }
      throw this.handleApiError(error);
    }
  }

  /**
   * بناء موجه توليد الميزانية.
   */
  private buildBudgetPrompt(scriptContent: string, template: Budget): string {
    return `
      You are a world-class Film Line Producer with 30+ years of experience in feature films, commercials, and international productions.

      ADVANCED SCRIPT ANALYSIS TASK:
      Analyze the following movie script and generate an extremely detailed, industry-standard budget breakdown.

      SCRIPT CONTENT:
      ${scriptContent.substring(0, 30000)}

      COMPREHENSIVE ANALYSIS FRAMEWORK:

      1. PRODUCTION SCALE DETECTION:
         - Identify production type (indie, mid-budget, studio)
         - Estimate optimal crew size based on scenes
         - Calculate shooting days from scene count and complexity
         - Determine equipment tier needed

      2. LOCATION ANALYSIS:
         - Count unique locations mentioned
         - Categorize locations (studio, practical, outdoor)
         - Estimate permit costs and location fees
         - Factor in travel and logistics

      3. CAST REQUIREMENTS:
         - Count speaking roles (lead, supporting, day players)
         - Estimate background actors per scene
         - Calculate stunt requirements and coordinators
         - Include casting costs

      4. TECHNICAL REQUIREMENTS:
         - Identify camera packages needed (cinema, DSLR, specialty)
         - Assess lighting requirements per location
         - Determine sound equipment needs
         - Calculate grip and electric crew size

      5. SPECIAL ELEMENTS:
         - VFX shots estimation from script
         - Practical effects and special makeup
         - Vehicle and animal coordination
         - Stunt choreography complexity

      6. POST-PRODUCTION SCOPE:
         - Editing timeline based on footage ratio
         - Color grading complexity
         - Sound design and mixing requirements
         - Music composition vs licensing
         - VFX rendering and compositing time

      BUDGETING METHODOLOGY (2026 RATES):

      ABOVE THE LINE:
      - Director: $50K-$500K (based on scale)
      - Producers: 4-6% of budget
      - Cast: SAG-AFTRA or non-union rates
      - Writers: WGA or independent rates

      PRODUCTION:
      - Crew rates: Union scale or market rate
      - Equipment: Tier 1 ($5K/day), Tier 2 ($2K/day), Tier 3 ($500/day)
      - Locations: $500-$5000/day per location
      - Transportation: Based on crew size and locations

      POST-PRODUCTION:
      - Editing: $200-$500/day for editor
      - VFX: $500-$2000 per shot
      - Sound mix: $300-$800/day
      - Color: $400-$1200/day
      - Music: $5K-$100K based on needs

      INTELLIGENT ESTIMATION RULES:
      - Auto-scale crew size to production scope
      - Match equipment to production value
      - Factor regional cost variations
      - Include prep and wrap time (20% of shooting days)
      - Add insurance (2-3% of budget)
      - Include contingency (10-15% per section)
      - Calculate fringes and taxes (20-35%)

      QUALITY CHECKS:
      1. Verify all amounts are realistic market rates
      2. Ensure ratios are correct (e.g., crew to shoot days)
      3. Cross-check similar productions benchmarks
      4. Validate equipment matches production needs
      5. Confirm post timeline is achievable

      OUTPUT REQUIREMENTS:
      1. Return ONLY valid JSON, no markdown or explanatory text
      2. Maintain exact template structure
      3. All numbers must be positive integers or zero
      4. Calculate: total = amount × rate (verify accuracy)
      5. Sum all totals correctly to grandTotal
      6. Fill metadata with extracted script information

      BUDGET TEMPLATE TO POPULATE:
      ${JSON.stringify(template, null, 2)}

      Generate a professional, accurate, and comprehensive budget based on deep script analysis.
    `;
  }

  /**
   * التحقق من صحة الميزانية وإصلاح أي حسابات خاطئة في المجاميع.
   */
  private validateAndFixBudget(budget: Budget): Budget {
    if (!budget.sections || !Array.isArray(budget.sections)) {
      throw new Error("بنية الميزانية غير صالحة: الأقسام مفقودة");
    }

    let calculatedGrandTotal = 0;

    budget.sections.forEach((section: Section) => {
      let sectionTotal = 0;

      section.categories.forEach((category: Category) => {
        let categoryTotal = 0;

        category.items.forEach((item: LineItem) => {
          item.amount = Number(item.amount) || 0;
          item.rate = Number(item.rate) || 0;
          item.total = item.amount * item.rate;
          categoryTotal += item.total;
        });

        category.total = categoryTotal;
        sectionTotal += categoryTotal;
      });

      section.total = sectionTotal;
      calculatedGrandTotal += sectionTotal;
    });

    budget.grandTotal = calculatedGrandTotal;
    return budget;
  }

  /**
   * معالجة أخطاء API وتحويلها لرسائل عربية واضحة.
   */
  private handleApiError(error: unknown): Error {
    const apiError = error as GeminiApiError;
    const message = apiError.message || "";

    if (message.includes("API key") || message.includes("not initialized")) {
      return new Error(
        "مفتاح API غير صالح أو غير مُهيّأ. يرجى التحقق من إعدادات Gemini API."
      );
    } else if (message.includes("quota")) {
      return new Error(
        "تم تجاوز حصة API. يرجى المحاولة لاحقاً أو التحقق من الفواتير."
      );
    } else if (message.includes("permission")) {
      return new Error("رُفض إذن API. يرجى التأكد من صلاحيات مفتاح Gemini.");
    } else {
      return new Error(
        `فشل توليد الميزانية: ${message || "حدث خطأ غير معروف"}`
      );
    }
  }

  private isJsonParseError(error: unknown): boolean {
    return error instanceof SyntaxError && /JSON/i.test(error.message);
  }

  private ensureInitialized(): void {
    if (!dramaAnalystGeminiService.isInitialized()) {
      throw new Error(
        "مفتاح Gemini API غير موجود. يرجى إعداد GEMINI_API_KEY أو NEXT_PUBLIC_GEMINI_API_KEY في ملف البيئة."
      );
    }
  }

  /**
   * التحقق من بنية الميزانية (utility لا يلمس الـ provider).
   */
  validateBudgetStructure(budget: unknown): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!budget || typeof budget !== "object") {
      errors.push("الميزانية ليست كائناً صالحاً");
      return { isValid: false, errors };
    }

    const budgetObj = budget as Record<string, unknown>;

    if (!Array.isArray(budgetObj.sections)) {
      errors.push("أقسام الميزانية ليست مصفوفة");
    } else {
      (budgetObj.sections as Record<string, unknown>[]).forEach(
        (section: Record<string, unknown>, sectionIndex: number) => {
          if (!section.categories || !Array.isArray(section.categories)) {
            errors.push(`القسم ${sectionIndex}: الفئات ليست مصفوفة`);
          }
        }
      );
    }

    if (typeof budgetObj.grandTotal !== "number") {
      errors.push("المجموع الكلي ليس رقماً");
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * مقارنة ميزانيتين.
   */
  async compareBudgets(
    budget1: Budget,
    budget2: Budget
  ): Promise<Record<string, unknown>> {
    this.ensureInitialized();

    const prompt = `
      You are an expert film production budget analyst. Compare these two film budgets comprehensively.

      Budget 1: ${JSON.stringify(budget1.metadata || {}, null, 2)}
      Grand Total 1: $${budget1.grandTotal.toLocaleString()}

      Budget 2: ${JSON.stringify(budget2.metadata || {}, null, 2)}
      Grand Total 2: $${budget2.grandTotal.toLocaleString()}

      DETAILED COMPARISON ANALYSIS:

      1. COST DIFFERENCES:
         - Identify major cost variations per category
         - Calculate percentage differences
         - Highlight significant variances (>15%)

      2. EFFICIENCY ANALYSIS:
         - Which budget is more cost-effective?
         - Are there areas of over-spending?
         - Are there under-budgeted items?

      3. RECOMMENDATIONS:
         - How to optimize the higher budget
         - What the lower budget might be missing
         - Best practices from both
         - Ideal middle-ground approach

      4. RISK ASSESSMENT:
         - Which budget has better contingency planning?
         - Identify potential cost overruns
         - Safety margin analysis

      Return JSON with structure:
      {
        "totalDifference": 150000,
        "percentageDifference": 15.5,
        "differences": [
          {
            "category": "Production Staff",
            "budget1": 144375,
            "budget2": 180000,
            "difference": 35625,
            "percentage": 24.7,
            "analysis": "Budget 2 allocates more for experienced crew"
          }
        ],
        "recommendations": [
          "Consider hiring mid-level rather than senior staff to save 20%",
          "Budget 1's equipment package seems insufficient for scope"
        ],
        "efficiencyScore": {
          "budget1": 8.5,
          "budget2": 7.2
        },
        "summary": "Comprehensive comparison summary with key insights"
      }
    `;

    return platformGenAIService.generateJson<Record<string, unknown>>(prompt, {
      model: this.model,
      temperature: 0.2,
    });
  }

  /**
   * تحسين الميزانية: اقتراحات تقليل التكاليف مع الحفاظ على جودة الإنتاج.
   */
  async optimizeBudget(
    budget: Budget,
    targetReduction: number
  ): Promise<Record<string, unknown>> {
    this.ensureInitialized();

    const prompt = `
      You are a film production budget optimization expert.

      Current Budget: $${budget.grandTotal.toLocaleString()}
      Target Reduction: $${targetReduction.toLocaleString()} (${((targetReduction / budget.grandTotal) * 100).toFixed(1)}%)

      OPTIMIZATION TASK:
      Analyze the budget and suggest specific cost reductions to meet the target WITHOUT compromising production quality.

      OPTIMIZATION STRATEGIES:
      1. Equipment: Rent vs buy, package deals, tier alternatives
      2. Crew: Multi-role staff, efficient scheduling
      3. Locations: Bundling, studio vs practical
      4. Post-production: Timeline optimization, batch processing
      5. Talent: Negotiation strategies, deferred payments
      6. Schedule: Reducing shoot days through efficiency

      CONSTRAINTS:
      - Maintain production quality standards
      - Don't compromise safety or legal requirements
      - Keep creative vision intact
      - Realistic and actionable suggestions

      Return JSON:
      {
        "recommendations": [
          {
            "category": "Camera Equipment",
            "currentCost": 48125,
            "proposedCost": 35000,
            "savings": 13125,
            "strategy": "Rent cinema package monthly instead of weekly",
            "impact": "Low - same quality, longer term commitment"
          }
        ],
        "totalSavings": 150000,
        "feasibilityScore": 8.5,
        "riskLevel": "low",
        "summary": "Overall optimization strategy summary"
      }
    `;

    return platformGenAIService.generateJson<Record<string, unknown>>(prompt, {
      model: this.model,
      temperature: 0.2,
    });
  }
}

/** مثيل خدمة Gemini المُشترك */
export const geminiService = new GeminiService();

/** توافق رجعي لإصدارات سابقة */
export const generateBudgetFromScript = async (
  scriptContent: string,
  template: Budget
): Promise<Budget> => {
  return geminiService.generateBudgetFromScript(scriptContent, template);
};

/** توافق رجعي لإصدارات سابقة */
export const validateBudgetStructure = (
  budget: unknown
): { isValid: boolean; errors: string[] } => {
  return geminiService.validateBudgetStructure(budget);
};

export { geminiService as default };

/**
 * وكيل المناظرة - Agent Debator
 * 
 * @module agentDebator
 * @description
 * يعالج مشاركة الوكيل الفردي في المناظرات.
 * جزء من المرحلة 3 - نظام المناظرة متعدد الوكلاء
 */

import { BaseAgent } from '../shared/BaseAgent';
import { geminiService } from '@/services/gemini.service';
import { logger } from '@/lib/logger';
import {
  DebateRole,
  DebateArgument,
  Refutation,
} from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * فئة وكيل المناظرة
 * 
 * @description
 * تغلّف BaseAgent للمشاركة في المناظرات.
 * توفر وظائف تقديم الحجج والرد والتصويت.
 */
export class AgentDebator {
  /** الوكيل الأساسي */
  private agent: BaseAgent;
  /** دور الوكيل في المناظرة */
  private role: DebateRole;
  /** سجل حجج المناظرة */
  private debateHistory: DebateArgument[] = [];

  /**
   * منشئ فئة وكيل المناظرة
   * 
   * @param agent - الوكيل الأساسي
   * @param role - دور الوكيل في المناظرة
   */
  constructor(agent: BaseAgent, role: DebateRole) {
    this.agent = agent;
    this.role = role;
  }

  /**
   * الحصول على اسم الوكيل
   * 
   * @returns اسم الوكيل
   */
  getAgentName(): string {
    const config = this.agent.getConfig();
    return config.name;
  }

  /**
   * الحصول على دور الوكيل
   * 
   * @returns دور الوكيل في المناظرة
   */
  getRole(): DebateRole {
    return this.role;
  }

  /**
   * تقديم الحجة الأولية
   * 
   * @description
   * يقوم الوكيل بتقديم حجته حول الموضوع المطروح
   * 
   * @param topic - موضوع المناظرة
   * @param context - السياق الإضافي (اختياري)
   * @param previousArguments - الحجج السابقة (اختياري)
   * @returns وعد بالحجة المقدمة
   */
  async presentArgument(
    topic: string,
    context?: string,
    previousArguments?: DebateArgument[]
  ): Promise<DebateArgument> {
    const agentName = this.getAgentName();
    logger.info("تقديم حجة في المناظرة", { agentName, topic });

    // بناء النص بناءً على الدور
    const prompt = this.buildArgumentPrompt(topic, context, previousArguments);

    try {
      // الحصول على تحليل الوكيل
      const result = await this.agent.executeTask({
        input: prompt,
        options: {
          temperature: 0.7,
          enableRAG: true,
          enableSelfCritique: true,
        },
        context: context || '',
      });

      // تحليل وهيكلة الحجة
      const argument: DebateArgument = {
        id: uuidv4(),
        agentName,
        role: this.role,
        position: result.text,
        reasoning: this.extractReasoning(result.text),
        evidence: this.extractEvidence(result.text),
        confidence: result.confidence,
        referencesTo: previousArguments?.map(arg => arg.id) || [],
        timestamp: new Date(),
      };

      this.debateHistory.push(argument);
      return argument;
    } catch (error) {
      logger.error("فشل في تقديم الحجة", {
        agentName,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
      });

      // حجة احتياطية
      return {
        id: uuidv4(),
        agentName,
        role: this.role,
        position: `عذراً، واجهت صعوبة في تقديم حجة كاملة حول: ${topic}`,
        reasoning: 'خطأ في المعالجة',
        evidence: [],
        confidence: 0.3,
        timestamp: new Date(),
      };
    }
  }

  /**
   * الرد على حجة موجودة
   * 
   * @description
   * يقوم الوكيل بتحليل ونقد حجة موجودة
   * 
   * @param targetArgument - الحجة المستهدفة
   * @param context - السياق الإضافي (اختياري)
   * @returns وعد بالرد على الحجة
   */
  async refuteArgument(
    targetArgument: DebateArgument,
    context?: string
  ): Promise<Refutation> {
    const agentName = this.getAgentName();
    logger.debug("الرد على حجة", {
      agentName,
      targetAgent: targetArgument.agentName,
    });

    const prompt = this.buildRefutationPrompt(targetArgument, context);

    try {
      const result = await this.agent.executeTask({
        input: prompt,
        options: { temperature: 0.7, enableRAG: true, enableSelfCritique: true },
        context: context || '',
      });

      return {
        targetArgumentId: targetArgument.id,
        refutingAgent: agentName,
        counterArgument: result.text,
        evidence: this.extractEvidence(result.text),
        strength: this.calculateRefutationStrength(result.confidence, targetArgument.confidence),
      };
    } catch (error) {
      logger.error("فشل في الرد على الحجة", {
        agentName,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
      });

      return {
        targetArgumentId: targetArgument.id,
        refutingAgent: agentName,
        counterArgument: 'عذراً، واجهت صعوبة في تقديم رد مناسب',
        evidence: [],
        strength: 0.2,
      };
    }
  }

  /**
   * بناء نص الرد على حجة
   */
  private buildRefutationPrompt(
    targetArgument: DebateArgument,
    context?: string
  ): string {
    return `
قم بتحليل ونقد الحجة التالية:

**الحجة الأصلية:**
${targetArgument.position}

**التبرير:**
${targetArgument.reasoning}

**الأدلة:**
${targetArgument.evidence.join('\n')}

قدم رداً منطقياً يتضمن:
1. نقاط الضعف في الحجة
2. حجج مضادة مدعومة بالأدلة
3. تقييم موضوعي لقوة الحجة الأصلية

${context ? `\n**السياق الإضافي:**\n${context}` : ''}
`;
  }

  /**
   * التصويت على الحجج
   *
   * @description
   * يقوم الوكيل بتقييم جميع الحجج وإعطاء درجات
   *
   * @param debateArguments - مصفوفة الحجج المراد تقييمها
   * @param topic - موضوع المناظرة
   * @returns وعد بخريطة الأصوات (معرّف الحجة -> الدرجة)
   */
  async voteOnArguments(
    debateArguments: DebateArgument[],
    topic: string
  ): Promise<Map<string, number>> {
    const agentName = this.getAgentName();
    logger.debug("التصويت على الحجج", { agentName, argumentCount: debateArguments.length });

    const votes = new Map<string, number>();
    const prompt = this.buildVotingPrompt(debateArguments, topic);

    try {
      const result = await geminiService.generateText(prompt, {
        temperature: 0.5,
        maxTokens: 2048,
      });

      this.parseVoteResults(result, debateArguments, votes);
      return votes;
    } catch (error) {
      logger.error("فشل في التصويت", {
        agentName,
        error: error instanceof Error ? error.message : 'خطأ غير معروف',
      });

      debateArguments.forEach(arg => {
        votes.set(arg.id, arg.confidence * 0.7);
      });

      return votes;
    }
  }

  /**
   * بناء نص التصويت
   */
  private buildVotingPrompt(debateArguments: DebateArgument[], topic: string): string {
    return `
بناءً على الموضوع: "${topic}"

قم بتقييم الحجج التالية وأعطِ كل واحدة درجة من 0 إلى 1:

${debateArguments.map((arg, idx) => `
**الحجة ${idx + 1}** (من ${arg.agentName}):
${arg.position}
الثقة: ${arg.confidence}
`).join('\n---\n')}

قدم تقييمك بناءً على:
- القوة المنطقية
- جودة الأدلة
- الصلة بالموضوع
- الشمولية

أعطِ درجة لكل حجة (0-1):
`;
  }

  /**
   * تحليل نتائج التصويت من الاستجابة
   */
  private parseVoteResults(
    result: string,
    debateArguments: DebateArgument[],
    votes: Map<string, number>
  ): void {
    const lines = result.split('\n');
    debateArguments.forEach((arg, idx) => {
      const scoreMatch = lines.find(line =>
        line.includes(`${idx + 1}`) || (arg.agentName && line.includes(arg.agentName))
      );

      if (scoreMatch) {
        const match = scoreMatch.match(/(\d+\.?\d*)/);
        if (match) {
          const score = Math.min(1, Math.max(0, parseFloat(match[1] ?? '0.5')));
          votes.set(arg.id, score);
        }
      }

      if (!votes.has(arg.id)) {
        votes.set(arg.id, arg.confidence * 0.8);
      }
    });
  }

  /**
   * بناء نص الحجة بناءً على الدور
   * 
   * @description
   * يبني النص المناسب للحجة حسب دور الوكيل في المناظرة
   * 
   * @param topic - موضوع المناظرة
   * @param context - السياق الإضافي
   * @param previousArguments - الحجج السابقة
   * @returns نص الحجة المبني
   */
  private buildArgumentPrompt(
    topic: string,
    context?: string,
    previousArguments?: DebateArgument[]
  ): string {
    let prompt = `الموضوع: ${topic}\n\n`;

    if (context) {
      prompt += `السياق:\n${context}\n\n`;
    }

    if (previousArguments && previousArguments.length > 0) {
      prompt += `الحجج السابقة:\n`;
      previousArguments.forEach((arg, idx) => {
        prompt += `\n${idx + 1}. ${arg.agentName} (${arg.role}):\n${arg.position}\n`;
      });
      prompt += '\n';
    }

    switch (this.role) {
      case DebateRole.PROPOSER:
        prompt += 'قدم حجة قوية ومدعومة بالأدلة لدعم موقفك من هذا الموضوع.';
        break;
      case DebateRole.OPPONENT:
        prompt += 'قدم حجة مضادة مدعومة بالأدلة، مع تحليل نقدي للحجج السابقة.';
        break;
      case DebateRole.SYNTHESIZER:
        prompt += 'حلل الحجج المقدمة واستخلص نقاط التوافق والاختلاف، ثم قدم رأياً موحداً.';
        break;
      default:
        prompt += 'قدم تحليلاً متوازناً للموضوع مع عرض وجهات نظر متعددة.';
    }

    return prompt;
  }

  /**
   * استخراج التبرير من النص
   * 
   * @description
   * يبحث عن أنماط التبرير في النص العربي
   * 
   * @param text - النص المراد تحليله
   * @returns التبرير المستخرج
   */
  private extractReasoning(text: string): string {
    // البحث عن أنماط التبرير بالعربية
    const patterns = [
      /لأن[^\.]+\./g,
      /بسبب[^\.]+\./g,
      /نظراً[^\.]+\./g,
      /حيث أن[^\.]+\./g,
    ];

    let reasoning = '';
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        reasoning += matches.join(' ');
      }
    }

    return reasoning || text.substring(0, 200); // احتياطي: أول 200 حرف
  }

  /**
   * استخراج الأدلة من النص
   * 
   * @description
   * يبحث عن النقاط المرقمة والأدلة في النص
   * 
   * @param text - النص المراد تحليله
   * @returns مصفوفة الأدلة المستخرجة
   */
  private extractEvidence(text: string): string[] {
    const evidence: string[] = [];

    // البحث عن النقاط المرقمة أو القوائم
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.match(/^[\-\*\•]\s/) || line.match(/^\d+[\.\)]\s/)) {
        evidence.push(line.trim());
      }
    }

    // إذا لم يتم العثور على أدلة منظمة، استخراج الجمل مع المؤشرات الرئيسية
    if (evidence.length === 0) {
      const sentences = text.match(/[^\.!؟]+[\.!؟]/g) || [];
      const keyPhrases = ['مثل', 'على سبيل المثال', 'الدليل', 'يظهر', 'يوضح', 'تشير'];

      for (const sentence of sentences) {
        if (keyPhrases.some(phrase => sentence.includes(phrase))) {
          evidence.push(sentence.trim());
        }
      }
    }

    return evidence.slice(0, 5); // تحديد بـ 5 أدلة كحد أقصى
  }

  /**
   * حساب قوة الرد
   * 
   * @description
   * يحسب قوة الرد بناءً على ثقة الراد والحجة الأصلية
   * 
   * @param refuterConfidence - ثقة الوكيل المردود
   * @param originalConfidence - ثقة الحجة الأصلية
   * @returns قوة الرد (0-1)
   */
  private calculateRefutationStrength(
    refuterConfidence: number,
    originalConfidence: number
  ): number {
    // ثقة أعلى للراد + ثقة أقل للأصلي = رد أقوى
    return (refuterConfidence + (1 - originalConfidence)) / 2;
  }

  /**
   * الحصول على سجل المناظرة
   * 
   * @returns نسخة من سجل الحجج
   */
  getDebateHistory(): DebateArgument[] {
    return [...this.debateHistory];
  }

  /**
   * مسح سجل المناظرة
   * 
   * @description
   * يمسح جميع الحجج المسجلة للوكيل
   */
  clearHistory(): void {
    this.debateHistory = [];
  }
}

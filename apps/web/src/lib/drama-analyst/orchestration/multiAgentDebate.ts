/**
 * نظام النقاش متعدد الوكلاء
 * Multi-Agent Debate System
 *
 * يسمح لعدة وكلاء بالنقاش والوصول لأفضل حل بشكل تعاوني
 * Based on Multi-Agent Debate research from 2024-2025
 */

import { AgentProposal, DebateResult } from "../core/types";
import { log } from "../services/loggerService";
import { platformGenAIService } from "../services/platformGenAIService";

interface ProposalResponse {
  proposal?: string;
  supportingEvidence?: unknown;
  confidence?: number;
}

interface JudgeResponse {
  decision?: string;
  reasoning?: string;
}

export class MultiAgentDebateSystem {
  private maxRounds: number;
  private consensusThreshold: number;

  constructor(maxRounds: number = 3, consensusThreshold: number = 0.8) {
    this.maxRounds = maxRounds;
    this.consensusThreshold = consensusThreshold;
  }

  /**
   * إجراء نقاش بين وكلاء متعددين
   * Conduct debate between multiple agents
   */
  async conductDebate(
    task: string,
    context: any,
    participatingAgents: string[]
  ): Promise<DebateResult> {
    log.info(
      "Starting multi-agent debate",
      { participatingAgents: participatingAgents.length },
      "MultiAgentDebate"
    );
    log.debug(
      "Multi-agent debate settings",
      { maxRounds: this.maxRounds },
      "MultiAgentDebate"
    );

    const proposals: AgentProposal[] = [];
    let currentRound = 0;
    let consensus = false;

    // Round 1: Initial proposals
    log.info("Debate round started", { round: 1 }, "MultiAgentDebate");
    for (const agentId of participatingAgents) {
      const proposal = await this.generateProposal(
        agentId,
        task,
        context,
        [] // No previous proposals in first round
      );
      proposals.push(proposal);
      log.debug(
        "Agent proposal generated",
        { agentId, confidence: proposal.confidence },
        "MultiAgentDebate"
      );
    }

    // Subsequent rounds: Refinement based on others' proposals
    while (currentRound < this.maxRounds && !consensus) {
      currentRound++;
      log.info(
        "Debate refinement round started",
        { round: currentRound + 1 },
        "MultiAgentDebate"
      );

      const refinedProposals: AgentProposal[] = [];

      for (const agentId of participatingAgents) {
        const refinedProposal = await this.generateProposal(
          agentId,
          task,
          context,
          proposals // Include all previous proposals
        );
        refinedProposals.push(refinedProposal);
      }

      // Check for consensus
      consensus = this.checkConsensus(refinedProposals);
      proposals.push(...refinedProposals);

      if (consensus) {
        log.info("Debate consensus reached", null, "MultiAgentDebate");
        break;
      }
    }

    // Judge makes final decision
    log.info("Debate judge decision started", null, "MultiAgentDebate");
    const finalDecision = await this.judgeDecision(task, proposals, context);

    return {
      proposals,
      finalDecision: finalDecision.decision,
      consensus,
      debateRounds: currentRound + 1,
      judgeReasoning: finalDecision.reasoning,
    };
  }

  /**
   * توليد مقترح من وكيل
   * Generate proposal from an agent
   */
  private async generateProposal(
    agentId: string,
    task: string,
    context: any,
    previousProposals: AgentProposal[]
  ): Promise<AgentProposal> {
    let prompt = `
أنت الوكيل المتخصص: ${agentId}

المهمة المطلوبة:
${task}

السياق:
${JSON.stringify(context, null, 2).substring(0, 2000)}
`;

    if (previousProposals.length > 0) {
      prompt += `\n\nمقترحات الوكلاء الآخرين للاطلاع والبناء عليها:\n`;
      previousProposals.forEach((p, i) => {
        prompt += `\n--- مقترح ${i + 1} من الوكيل ${p.agentId} ---\n`;
        prompt += `${p.proposal.substring(0, 500)}\n`;
        prompt += `الثقة: ${(p.confidence * 100).toFixed(1)}%\n`;
      });
      prompt += `\nبناءً على المقترحات السابقة، قدم مقترحك المحسن أو دافع عن مقترحك الأصلي.\n`;
    } else {
      prompt += `\nقدم مقترحك الأولي للمهمة.\n`;
    }

    prompt += `\nأجب بصيغة JSON فقط:\n{
  "proposal": "مقترحك التفصيلي هنا",
  "supportingEvidence": ["دليل 1", "دليل 2", "دليل 3"],
  "confidence": 0.85
}`;

    try {
      const parsed =
        await platformGenAIService.generateJson<ProposalResponse>(prompt);

      return {
        agentId,
        proposal: parsed.proposal || "",
        supportingEvidence: Array.isArray(parsed.supportingEvidence)
          ? parsed.supportingEvidence
          : [],
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      };
    } catch (error) {
      log.error(
        "Error generating debate proposal",
        { agentId, error },
        "MultiAgentDebate"
      );
      return {
        agentId,
        proposal: "خطأ في توليد المقترح",
        supportingEvidence: [],
        confidence: 0,
      };
    }
  }

  /**
   * فحص التوافق بين المقترحات
   * Check consensus among proposals
   */
  private checkConsensus(proposals: AgentProposal[]): boolean {
    if (proposals.length < 2) return false;

    // Calculate average confidence
    const avgConfidence =
      proposals.reduce((sum, p) => sum + p.confidence, 0) / proposals.length;

    // Check if proposals are converging
    const proposalTexts = proposals.map((p) => p.proposal);
    const similarities = this.calculateSimilarities(proposalTexts);
    const avgSimilarity =
      similarities.length > 0
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length
        : 0;

    log.debug(
      "Debate consensus checked",
      { avgConfidence, avgSimilarity },
      "MultiAgentDebate"
    );

    return avgSimilarity >= this.consensusThreshold && avgConfidence >= 0.8;
  }

  /**
   * حساب التشابه بين النصوص
   * Calculate text similarities using Jaccard index
   */
  private calculateSimilarities(texts: string[]): number[] {
    const similarities: number[] = [];

    for (let i = 0; i < texts.length - 1; i++) {
      const text1 = texts[i];
      const text2 = texts[i + 1];
      if (!text1 || !text2) continue;

      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));

      const intersection = new Set([...words1].filter((x) => words2.has(x)));
      const union = new Set([...words1, ...words2]);

      const similarity = union.size > 0 ? intersection.size / union.size : 0;
      similarities.push(similarity);
    }

    return similarities;
  }

  /**
   * قرار الحكم النهائي
   * Judge's final decision
   */
  private async judgeDecision(
    task: string,
    proposals: AgentProposal[],
    context: any
  ): Promise<{ decision: string; reasoning: string }> {
    const judgePrompt = `
أنت حكم محايد ومتخصص في التطوير الدرامي.

المهمة الأصلية:
${task}

المقترحات المقدمة من الوكلاء:
${proposals
  .map(
    (p, i) => `
━━━━━━━━━━━━━━━━━━━━━━━━━━━
مقترح ${i + 1} (من ${p.agentId}):
${p.proposal}

الأدلة الداعمة:
${p.supportingEvidence.map((e, j) => `  ${j + 1}. ${e}`).join("\n")}

مستوى ثقة الوكيل: ${(p.confidence * 100).toFixed(1)}%
━━━━━━━━━━━━━━━━━━━━━━━━━━━
`
  )
  .join("\n")}

السياق:
${JSON.stringify(context, null, 2).substring(0, 1000)}

مهمتك:
1. قيّم جميع المقترحات بموضوعية
2. اختر المقترح الأفضل، أو ادمج أفضل العناصر من كل مقترح
3. قدم قراراً نهائياً محسّناً

أجب بصيغة JSON:
{
  "decision": "القرار النهائي التفصيلي والمحسّن",
  "reasoning": "شرح تفصيلي لسبب اختيار هذا القرار وكيف تم تقييم المقترحات"
}
`;

    try {
      const parsed =
        await platformGenAIService.generateJson<JudgeResponse>(judgePrompt);
      return {
        decision: parsed.decision || "",
        reasoning: parsed.reasoning || "",
      };
    } catch (error) {
      log.error("Error in debate judge decision", error, "MultiAgentDebate");
      // Fallback: return the proposal with highest confidence
      const bestProposal = proposals.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );
      return {
        decision: bestProposal.proposal,
        reasoning: "استخدام المقترح بأعلى مستوى ثقة (خطأ في قرار الحكم)",
      };
    }
  }

  /**
   * تحديث إعدادات النقاش
   * Update debate settings
   */
  setMaxRounds(rounds: number): void {
    this.maxRounds = Math.max(1, Math.min(rounds, 5)); // 1-5 rounds
  }

  setConsensusThreshold(threshold: number): void {
    this.consensusThreshold = Math.max(0.5, Math.min(threshold, 1.0)); // 0.5-1.0
  }
}

// Export singleton instance
export const multiAgentDebate = new MultiAgentDebateSystem();

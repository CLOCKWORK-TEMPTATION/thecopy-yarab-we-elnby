import { platformGenAIService } from "@/services/platform-genai.service";

interface AgentProposal {
  agentId: string;
  proposal: string;
  supportingEvidence: string[];
  confidence: number;
}

export interface BrainstormDebateResult {
  proposals: AgentProposal[];
  finalDecision: string;
  consensus: boolean;
  debateRounds: number;
  judgeReasoning: string;
}

function computeConsensus(proposals: AgentProposal[]): boolean {
  if (proposals.length < 2) {
    return false;
  }

  const confidences = proposals.map((proposal) => proposal.confidence || 0);
  const averageConfidence =
    confidences.reduce((sum, value) => sum + value, 0) / confidences.length;

  const normalizedTexts = proposals.map((proposal) =>
    proposal.proposal
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter(Boolean),
  );

  const similarities: number[] = [];
  for (let index = 0; index < normalizedTexts.length - 1; index += 1) {
    const current = new Set(normalizedTexts[index]);
    const next = new Set(normalizedTexts[index + 1]);
    const union = new Set([...current, ...next]);
    const intersection = [...current].filter((token) => next.has(token));
    similarities.push(union.size === 0 ? 0 : intersection.length / union.size);
  }

  const averageSimilarity =
    similarities.reduce((sum, value) => sum + value, 0) /
    Math.max(similarities.length, 1);

  return averageConfidence >= 0.75 && averageSimilarity >= 0.45;
}

export class BrainstormService {
  private async generateProposal(
    agentId: string,
    task: string,
    context: Record<string, unknown>,
    previousProposals: AgentProposal[],
  ): Promise<AgentProposal> {
    const prompt = `You are the specialist agent "${agentId}" inside a multi-agent brainstorming debate.

Task:
${task}

Context:
${JSON.stringify(context, null, 2)}

Previous proposals:
${JSON.stringify(previousProposals, null, 2)}

Return ONLY valid JSON with this exact shape:
{
  "proposal": "string",
  "supportingEvidence": ["string"],
  "confidence": 0.0
}`;

    const response = await platformGenAIService.generateJson<{
      proposal?: string;
      supportingEvidence?: string[];
      confidence?: number;
    }>(prompt, { temperature: 0.5, maxOutputTokens: 4096 });

    return {
      agentId,
      proposal: response.proposal ?? "No proposal generated.",
      supportingEvidence: Array.isArray(response.supportingEvidence)
        ? response.supportingEvidence
        : [],
      confidence: Math.max(0, Math.min(1, Number(response.confidence) || 0.5)),
    };
  }

  private async judge(
    task: string,
    context: Record<string, unknown>,
    proposals: AgentProposal[],
  ): Promise<{ decision: string; reasoning: string }> {
    const prompt = `You are the neutral judge in a multi-agent brainstorming debate.

Task:
${task}

Context:
${JSON.stringify(context, null, 2)}

Proposals:
${JSON.stringify(proposals, null, 2)}

Return ONLY valid JSON:
{
  "decision": "string",
  "reasoning": "string"
}`;

    return platformGenAIService.generateJson<{
      decision: string;
      reasoning: string;
    }>(prompt, { temperature: 0.3, maxOutputTokens: 4096 });
  }

  async conductDebate(
    task: string,
    context: Record<string, unknown>,
    agentIds: string[],
  ): Promise<BrainstormDebateResult> {
    const proposals: AgentProposal[] = [];

    for (const agentId of agentIds) {
      proposals.push(await this.generateProposal(agentId, task, context, []));
    }

    const consensus = computeConsensus(proposals);
    const judged = await this.judge(task, context, proposals);

    return {
      proposals,
      finalDecision: judged.decision || "",
      consensus,
      debateRounds: 1,
      judgeReasoning: judged.reasoning || "",
    };
  }
}

export const brainstormService = new BrainstormService();

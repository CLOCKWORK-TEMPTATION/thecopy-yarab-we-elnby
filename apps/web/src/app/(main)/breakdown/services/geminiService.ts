import { logError } from "../domain/errors";
import {
  analyzeProductionScenarios,
  type ScenarioAnalysisOptions,
} from "../infrastructure/gemini/analyze-scenarios";
import { analyzeScene } from "../infrastructure/gemini/analyze-scene";
import { createChatSession } from "../infrastructure/gemini/chat-session";
import { runSingleAgentGeneration } from "../infrastructure/gemini/run-single-agent";
import { segmentScript } from "../infrastructure/gemini/segment-script";

export {
  analyzeScene,
  analyzeProductionScenarios,
  createChatSession,
  segmentScript,
};

export type { ScenarioAnalysisOptions };

export interface SingleAgentAnalysis {
  agentKey: string;
  analysis: string[];
  suggestions: string[];
  warnings: string[];
}

/**
 * تنفيذ تحليل وكيل منفرد.
 *
 * طبقة orchestration رقيقة فوق `runSingleAgentGeneration` من `infrastructure/gemini/`
 * — هذا الملف لم يعد يُنشئ محادثات Gemini مباشرة، بل يفوّض إلى الطبقة التحتية.
 */
export const runSingleAgent = async (
  agentKey: string,
  sceneContent: string
): Promise<SingleAgentAnalysis> => {
  try {
    const result = await runSingleAgentGeneration(agentKey, sceneContent);
    return {
      agentKey,
      ...result,
    };
  } catch (error) {
    logError(`geminiService.runSingleAgent.${agentKey}`, error);
    return {
      agentKey,
      analysis: [],
      suggestions: [],
      warnings: [],
    };
  }
};

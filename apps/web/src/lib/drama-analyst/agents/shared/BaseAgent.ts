import { TaskType } from "@core/types";

import { log } from "../../services/loggerService";
import { platformGenAIService } from "../../services/platformGenAIService";

import {
  StandardAgentInput,
  StandardAgentOptions,
  StandardAgentOutput,
  executeStandardAgentPattern,
} from "./standardAgentPattern";

/**
 * Base Agent Class - النمط القياسي لجميع الوكلاء
 * يطبق: RAG → Self-Critique → Constitutional → Uncertainty → Hallucination → Debate
 * إخراج نصي فقط - لا JSON في الواجهة
 */
export abstract class BaseAgent {
  protected name: string;
  protected taskType: TaskType;
  protected systemPrompt: string;
  protected confidenceFloor = 0.7;

  constructor(name: string, taskType: TaskType, systemPrompt: string) {
    this.name = name;
    this.taskType = taskType;
    this.systemPrompt = systemPrompt;
  }

  /**
   * Execute task with standard agent pattern
   * Input: { input, options, context }
   * Output: { text, confidence, notes } - نصي فقط
   */
  async executeTask(input: StandardAgentInput): Promise<StandardAgentOutput> {
    log.info("Starting task execution", { agentName: this.name }, "BaseAgent");

    try {
      // Build the base prompt from input
      const basePrompt = this.buildPrompt(input);

      // Merge options with agent defaults
      const options: StandardAgentOptions = {
        temperature: input.options?.temperature ?? 0.7,
        maxTokens: input.options?.maxTokens ?? 48192,
        timeout: input.options?.timeout ?? 30000,
        retries: input.options?.retries ?? 2,
        enableCaching: input.options?.enableCaching ?? true,
        enableLogging: input.options?.enableLogging ?? true,
      };

      // Execute standard pattern
      const result = await executeStandardAgentPattern(basePrompt, options, {
        ...(typeof input.context === "object" ? input.context : {}),
        taskType: this.taskType,
        agentName: this.name,
        systemPrompt: this.systemPrompt,
      });

      // Add agent-specific post-processing if needed
      const processedResult = await this.postProcess(result);

      log.info(
        "Task completed",
        { agentName: this.name, confidence: processedResult.confidence },
        "BaseAgent"
      );

      return processedResult;
    } catch (error) {
      log.error(
        "Task execution failed",
        { agentName: this.name, error },
        "BaseAgent"
      );

      // Return graceful fallback - نص بسيط مع ثقة منخفضة
      return {
        text: await this.getFallbackResponse(input),
        confidence: 0.3,
        notes: [
          `خطأ في التنفيذ: ${error instanceof Error ? error.message : "خطأ غير معروف"}`,
        ],
        metadata: {
          ragUsed: false,
          critiqueIterations: 0,
          constitutionalViolations: 0,
          uncertaintyScore: 1.0,
          hallucinationDetected: false,
          debateRounds: 0,
        },
      };
    }
  }

  /**
   * Build the prompt from input - to be implemented by each agent
   */
  protected abstract buildPrompt(input: StandardAgentInput): string;

  /**
   * Optional post-processing - agents can override this
   */
  protected async postProcess(
    output: StandardAgentOutput
  ): Promise<StandardAgentOutput> {
    // Default: no post-processing
    return output;
  }

  /**
   * Generate fallback response when execution fails
   */
  protected async getFallbackResponse(
    input: StandardAgentInput
  ): Promise<string> {
    try {
      // Try simple generation with system prompt only
      const fallbackPrompt = `${this.systemPrompt}\n\nالمهمة: ${input.input}\n\nقدم إجابة مختصرة ومباشرة.`;

      const response = await platformGenAIService.generateText(fallbackPrompt, {
        temperature: 0.5,
        maxTokens: 4096,
      });

      return response || "عذراً، لم أتمكن من إكمال المهمة المطلوبة.";
    } catch {
      return "عذراً، حدث خطأ في معالجة الطلب. يرجى المحاولة مرة أخرى.";
    }
  }

  /**
   * Get agent configuration
   */
  getConfig() {
    return {
      name: this.name,
      taskType: this.taskType,
      confidenceFloor: this.confidenceFloor,
      supportsRAG: true,
      supportsSelfCritique: true,
      supportsConstitutional: true,
      supportsUncertainty: true,
      supportsHallucination: true,
      supportsDebate: true,
    };
  }

  /**
   * Set confidence floor for this agent
   */
  setConfidenceFloor(threshold: number) {
    this.confidenceFloor = Math.max(0, Math.min(1, threshold));
  }
}

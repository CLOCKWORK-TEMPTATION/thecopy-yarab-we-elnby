import type {
  DevelopmentTaskDefinition,
  UnifiedDevelopmentReport,
  AIResponseData,
} from "../types";

interface BrainstormProposal {
  agentId?: string;
  agentName?: string;
  text?: string;
  confidence?: number;
}

interface BrainstormResponse {
  finalDecision?: string;
  judgeReasoning?: string;
  proposals?: BrainstormProposal[];
  metadata?: Record<string, unknown>;
}

interface WorkflowStepOutput {
  text?: string;
  confidence?: number;
}

interface WorkflowStepResult {
  agentId?: string;
  taskType?: string;
  status?: string;
  output?: WorkflowStepOutput;
}

interface WorkflowResponse {
  status?: string;
  results?: Record<string, WorkflowStepResult>;
  metrics?: Record<string, unknown>;
}

function extractBrainstormFinalText(data: BrainstormResponse): string {
  if (data.finalDecision?.trim()) return data.finalDecision;
  if (data.judgeReasoning?.trim()) return data.judgeReasoning;
  if (data.proposals?.length) {
    return data.proposals
      .filter((p) => p.text?.trim())
      .map((p) => p.text)
      .join("\n\n");
  }
  return "";
}

function normalizeBrainstorm(
  raw: BrainstormResponse,
  task: DevelopmentTaskDefinition
): UnifiedDevelopmentReport {
  const finalText = extractBrainstormFinalText(raw);
  const confidence = raw.proposals?.[0]?.confidence;
  const metadata = raw.metadata;

  const aiResponse: AIResponseData = {
    text: finalText,
    raw: JSON.stringify(raw),
    ...(typeof confidence === "number" ? { confidence } : {}),
    ...(metadata ? { metadata } : {}),
  };

  const taskResults: Record<
    string,
    {
      agentName: string;
      agentId: string;
      text: string;
      confidence: number;
      timestamp: string;
    }
  > = {};
  if (raw.proposals) {
    for (const proposal of raw.proposals) {
      if (proposal.agentId && proposal.text?.trim()) {
        taskResults[proposal.agentId] = {
          agentName: proposal.agentName ?? proposal.agentId,
          agentId: proposal.agentId,
          text: proposal.text,
          confidence: proposal.confidence ?? 0,
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  return {
    taskId: task.id,
    executionMode: task.executionMode,
    finalText,
    aiResponse,
    taskResults,
  };
}

function normalizeWorkflow(
  raw: WorkflowResponse,
  task: DevelopmentTaskDefinition
): UnifiedDevelopmentReport {
  const results = raw.results ?? {};
  const finalStep = results[task.finalStepId];
  const finalText = finalStep?.output?.text ?? "";
  const confidence = finalStep?.output?.confidence;
  const metadata = raw.metrics;

  const aiResponse: AIResponseData = {
    text: finalText,
    raw: JSON.stringify(raw),
    ...(typeof confidence === "number" ? { confidence } : {}),
    ...(metadata ? { metadata } : {}),
  };

  const taskResults: Record<
    string,
    {
      agentName: string;
      agentId: string;
      text: string;
      confidence: number;
      timestamp: string;
    }
  > = {};
  for (const [stepId, step] of Object.entries(results)) {
    if (step.status === "completed" && step.output?.text?.trim()) {
      taskResults[stepId] = {
        agentName: step.agentId ?? stepId,
        agentId: step.agentId ?? stepId,
        text: step.output.text,
        confidence: step.output.confidence ?? 0,
        timestamp: new Date().toISOString(),
      };
    }
  }

  return {
    taskId: task.id,
    executionMode: task.executionMode,
    finalText,
    aiResponse,
    taskResults,
  };
}

export function normalizeResult(
  raw: unknown,
  task: DevelopmentTaskDefinition
): UnifiedDevelopmentReport {
  const data =
    typeof raw === "object" && raw !== null
      ? (raw as Record<string, unknown>)
      : {};

  // Workflow responses have a `results` object with step outputs
  if ("results" in data && typeof data["results"] === "object") {
    return normalizeWorkflow(data, task);
  }

  // Brainstorm responses have proposals/finalDecision
  return normalizeBrainstorm(data, task);
}

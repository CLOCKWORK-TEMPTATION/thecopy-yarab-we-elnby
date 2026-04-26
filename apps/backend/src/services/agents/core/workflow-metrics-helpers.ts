/**
 * Helper functions for workflow execution
 */
import {
  WorkflowConfig,
  WorkflowContext,
  WorkflowExecutionPlan,
  WorkflowStage,
  AgentStatus,
  WorkflowMetrics,
} from './workflow-types';

/**
 * Calculate median of an array of numbers
 */
function median(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const middleValue = sorted[mid] ?? 0;

  if (sorted.length % 2 !== 0) {
    return middleValue;
  }

  const previousValue = sorted[mid - 1] ?? middleValue;
  return (previousValue + middleValue) / 2;
}

function roundMetric(value: number, decimals = 6): number {
  return Number(value.toFixed(decimals));
}

/**
 * Build execution plan from workflow config
 */
export function buildExecutionPlan(config: WorkflowConfig): WorkflowExecutionPlan {
  const stages: WorkflowStage[] = [];
  const processedSteps = new Set<string>();
  let stageNumber = 0;

  while (processedSteps.size < config.steps.length) {
    const availableSteps = config.steps.filter((step) => {
      if (processedSteps.has(step.id)) return false;
      return step.dependencies.every((dep) =>
        Array.from(processedSteps).some((id) =>
          config.steps.find((s) => s.id === id && s.agentId === dep.agentId)
        )
      );
    });

    if (availableSteps.length === 0) {
      throw new Error('Circular dependency detected in workflow');
    }

    const parallelSteps = availableSteps.filter((s) => s.parallel);
    const sequentialSteps = availableSteps.filter((s) => !s.parallel);

    if (parallelSteps.length > 0) {
      stages.push({
        stageNumber: stageNumber++,
        steps: parallelSteps,
        dependencies: [],
        canRunInParallel: true,
      });
      parallelSteps.forEach((s) => processedSteps.add(s.id));
    }

    if (sequentialSteps.length > 0) {
      sequentialSteps.forEach((step) => {
        stages.push({
          stageNumber: stageNumber++,
          steps: [step],
          dependencies: [],
          canRunInParallel: false,
        });
        processedSteps.add(step.id);
      });
    }
  }

  return { stages };
}

/**
 * Calculate workflow metrics from execution context
 */
export function calculateWorkflowMetrics(context: WorkflowContext): WorkflowMetrics {
  const results = Array.from(context.results.values());
  const completedResults = results.filter((r) => r.status === AgentStatus.COMPLETED);

  const confidences = completedResults
    .map((r) => r.output?.confidence ?? 0)
    .filter((c) => c > 0);

  const executionTimes = results
    .map((r) => r.duration ?? 0)
    .filter((t) => t > 0);

  const totalTime =
    context.metadata.completedAt && context.metadata.startedAt
      ? context.metadata.completedAt.getTime() - context.metadata.startedAt.getTime()
      : 0;

  return {
    totalExecutionTime: roundMetric(totalTime, 0),
    avgAgentExecutionTime:
      executionTimes.length > 0
        ? roundMetric(executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length)
        : 0,
    parallelizationEfficiency:
      executionTimes.length > 0
        ? roundMetric(totalTime / executionTimes.reduce((a, b) => a + b, 0))
        : 0,
    successRate:
      results.length > 0 ? roundMetric(completedResults.length / results.length) : 0,
    confidenceDistribution: {
      min: confidences.length > 0 ? roundMetric(Math.min(...confidences)) : 0,
      max: confidences.length > 0 ? roundMetric(Math.max(...confidences)) : 0,
      avg:
        confidences.length > 0
          ? roundMetric(confidences.reduce((a, b) => a + b, 0) / confidences.length)
          : 0,
      median: confidences.length > 0 ? roundMetric(median(confidences)) : 0,
    },
  };
}

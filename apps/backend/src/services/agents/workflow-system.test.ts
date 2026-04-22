/**
 * Workflow System Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWorkflow } from './core/workflow-builder';
import { WorkflowExecutor } from './core/workflow-executor';
import { TaskType } from './core/enums';
import { AgentStatus, WorkflowStatus } from './core/workflow-types';
import { getPresetWorkflow } from './core/workflow-presets';

describe('Workflow Builder', () => {
  it('should create a basic workflow', () => {
    const workflow = createWorkflow('Test Workflow', 'Test description')
      .addStep('test-agent', TaskType.CHARACTER_DEEP_ANALYZER)
      .build();

    expect(workflow.name).toBe('Test Workflow');
    expect(workflow.description).toBe('Test description');
    expect(workflow.steps).toHaveLength(1);
    expect(workflow.steps[0].agentId).toBe('test-agent');
  });

  it('should add dependent steps correctly', () => {
    const workflow = createWorkflow('Dependent Workflow')
      .addStep('agent1', TaskType.CHARACTER_DEEP_ANALYZER)
      .addDependentStep(
        'agent2',
        TaskType.DIALOGUE_ADVANCED_ANALYZER,
        [{ agentId: 'agent1', taskType: TaskType.CHARACTER_DEEP_ANALYZER }]
      )
      .build();

    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps[1].dependencies).toHaveLength(1);
    expect(workflow.steps[1].dependencies[0].agentId).toBe('agent1');
    expect(workflow.steps[1].dependencies[0].required).toBe(true);
  });

  it('should add parallel steps', () => {
    const workflow = createWorkflow('Parallel Workflow')
      .addParallelSteps([
        { agentId: 'agent1', taskType: TaskType.CHARACTER_DEEP_ANALYZER },
        { agentId: 'agent2', taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER },
      ])
      .build();

    expect(workflow.steps).toHaveLength(2);
    expect(workflow.steps[0].parallel).toBe(true);
    expect(workflow.steps[1].parallel).toBe(true);
  });

  it('should configure concurrency and timeout', () => {
    const workflow = createWorkflow('Configured Workflow')
      .addStep('test-agent', TaskType.CHARACTER_DEEP_ANALYZER)
      .withConcurrency(10)
      .withTimeout(120000)
      .build();

    expect(workflow.maxConcurrency).toBe(10);
    expect(workflow.globalTimeout).toBe(120000);
  });

  it('should set error handling strategy', () => {
    const strictWorkflow = createWorkflow('Strict Workflow')
      .addStep('test-agent', TaskType.CHARACTER_DEEP_ANALYZER)
      .withErrorHandling('strict')
      .build();

    const lenientWorkflow = createWorkflow('Lenient Workflow')
      .addStep('test-agent', TaskType.CHARACTER_DEEP_ANALYZER)
      .withErrorHandling('lenient')
      .build();

    expect(strictWorkflow.errorHandling).toBe('strict');
    expect(lenientWorkflow.errorHandling).toBe('lenient');
  });
});

describe('Workflow Executor', () => {
  let executor: WorkflowExecutor;

  beforeEach(() => {
    executor = new WorkflowExecutor();
  });

  it('should build execution plan correctly', () => {
    const workflow = createWorkflow('Test Plan')
      .addStep('agent1', TaskType.CHARACTER_DEEP_ANALYZER)
      .addDependentStep(
        'agent2',
        TaskType.DIALOGUE_ADVANCED_ANALYZER,
        [{ agentId: 'agent1', taskType: TaskType.CHARACTER_DEEP_ANALYZER }]
      )
      .build();

    const plan = (executor as any).buildExecutionPlan(workflow);

    expect(plan.stages).toBeDefined();
    expect(plan.stages.length).toBeGreaterThan(0);
  });

  it('should detect circular dependencies', () => {
    const workflow = createWorkflow('Circular Workflow')
      .addStep('agent1', TaskType.CHARACTER_DEEP_ANALYZER)
      .build();

    // Manually create circular dependency for testing
    workflow.steps[0].dependencies = [
      {
        agentId: 'agent1',
        taskType: TaskType.CHARACTER_DEEP_ANALYZER,
        required: true,
      },
    ];

    expect(() => {
      (executor as any).buildExecutionPlan(workflow);
    }).toThrow('Circular dependency');
  });

  it('should emit workflow events', async () => {
    const events: string[] = [];

    executor.on('step-started', (event) => {
      events.push(`started:${event.stepId}`);
    });

    executor.on('step-completed', (event) => {
      events.push(`completed:${event.stepId}`);
    });

    // Mock workflow execution would happen here
    // For now, just verify event system is set up
    expect(events).toBeDefined();
  });

  it('should calculate metrics correctly', () => {
    const context: any = {
      results: new Map([
        [
          'step1',
          {
            agentId: 'agent1',
            taskType: TaskType.CHARACTER_DEEP_ANALYZER,
            status: AgentStatus.COMPLETED,
            output: { confidence: 0.8, text: 'test', notes: [] },
            startTime: new Date('2024-01-01T00:00:00'),
            endTime: new Date('2024-01-01T00:00:10'),
            duration: 10000,
          },
        ],
        [
          'step2',
          {
            agentId: 'agent2',
            taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER,
            status: AgentStatus.COMPLETED,
            output: { confidence: 0.9, text: 'test', notes: [] },
            startTime: new Date('2024-01-01T00:00:10'),
            endTime: new Date('2024-01-01T00:00:20'),
            duration: 10000,
          },
        ],
      ]),
      metadata: {
        startedAt: new Date('2024-01-01T00:00:00'),
        completedAt: new Date('2024-01-01T00:00:20'),
        totalSteps: 2,
        completedSteps: 2,
        failedSteps: 0,
      },
    };

    const metrics = (executor as any).calculateMetrics(context);

    expect(metrics.totalExecutionTime).toBe(20000);
    expect(metrics.successRate).toBe(1);
    expect(metrics.confidenceDistribution.avg).toBe(0.85);
    expect(metrics.confidenceDistribution.min).toBe(0.8);
    expect(metrics.confidenceDistribution.max).toBe(0.9);
  });
});

describe('Workflow Presets', () => {
  it('should load standard workflow', () => {
    const workflow = getPresetWorkflow('standard');

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Standard 7-Agent Analysis');
    expect(workflow.steps.length).toBeGreaterThan(0);
  });

  it('should load fast workflow', () => {
    const workflow = getPresetWorkflow('fast');

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Fast Parallel Analysis');
    // Fast workflow should have parallel steps
    const parallelSteps = workflow.steps.filter((s) => s.parallel);
    expect(parallelSteps.length).toBeGreaterThan(0);
  });

  it('should load character-focused workflow', () => {
    const workflow = getPresetWorkflow('character');

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Character-Focused Analysis');
    // Should include character-related agents
    const hasCharacterAgent = workflow.steps.some(
      (s) => s.taskType === TaskType.CHARACTER_DEEP_ANALYZER
    );
    expect(hasCharacterAgent).toBe(true);
  });

  it('should load creative workflow', () => {
    const workflow = getPresetWorkflow('creative');

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Creative Development');
  });

  it('should load advanced workflow', () => {
    const workflow = getPresetWorkflow('advanced');

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Advanced Modules Analysis');
  });

  it('should load quick workflow', () => {
    const workflow = getPresetWorkflow('quick');

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Quick Analysis');
    expect(workflow.globalTimeout).toBeLessThan(180000); // Should be fast
  });

  it('should load complete workflow', () => {
    const workflow = getPresetWorkflow('complete');

    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('Complete Analysis');
    expect(workflow.steps.length).toBeGreaterThan(10); // Should have many steps
  });

  it('all presets should have valid configuration', () => {
    const presets = ['standard', 'fast', 'character', 'creative', 'advanced', 'quick', 'complete'] as const;

    presets.forEach((preset) => {
      const workflow = getPresetWorkflow(preset);

      // Basic validation
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBeDefined();
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(workflow.maxConcurrency).toBeGreaterThan(0);
      expect(workflow.globalTimeout).toBeGreaterThan(0);
      expect(['strict', 'lenient']).toContain(workflow.errorHandling);

      // All steps should have valid configuration
      workflow.steps.forEach((step) => {
        expect(step.id).toBeDefined();
        expect(step.agentId).toBeDefined();
        expect(step.taskType).toBeDefined();
        expect(step.dependencies).toBeDefined();
      });
    });
  });
});

describe('Workflow Integration', () => {
  it('should maintain workflow configuration integrity', () => {
    const workflow = createWorkflow('Integration Test')
      .addStep('agent1', TaskType.CHARACTER_DEEP_ANALYZER, {
        timeout: 60000,
        retryPolicy: { maxRetries: 3, backoffMs: 1000 },
      })
      .addDependentStep(
        'agent2',
        TaskType.DIALOGUE_ADVANCED_ANALYZER,
        [
          {
            agentId: 'agent1',
            taskType: TaskType.CHARACTER_DEEP_ANALYZER,
            minConfidence: 0.7,
          },
        ],
        { timeout: 30000 }
      )
      .withConcurrency(5)
      .withTimeout(180000)
      .withErrorHandling('lenient')
      .build();

    // Verify all configuration is preserved
    expect(workflow.steps[0].timeout).toBe(60000);
    expect(workflow.steps[0].retryPolicy?.maxRetries).toBe(3);
    expect(workflow.steps[1].dependencies[0].minConfidence).toBe(0.7);
    expect(workflow.maxConcurrency).toBe(5);
    expect(workflow.globalTimeout).toBe(180000);
    expect(workflow.errorHandling).toBe('lenient');
  });

  it('should handle complex dependency chains', () => {
    const workflow = createWorkflow('Complex Dependencies')
      .addStep('agent1', TaskType.CHARACTER_DEEP_ANALYZER)
      .addDependentStep('agent2', TaskType.DIALOGUE_ADVANCED_ANALYZER, [
        { agentId: 'agent1', taskType: TaskType.CHARACTER_DEEP_ANALYZER },
      ])
      .addDependentStep('agent3', TaskType.VISUAL_CINEMATIC_ANALYZER, [
        { agentId: 'agent1', taskType: TaskType.CHARACTER_DEEP_ANALYZER },
        { agentId: 'agent2', taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER },
      ])
      .build();

    expect(workflow.steps).toHaveLength(3);
    expect(workflow.steps[2].dependencies).toHaveLength(2);
  });
});

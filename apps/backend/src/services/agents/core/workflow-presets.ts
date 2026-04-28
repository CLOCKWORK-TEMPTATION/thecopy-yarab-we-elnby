/**
 * Pre-configured Workflows - Common agent workflows for drama analysis
 */

import { TaskType } from "./enums";
import { createWorkflow } from "./workflow-builder";
import { WorkflowConfig } from "./workflow-types";

/**
 * Build the standard 7-agent sequential pipeline steps
 */
function buildStandardAnalysisSteps(
  builder: ReturnType<typeof createWorkflow>,
) {
  const charDep = {
    agentId: "character-deep-analyzer",
    taskType: TaskType.CHARACTER_DEEP_ANALYZER,
  };
  const dialogueDep = {
    agentId: "dialogue-advanced-analyzer",
    taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER,
  };
  const visualDep = {
    agentId: "visual-cinematic-analyzer",
    taskType: TaskType.VISUAL_CINEMATIC_ANALYZER,
  };
  const themesDep = {
    agentId: "themes-messages-analyzer",
    taskType: TaskType.THEMES_MESSAGES_ANALYZER,
  };
  const culturalDep = {
    agentId: "cultural-historical-analyzer",
    taskType: TaskType.CULTURAL_HISTORICAL_ANALYZER,
  };
  const opts = { timeout: 60000 };

  return builder
    .addStep("character-deep-analyzer", TaskType.CHARACTER_DEEP_ANALYZER, opts)
    .addDependentStep(
      "dialogue-advanced-analyzer",
      TaskType.DIALOGUE_ADVANCED_ANALYZER,
      [charDep],
      opts,
    )
    .addDependentStep(
      "visual-cinematic-analyzer",
      TaskType.VISUAL_CINEMATIC_ANALYZER,
      [charDep, dialogueDep],
      opts,
    )
    .addDependentStep(
      "themes-messages-analyzer",
      TaskType.THEMES_MESSAGES_ANALYZER,
      [charDep, dialogueDep],
      opts,
    )
    .addDependentStep(
      "cultural-historical-analyzer",
      TaskType.CULTURAL_HISTORICAL_ANALYZER,
      [themesDep],
      opts,
    )
    .addDependentStep(
      "producibility-analyzer",
      TaskType.PRODUCIBILITY_ANALYZER,
      [visualDep],
      opts,
    )
    .addDependentStep(
      "target-audience-analyzer",
      TaskType.TARGET_AUDIENCE_ANALYZER,
      [themesDep, culturalDep],
      opts,
    );
}

/**
 * Standard 7-Agent Analysis Workflow
 * The core sequential pipeline for comprehensive drama analysis
 */
export function createStandardAnalysisWorkflow(): WorkflowConfig {
  const builder = createWorkflow(
    "Standard 7-Agent Analysis",
    "Sequential execution of 7 core analysis agents",
  );
  return buildStandardAnalysisSteps(builder)
    .withErrorHandling("lenient")
    .withTimeout(600000) // 10 minutes total
    .build();
}

/**
 * Fast Parallel Analysis Workflow
 * Parallel execution for speed when agents are independent
 */
export function createFastParallelWorkflow(): WorkflowConfig {
  return createWorkflow(
    "Fast Parallel Analysis",
    "Parallel execution of independent analyzers for speed",
  )
    .addParallelSteps([
      {
        agentId: "character-deep-analyzer",
        taskType: TaskType.CHARACTER_DEEP_ANALYZER,
      },
      {
        agentId: "themes-messages-analyzer",
        taskType: TaskType.THEMES_MESSAGES_ANALYZER,
      },
      {
        agentId: "cultural-historical-analyzer",
        taskType: TaskType.CULTURAL_HISTORICAL_ANALYZER,
      },
    ])
    .addParallelSteps([
      {
        agentId: "dialogue-advanced-analyzer",
        taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER,
      },
      {
        agentId: "visual-cinematic-analyzer",
        taskType: TaskType.VISUAL_CINEMATIC_ANALYZER,
      },
    ])
    .addDependentStep(
      "target-audience-analyzer",
      TaskType.TARGET_AUDIENCE_ANALYZER,
      [
        {
          agentId: "themes-messages-analyzer",
          taskType: TaskType.THEMES_MESSAGES_ANALYZER,
        },
        {
          agentId: "cultural-historical-analyzer",
          taskType: TaskType.CULTURAL_HISTORICAL_ANALYZER,
        },
      ],
    )
    .withConcurrency(5)
    .withErrorHandling("lenient")
    .withTimeout(300000) // 5 minutes
    .build();
}

/**
 * Character-Focused Workflow
 * Deep dive into character analysis
 */
export function createCharacterFocusedWorkflow(): WorkflowConfig {
  return createWorkflow(
    "Character-Focused Analysis",
    "Deep character analysis with supporting agents",
  )
    .addStep("character-deep-analyzer", TaskType.CHARACTER_DEEP_ANALYZER)
    .addDependentStep("character-network", TaskType.CHARACTER_NETWORK, [
      {
        agentId: "character-deep-analyzer",
        taskType: TaskType.CHARACTER_DEEP_ANALYZER,
      },
    ])
    .addDependentStep("character-voice", TaskType.CHARACTER_VOICE, [
      {
        agentId: "character-deep-analyzer",
        taskType: TaskType.CHARACTER_DEEP_ANALYZER,
      },
    ])
    .addDependentStep("dialogue-forensics", TaskType.DIALOGUE_FORENSICS, [
      { agentId: "character-voice", taskType: TaskType.CHARACTER_VOICE },
      { agentId: "character-network", taskType: TaskType.CHARACTER_NETWORK },
    ])
    .withErrorHandling("strict")
    .build();
}

/**
 * Creative Development Workflow
 * For generating and improving creative content
 */
export function createCreativeDevelopmentWorkflow(): WorkflowConfig {
  return createWorkflow(
    "Creative Development",
    "Generate and refine creative dramatic content",
  )
    .addStep("world-builder", TaskType.WORLD_BUILDER)
    .addDependentStep("scene-generator", TaskType.SCENE_GENERATOR, [
      { agentId: "world-builder", taskType: TaskType.WORLD_BUILDER },
    ])
    .addDependentStep("conflict-dynamics", TaskType.CONFLICT_DYNAMICS, [
      { agentId: "scene-generator", taskType: TaskType.SCENE_GENERATOR },
    ])
    .addDependentStep("tension-optimizer", TaskType.TENSION_OPTIMIZER, [
      { agentId: "conflict-dynamics", taskType: TaskType.CONFLICT_DYNAMICS },
    ])
    .addDependentStep("adaptive-rewriting", TaskType.ADAPTIVE_REWRITING, [
      { agentId: "tension-optimizer", taskType: TaskType.TENSION_OPTIMIZER },
    ])
    .withErrorHandling("lenient")
    .build();
}

/**
 * Advanced Modules Workflow
 * Advanced analysis with specialized modules
 */
export function createAdvancedModulesWorkflow(): WorkflowConfig {
  return createWorkflow(
    "Advanced Modules Analysis",
    "Specialized advanced analysis modules",
  )
    .addParallelSteps([
      { agentId: "plot-predictor", taskType: TaskType.PLOT_PREDICTOR },
      { agentId: "rhythm-mapping", taskType: TaskType.RHYTHM_MAPPING },
      { agentId: "thematic-mining", taskType: TaskType.THEMATIC_MINING },
    ])
    .addParallelSteps([
      { agentId: "style-fingerprint", taskType: TaskType.STYLE_FINGERPRINT },
      {
        agentId: "literary-quality-analyzer",
        taskType: TaskType.LITERARY_QUALITY_ANALYZER,
      },
    ])
    .addDependentStep(
      "recommendations-generator",
      TaskType.RECOMMENDATIONS_GENERATOR,
      [
        {
          agentId: "plot-predictor",
          taskType: TaskType.PLOT_PREDICTOR,
          minConfidence: 0.6,
        },
        {
          agentId: "literary-quality-analyzer",
          taskType: TaskType.LITERARY_QUALITY_ANALYZER,
          minConfidence: 0.6,
        },
      ],
    )
    .withConcurrency(3)
    .build();
}

/**
 * Quick Analysis Workflow
 * Fast basic analysis for rapid feedback
 */
export function createQuickAnalysisWorkflow(): WorkflowConfig {
  return createWorkflow(
    "Quick Analysis",
    "Fast basic analysis for immediate feedback",
  )
    .addParallelSteps([
      {
        agentId: "character-deep-analyzer",
        taskType: TaskType.CHARACTER_DEEP_ANALYZER,
      },
      {
        agentId: "dialogue-advanced-analyzer",
        taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER,
      },
      {
        agentId: "themes-messages-analyzer",
        taskType: TaskType.THEMES_MESSAGES_ANALYZER,
      },
    ])
    .withConcurrency(3)
    .withErrorHandling("lenient")
    .withTimeout(120000) // 2 minutes
    .build();
}

/**
 * Complete Analysis Workflow
 * All available agents in optimal order
 */
export function createCompleteAnalysisWorkflow(): WorkflowConfig {
  return (
    createWorkflow(
      "Complete Analysis",
      "Comprehensive analysis with all available agents",
    )
      // Stage 1: Foundation
      .addStep("character-deep-analyzer", TaskType.CHARACTER_DEEP_ANALYZER)

      // Stage 2: Parallel analysis
      .addParallelSteps([
        {
          agentId: "dialogue-advanced-analyzer",
          taskType: TaskType.DIALOGUE_ADVANCED_ANALYZER,
        },
        {
          agentId: "visual-cinematic-analyzer",
          taskType: TaskType.VISUAL_CINEMATIC_ANALYZER,
        },
        {
          agentId: "themes-messages-analyzer",
          taskType: TaskType.THEMES_MESSAGES_ANALYZER,
        },
      ])

      // Stage 3: Advanced modules
      .addParallelSteps([
        {
          agentId: "cultural-historical-analyzer",
          taskType: TaskType.CULTURAL_HISTORICAL_ANALYZER,
        },
        { agentId: "conflict-dynamics", taskType: TaskType.CONFLICT_DYNAMICS },
        { agentId: "character-network", taskType: TaskType.CHARACTER_NETWORK },
      ])

      // Stage 4: Specialized analysis
      .addParallelSteps([
        { agentId: "plot-predictor", taskType: TaskType.PLOT_PREDICTOR },
        { agentId: "rhythm-mapping", taskType: TaskType.RHYTHM_MAPPING },
        { agentId: "style-fingerprint", taskType: TaskType.STYLE_FINGERPRINT },
      ])

      // Stage 5: Quality & audience
      .addParallelSteps([
        {
          agentId: "producibility-analyzer",
          taskType: TaskType.PRODUCIBILITY_ANALYZER,
        },
        {
          agentId: "literary-quality-analyzer",
          taskType: TaskType.LITERARY_QUALITY_ANALYZER,
        },
        {
          agentId: "target-audience-analyzer",
          taskType: TaskType.TARGET_AUDIENCE_ANALYZER,
        },
      ])

      // Stage 6: Final recommendations
      .addDependentStep(
        "recommendations-generator",
        TaskType.RECOMMENDATIONS_GENERATOR,
        [
          {
            agentId: "literary-quality-analyzer",
            taskType: TaskType.LITERARY_QUALITY_ANALYZER,
          },
          {
            agentId: "target-audience-analyzer",
            taskType: TaskType.TARGET_AUDIENCE_ANALYZER,
          },
        ],
      )

      .withConcurrency(5)
      .withErrorHandling("lenient")
      .withTimeout(900000) // 15 minutes
      .build()
  );
}

/**
 * Workflow registry for easy access
 */
export const PRESET_WORKFLOWS = {
  standard: createStandardAnalysisWorkflow,
  fast: createFastParallelWorkflow,
  character: createCharacterFocusedWorkflow,
  creative: createCreativeDevelopmentWorkflow,
  advanced: createAdvancedModulesWorkflow,
  quick: createQuickAnalysisWorkflow,
  complete: createCompleteAnalysisWorkflow,
} as const;

export type PresetWorkflowName = keyof typeof PRESET_WORKFLOWS;

/**
 * Get a preset workflow by name
 */
export function getPresetWorkflow(name: PresetWorkflowName): WorkflowConfig {
  return PRESET_WORKFLOWS[name]();
}

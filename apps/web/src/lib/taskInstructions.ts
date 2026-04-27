/**
 * Task Instructions and Configuration
 */

export interface TaskInstruction {
  id: string;
  category: string;
  type: string;
  title: string;
  description: string;
  instructions: string[];
  examples?: string[];
  parameters?: Record<string, unknown>;
  validation?: {
    required?: string[];
    optional?: string[];
    constraints?: Record<string, unknown>;
  };
}

export interface TaskInstructions {
  character: TaskInstruction[];
  scene: TaskInstruction[];
  script: TaskInstruction[];
  general: TaskInstruction[];
  integrated: TaskInstruction[];
  core: TaskInstruction[];
  predictive: TaskInstruction[];
  advanced_modules: TaskInstruction[];
  analysis: TaskInstruction[];
  creative: TaskInstruction[];
}

// Character analysis instructions
export const characterInstructions: TaskInstruction[] = [
  {
    id: "character-analysis",
    category: "character",
    type: "analysis",
    title: "Character Analysis",
    description: "Analyze character traits, motivations, and development",
    instructions: [
      "Identify the main character traits",
      "Analyze character motivations",
      "Track character development arc",
      "Identify relationships with other characters",
    ],
    examples: [
      "Main character shows growth from selfish to selfless",
      "Supporting character provides comic relief",
    ],
  },
  {
    id: "character-voice",
    category: "character",
    type: "analysis",
    title: "Character Voice Analysis",
    description: "Analyze character dialogue and speech patterns",
    instructions: [
      "Identify unique speech patterns",
      "Analyze vocabulary usage",
      "Note cultural or regional influences",
      "Track consistency in voice",
    ],
  },
];

// Scene analysis instructions
export const sceneInstructions: TaskInstruction[] = [
  {
    id: "scene-structure",
    category: "scene",
    type: "analysis",
    title: "Scene Structure Analysis",
    description: "Analyze scene structure and pacing",
    instructions: [
      "Identify scene purpose and function",
      "Analyze scene structure",
      "Evaluate pacing and timing",
      "Assess visual elements",
    ],
  },
  {
    id: "scene-dialogue",
    category: "scene",
    type: "analysis",
    title: "Scene Dialogue Analysis",
    description: "Analyze dialogue within scenes",
    instructions: [
      "Evaluate dialogue effectiveness",
      "Analyze character interactions",
      "Assess exposition delivery",
      "Review subtext and implications",
    ],
  },
];

// Script analysis instructions
export const scriptInstructions: TaskInstruction[] = [
  {
    id: "script-structure",
    category: "script",
    type: "analysis",
    title: "Script Structure Analysis",
    description: "Analyze overall script structure and narrative",
    instructions: [
      "Analyze three-act structure",
      "Identify plot points",
      "Evaluate character arcs",
      "Assess theme development",
    ],
  },
  {
    id: "script-dialogue",
    category: "script",
    type: "analysis",
    title: "Script Dialogue Analysis",
    description: "Analyze dialogue throughout the script",
    instructions: [
      "Evaluate dialogue authenticity",
      "Analyze character voice consistency",
      "Assess exposition techniques",
      "Review subtext and implications",
    ],
  },
];

// General analysis instructions
export const generalInstructions: TaskInstruction[] = [
  {
    id: "theme-analysis",
    category: "general",
    type: "analysis",
    title: "Theme Analysis",
    description: "Analyze themes and messages",
    instructions: [
      "Identify central themes",
      "Analyze theme development",
      "Evaluate message effectiveness",
      "Assess audience resonance",
    ],
  },
  {
    id: "audience-analysis",
    category: "general",
    type: "analysis",
    title: "Target Audience Analysis",
    description: "Analyze target audience and market appeal",
    instructions: [
      "Define target demographic",
      "Analyze audience expectations",
      "Evaluate market potential",
      "Assess cultural relevance",
    ],
  },
];

// Integrated analysis instructions
export const integratedInstructions: TaskInstruction[] = [
  {
    id: "integrated-analysis",
    category: "integrated",
    type: "analysis",
    title: "Integrated Analysis",
    description: "Comprehensive multi-dimensional analysis",
    instructions: [
      "Combine character, scene, and script analysis",
      "Evaluate narrative coherence",
      "Assess thematic integration",
      "Review overall effectiveness",
    ],
  },
];

// Core analysis instructions
export const coreInstructions: TaskInstruction[] = [
  {
    id: "core-analysis",
    category: "core",
    type: "analysis",
    title: "Core Analysis",
    description: "Essential fundamental analysis",
    instructions: [
      "Identify core narrative elements",
      "Analyze essential character traits",
      "Evaluate fundamental structure",
      "Assess basic effectiveness",
    ],
  },
];

// Predictive analysis instructions
export const predictiveInstructions: TaskInstruction[] = [
  {
    id: "predictive-analysis",
    category: "predictive",
    type: "analysis",
    title: "Predictive Analysis",
    description: "Predict audience and market response",
    instructions: [
      "Predict audience engagement",
      "Forecast market performance",
      "Identify potential issues",
      "Suggest improvements",
    ],
  },
];

// Advanced modules instructions
export const advancedModulesInstructions: TaskInstruction[] = [
  {
    id: "advanced-analysis",
    category: "advanced_modules",
    type: "analysis",
    title: "Advanced Analysis",
    description: "Advanced analytical techniques",
    instructions: [
      "Apply advanced analytical methods",
      "Use sophisticated metrics",
      "Implement complex algorithms",
      "Generate detailed reports",
    ],
  },
];

// Analysis instructions
export const analysisInstructions: TaskInstruction[] = [
  {
    id: "comprehensive-analysis",
    category: "analysis",
    type: "analysis",
    title: "Comprehensive Analysis",
    description: "Complete thorough analysis",
    instructions: [
      "Conduct thorough examination",
      "Apply multiple analytical methods",
      "Generate comprehensive report",
      "Provide actionable insights",
    ],
  },
];

// Creative instructions
export const creativeInstructions: TaskInstruction[] = [
  {
    id: "creative-analysis",
    category: "creative",
    type: "analysis",
    title: "Creative Analysis",
    description: "Analyze creative elements",
    instructions: [
      "Evaluate creative choices",
      "Assess artistic merit",
      "Analyze innovation",
      "Review creative effectiveness",
    ],
  },
];

// Combine all instructions
export const taskInstructions: TaskInstructions = {
  character: characterInstructions,
  scene: sceneInstructions,
  script: scriptInstructions,
  general: generalInstructions,
  integrated: integratedInstructions,
  core: coreInstructions,
  predictive: predictiveInstructions,
  advanced_modules: advancedModulesInstructions,
  analysis: analysisInstructions,
  creative: creativeInstructions,
};

// Helper functions
export function getTaskInstructions(
  category: keyof TaskInstructions
): TaskInstruction[] {
  return taskInstructions[category] || [];
}

export function getTaskInstruction(id: string): TaskInstruction | undefined {
  for (const category of Object.keys(
    taskInstructions
  ) as (keyof TaskInstructions)[]) {
    const instruction = taskInstructions[category].find(
      (inst) => inst.id === id
    );
    if (instruction) return instruction;
  }
  return undefined;
}

export function getAllTaskInstructions(): TaskInstruction[] {
  return Object.values(taskInstructions).flat();
}

// Default export
const TaskInstructionsExport = {
  taskInstructions,
  getTaskInstructions,
  getTaskInstruction,
  getAllTaskInstructions,
};

export default TaskInstructionsExport;

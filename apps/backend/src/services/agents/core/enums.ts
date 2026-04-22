/**
 * Enums for drama analysis agent system - Backend
 */

export enum TaskType {
  // Analysis tasks
  ANALYSIS = "analysis",
  CHARACTER_ANALYSIS = "character-analysis",
  CHARACTER_DEEP_ANALYZER = "character-deep-analyzer",
  PLOT_ANALYSIS = "plot-analysis",
  THEME_ANALYSIS = "theme-analysis",
  DIALOGUE_ANALYSIS = "dialogue-analysis",
  DIALOGUE_ADVANCED_ANALYZER = "dialogue-advanced-analyzer",
  DIALOGUE_FORENSICS = "dialogue-forensics",
  STRUCTURE_ANALYSIS = "structure-analysis",
  VISUAL_CINEMATIC_ANALYZER = "visual-cinematic-analyzer",
  THEMES_MESSAGES_ANALYZER = "themes-messages-analyzer",
  THEMATIC_MINING = "thematic-mining",
  CULTURAL_HISTORICAL_ANALYZER = "cultural-historical-analyzer",
  PRODUCIBILITY_ANALYZER = "producibility-analyzer",
  TARGET_AUDIENCE_ANALYZER = "target-audience-analyzer",
  LITERARY_QUALITY_ANALYZER = "literary-quality-analyzer",

  // Creative tasks
  CREATIVE = "creative",
  CHARACTER_DEVELOPMENT = "character-development",
  CHARACTER_VOICE = "character-voice",
  CHARACTER_NETWORK = "character-network",
  PLOT_DEVELOPMENT = "plot-development",
  PLOT_PREDICTOR = "plot-predictor",
  DIALOGUE_ENHANCEMENT = "dialogue-enhancement",
  SCENE_EXPANSION = "scene-expansion",
  SCENE_GENERATOR = "scene-generator",
  CONFLICT_ENHANCEMENT = "conflict-enhancement",
  CONFLICT_DYNAMICS = "conflict-dynamics",
  COMPLETION = "completion",
  ADAPTIVE_REWRITING = "adaptive-rewriting",
  WORLD_BUILDER = "world-builder",
  TENSION_OPTIMIZER = "tension-optimizer",
  RHYTHM_MAPPING = "rhythm-mapping",
  STYLE_FINGERPRINT = "style-fingerprint",

  // Predictive tasks
  AUDIENCE_RESONANCE = "audience-resonance",
  PLATFORM_ADAPTER = "platform-adapter",

  // Other tasks
  INTEGRATED = "integrated",
  RECOMMENDATIONS_GENERATOR = "recommendations-generator",
  GENERAL = "general",
  CUSTOM = "custom",
}

export enum TaskCategory {
  CORE = "core",
  ANALYSIS = "analysis",
  CREATIVE = "creative",
  PREDICTIVE = "predictive",
  ADVANCED_MODULES = "advanced_modules",
  INTEGRATED = "integrated",
  TECHNICAL = "technical",
  RESEARCH = "research",
  REVIEW = "review",
  GENERAL = "general",
}

export enum AgentType {
  ANALYST = "analyst",
  WRITER = "writer",
  EDITOR = "editor",
  RESEARCHER = "researcher",
}

export enum TaskStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

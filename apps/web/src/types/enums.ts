/**
 * TypeScript Enums and Type Definitions
 */

// Task categories
export enum TaskCategoryEnum {
  CHARACTER = "character",
  SCENE = "scene",
  SCRIPT = "script",
  GENERAL = "general",
  INTEGRATED = "integrated",
  CORE = "core",
  PREDICTIVE = "predictive",
  ADVANCED_MODULES = "advanced_modules",
  ANALYSIS = "analysis",
  CREATIVE = "creative",
}

// Task types
export enum TaskTypeEnum {
  CHARACTER = "character",
  SCENE = "scene",
  SCRIPT = "script",
  GENERAL = "general",
  INTEGRATED = "integrated",
  CORE = "core",
  PREDICTIVE = "predictive",
  ADVANCED_MODULES = "advanced_modules",
  ANALYSIS = "analysis",
  CREATIVE = "creative",
  COMPLETION = "completion",
  ADAPTIVE_REWRITING = "adaptive_rewriting",
  SCENE_GENERATOR = "scene_generator",
  CHARACTER_VOICE = "character_voice",
  WORLD_BUILDER = "world_builder",
  PLOT_PREDICTOR = "plot_predictor",
  TENSION_OPTIMIZER = "tension_optimizer",
  RHYTHM_MAPPING = "rhythm_mapping",
  CHARACTER_NETWORK = "character_network",
  DIALOGUE_FORENSICS = "dialogue_forensics",
  THEMATIC_MINING = "thematic_mining",
  STYLE_FINGERPRINT = "style_fingerprint",
  CONFLICT_DYNAMICS = "conflict_dynamics",
  CHARACTER_DEEP_ANALYZER = "character_deep_analyzer",
  DIALOGUE_ADVANCED_ANALYZER = "dialogue_advanced_analyzer",
  VISUAL_CINEMATIC_ANALYZER = "visual_cinematic_analyzer",
  THEMES_MESSAGES_ANALYZER = "themes_messages_analyzer",
  CULTURAL_HISTORICAL_ANALYZER = "cultural_historical_analyzer",
  PRODUCIBILITY_ANALYZER = "producibility_analyzer",
  TARGET_AUDIENCE_ANALYZER = "target_audience_analyzer",
  LITERARY_QUALITY_ANALYZER = "literary_quality_analyzer",
  RECOMMENDATIONS_GENERATOR = "recommendations_generator",
}

// Enhancement levels
export enum EnhancementLevelEnum {
  MINIMAL = "minimal",
  MODERATE = "moderate",
  EXTENSIVE = "extensive",
}

// Project status
export enum ProjectStatusEnum {
  ACTIVE = "active",
  ARCHIVED = "archived",
  DRAFT = "draft",
}

// AI Models
export enum AIModelEnum {
  GEMINI_PRO = "gemini-pro",
  GEMINI_FLASH = "gemini-flash",
  GPT_4 = "gpt-4",
  GPT_3_5 = "gpt-3.5",
}

// File types
export enum FileTypeEnum {
  PDF = "pdf",
  DOCX = "docx",
  TXT = "txt",
  PNG = "png",
  JPG = "jpg",
  JPEG = "jpeg",
}

// Content types
export enum ContentTypeEnum {
  TEXT = "text",
  IMAGE = "image",
  VIDEO = "video",
  AUDIO = "audio",
  DOCUMENT = "document",
}

// Error types
export enum ErrorTypeEnum {
  NETWORK = "network",
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  NOT_FOUND = "not_found",
  SERVER_ERROR = "server_error",
  TIMEOUT = "timeout",
  RATE_LIMIT = "rate_limit",
}

// Log levels
export enum LogLevelEnum {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  FATAL = "fatal",
}

// Environment types
export enum EnvironmentEnum {
  DEVELOPMENT = "development",
  STAGING = "staging",
  PRODUCTION = "production",
  TEST = "test",
}

// HTTP Methods
export enum HttpMethodEnum {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  PATCH = "PATCH",
  DELETE = "DELETE",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
}

// Response status
export enum ResponseStatusEnum {
  SUCCESS = "success",
  ERROR = "error",
  WARNING = "warning",
  INFO = "info",
}

// Cache strategies
export enum CacheStrategyEnum {
  NO_CACHE = "no-cache",
  NETWORK_FIRST = "network-first",
  CACHE_FIRST = "cache-first",
  STALE_WHILE_REVALIDATE = "stale-while-revalidate",
}

// Database operations
export enum DatabaseOperationEnum {
  CREATE = "create",
  READ = "read",
  UPDATE = "update",
  DELETE = "delete",
  BATCH = "batch",
  TRANSACTION = "transaction",
}

// Queue types
export enum QueueTypeEnum {
  HIGH_PRIORITY = "high-priority",
  NORMAL = "normal",
  LOW_PRIORITY = "low-priority",
  BACKGROUND = "background",
}

// Job status
export enum JobStatusEnum {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
  RETRYING = "retrying",
  CANCELLED = "cancelled",
}

// Webhook events
export enum WebhookEventEnum {
  USER_CREATED = "user.created",
  USER_UPDATED = "user.updated",
  USER_DELETED = "user.deleted",
  PROJECT_CREATED = "project.created",
  PROJECT_UPDATED = "project.updated",
  PROJECT_DELETED = "project.deleted",
  SCENE_CREATED = "scene.created",
  SCENE_UPDATED = "scene.updated",
  SCENE_DELETED = "scene.deleted",
  ANALYSIS_COMPLETED = "analysis.completed",
  ANALYSIS_FAILED = "analysis.failed",
}

// Notification types
export enum NotificationTypeEnum {
  EMAIL = "email",
  SMS = "sms",
  PUSH = "push",
  IN_APP = "in-app",
  WEBHOOK = "webhook",
}

// Subscription status
export enum SubscriptionStatusEnum {
  ACTIVE = "active",
  CANCELLED = "cancelled",
  PAST_DUE = "past_due",
  UNPAID = "unpaid",
  TRIALING = "trialing",
  PAUSED = "paused",
}

// Feature flags
export enum FeatureFlagEnum {
  AI_ANALYSIS = "ai-analysis",
  REAL_TIME_COLLABORATION = "real-time-collaboration",
  ADVANCED_EXPORT = "advanced-export",
  CUSTOM_INTEGRATIONS = "custom-integrations",
  PREMIUM_SUPPORT = "premium-support",
  ENTERPRISE_FEATURES = "enterprise-features",
}

// Analysis types for AI pipeline
export enum AnalysisTypeEnum {
  CHARACTERS = "characters",
  THEMES = "themes",
  STRUCTURE = "structure",
  SCREENPLAY = "screenplay",
  QUICK = "quick",
  DETAILED = "detailed",
  FULL = "full",
}

// Export all enums as const objects for better tree-shaking
export const TaskCategory = TaskCategoryEnum;
export const TaskType = TaskTypeEnum;
export const EnhancementLevel = EnhancementLevelEnum;
export const ProjectStatus = ProjectStatusEnum;
export const AIModel = AIModelEnum;
export const FileType = FileTypeEnum;
export const ContentType = ContentTypeEnum;
export const ErrorType = ErrorTypeEnum;
export const LogLevel = LogLevelEnum;
export const Environment = EnvironmentEnum;
export const HttpMethod = HttpMethodEnum;
export const ResponseStatus = ResponseStatusEnum;
export const CacheStrategy = CacheStrategyEnum;
export const DatabaseOperation = DatabaseOperationEnum;
export const QueueType = QueueTypeEnum;
export const JobStatus = JobStatusEnum;
export const WebhookEvent = WebhookEventEnum;
export const NotificationType = NotificationTypeEnum;
export const SubscriptionStatus = SubscriptionStatusEnum;
export const FeatureFlag = FeatureFlagEnum;
export const AnalysisType = AnalysisTypeEnum;

// Export types
export type TaskCategory = TaskCategoryEnum;
export type TaskType = TaskTypeEnum;
export type EnhancementLevel = EnhancementLevelEnum;
export type ProjectStatus = ProjectStatusEnum;
export type AIModel = AIModelEnum;
export type FileType = FileTypeEnum;
export type ContentType = ContentTypeEnum;
export type ErrorType = ErrorTypeEnum;
export type LogLevel = LogLevelEnum;
export type Environment = EnvironmentEnum;
export type HttpMethod = HttpMethodEnum;
export type ResponseStatus = ResponseStatusEnum;
export type CacheStrategy = CacheStrategyEnum;
export type DatabaseOperation = DatabaseOperationEnum;
export type QueueType = QueueTypeEnum;
export type JobStatus = JobStatusEnum;
export type WebhookEvent = WebhookEventEnum;
export type NotificationType = NotificationTypeEnum;
export type SubscriptionStatus = SubscriptionStatusEnum;
export type FeatureFlag = FeatureFlagEnum;
export type AnalysisType = AnalysisTypeEnum;

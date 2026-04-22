/**
 * Memory System Configuration
 * إعدادات نظام الذاكرة
 */

import { definedProps } from "@/utils/defined-props";

export interface MemoryConfig {
  // Gemini Settings
  geminiApiKey: string;
  defaultEmbeddingModel: string;
  defaultDimensionality: 768 | 1536 | 3072;

  // Weaviate Settings
  weaviateUrl: string;
  weaviateApiKey?: string;

  // Indexing Settings
  repoPath: string;
  maxFileSize: number;
  maxFilesPerCrawl: number;
  includePatterns: string[];
  excludePatterns: string[];

  // Context Settings
  maxContextTokens: number;
  defaultTopK: number;
  recencyBias: number;

  // Git Settings
  enableGitWatcher: boolean;
  gitPollIntervalMs: number;
}

export const defaultConfig: MemoryConfig = {
  geminiApiKey: process.env['GEMINI_API_KEY'] || process.env['GOOGLE_GENAI_API_KEY'] || "",
  defaultEmbeddingModel: "gemini-embedding-2-preview",
  defaultDimensionality: 1536,

  weaviateUrl: process.env['WEAVIATE_URL'] || "http://localhost:8080",
  ...definedProps({
    weaviateApiKey: process.env['WEAVIATE_API_KEY'],
  }),

  repoPath: process.env['REPO_PATH'] || ".",
  maxFileSize: 5 * 1024 * 1024,
  maxFilesPerCrawl: 10000,
  includePatterns: [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.json",
    "**/*.md",
    "**/*.yaml",
    "**/*.yml",
  ],
  excludePatterns: [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/*.min.js",
    "**/*.map",
    "**/coverage/**",
  ],

  maxContextTokens: 8000,
  defaultTopK: 15,
  recencyBias: 0.3,

  enableGitWatcher: true,
  gitPollIntervalMs: 5000,
};

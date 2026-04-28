"use client";

import type { ToolInput, ToolId } from "../../core/toolConfigs";
import type { ArtDirectorExecutionResult } from "../../hooks/useArtDirectorPersistence";
import type { PluginInfo } from "../../types";

export type FormData = Record<string, string>;
export type ExecutionResult = ArtDirectorExecutionResult;

export interface InputFieldProps {
  input: ToolInput;
  value: string;
  onChange: (name: string, value: string) => void;
}

export interface FormFieldsProps {
  inputs: ToolInput[];
  formData: FormData;
  onFieldChange: (name: string, value: string) => void;
}

export interface CSSPropertiesWithVars extends React.CSSProperties {
  "--tool-color"?: string;
}

export interface ToolItemProps {
  plugin: PluginInfo;
  isActive: boolean;
  onClick: () => void;
}

export interface ToolsSidebarProps {
  plugins: PluginInfo[];
  selectedTool: ToolId | null;
  onToolSelect: (toolId: ToolId) => void;
}

export interface ExecutionResultProps {
  selectedTool: ToolId;
  result: ExecutionResult;
}

export interface VisualIssue {
  type: string;
  severity: "low" | "medium" | "high";
  description?: string;
  descriptionAr?: string;
  location?: string;
  suggestion?: string;
}

export interface VisualAnalysisData {
  consistent: boolean;
  score: number;
  issues: VisualIssue[];
  suggestions: string[];
}

export interface ErrorAlertProps {
  message: string;
}

export interface ToolWorkspaceProps {
  selectedTool: ToolId;
  plugin: PluginInfo;
  formData: FormData;
  result: ExecutionResult | null;
  loading: boolean;
  error: string | null;
  onFieldChange: (name: string, value: string) => void;
  onExecute: () => void;
}

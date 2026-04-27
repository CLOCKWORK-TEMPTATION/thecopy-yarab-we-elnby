import React from 'react';

/**
 * قيم metadata المقبولة — primitives قابلة للتحويل النصي مباشرة عبر String()
 * أو الإقحام النصي ${value}. أي بنية أعمق يجب تسطيحها قبل التمرير.
 */
export type AgentReportMetadataValue =
  | string
  | number
  | boolean
  | null
  | undefined;

export interface AgentReport {
  agentName: string;
  agentId: string;
  text: string;
  confidence: number;
  notes?: string[];
  timestamp?: string;
  metadata?: Record<string, AgentReportMetadataValue>;
}

export interface AgentReportViewerProps {
  report: AgentReport;
  trigger?: React.ReactNode;
}

export interface AgentReportsExporterProps {
  reports: AgentReport[];
  projectTitle?: string;
}

export const AgentReportViewer: React.FC<AgentReportViewerProps>;
export function AgentReportsExporter(props: AgentReportsExporterProps): JSX.Element;
export function exportAgentReport(report: AgentReport): void;
export function exportAllAgentReports(reports: AgentReport[], projectTitle?: string): void;

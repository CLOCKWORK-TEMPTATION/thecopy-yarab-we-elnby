import React from 'react';

export interface AgentReportsExporterProps {
  reports: Record<string, any>;
  originalText?: string;
  onExport?: (format: 'txt' | 'json') => void;
}

export const AgentReportsExporter: React.FC<AgentReportsExporterProps>;

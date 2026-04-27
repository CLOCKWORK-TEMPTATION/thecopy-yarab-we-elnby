import React from 'react';

export interface AgentReportsExporterProps {
  /**
   * خريطة تقارير الوكلاء — القيمة قد تكون نصًا (تُكتب كما هي) أو كائنًا
   * (يُسلسَل عبر JSON.stringify). نُبقي النوع `unknown` لإجبار المستهلك
   * على التحقق من الشكل قبل الاستخدام بدلًا من قبول `any`.
   */
  reports: Record<string, unknown>;
  originalText?: string;
  onExport?: (format: 'txt' | 'json') => void;
}

export const AgentReportsExporter: React.FC<AgentReportsExporterProps>;

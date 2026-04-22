"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface AgentReportsExporterProps {
  reports: Record<string, any>;
  originalText?: string;
  onExport?: (format: string) => void;
}

export const AgentReportsExporter: React.FC<AgentReportsExporterProps> = ({
  reports,
  originalText,
  onExport,
}) => {
  const { toast } = useToast();

  const handleExport = (format: "txt" | "json") => {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === "json") {
        content = JSON.stringify({ reports, originalText }, null, 2);
        filename = `agent-reports-${Date.now()}.json`;
        mimeType = "application/json";
      } else {
        // Text format
        const sections: string[] = [
          "===========================================",
          "تقرير التحليل الإبداعي - جميع الوكلاء",
          "===========================================",
          "",
        ];

        if (originalText) {
          sections.push("## النص الأصلي");
          sections.push("-------------------------------------------");
          sections.push(originalText);
          sections.push("");
        }

        sections.push("## نتائج التحليل");
        sections.push("-------------------------------------------");

        Object.entries(reports).forEach(([agentId, report]) => {
          sections.push(`### ${agentId}`);
          sections.push(
            typeof report === "string"
              ? report
              : JSON.stringify(report, null, 2)
          );
          sections.push("");
        });

        sections.push("===========================================");
        sections.push("نهاية التقرير");
        sections.push("===========================================");

        content = sections.join("\n");
        filename = `agent-reports-${Date.now()}.txt`;
        mimeType = "text/plain;charset=utf-8";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (onExport) {
        onExport(format);
      }

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير التقرير بصيغة ${format.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "فشل التصدير",
        description:
          error instanceof Error ? error.message : "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    }
  };

  const hasReports = Object.keys(reports).length > 0;

  return (
    <div className="flex gap-2">
      <Button
        onClick={() => handleExport("txt")}
        disabled={!hasReports}
        variant="outline"
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        تصدير نصي
      </Button>
      <Button
        onClick={() => handleExport("json")}
        disabled={!hasReports}
        variant="outline"
        className="gap-2"
      >
        <Download className="h-4 w-4" />
        تصدير JSON
      </Button>
    </div>
  );
};

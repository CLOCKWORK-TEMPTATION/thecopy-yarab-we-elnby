"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Download, Eye, FileText } from "lucide-react";
import { toText } from "@/ai/gemini-core";

// =====================================================
// Types
// =====================================================

export interface AgentReport {
  agentName: string;
  agentId: string;
  text: string;
  confidence: number;
  notes?: string[];
  timestamp?: string;
  metadata?: Record<string, any>;
}

interface AgentReportViewerProps {
  report: AgentReport;
  trigger?: React.ReactNode;
}

interface AgentReportsExporterProps {
  reports: AgentReport[];
  projectTitle?: string;
}

// =====================================================
// Helper Functions
// =====================================================

function exportToTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatSingleReport(report: AgentReport): string {
  const lines: string[] = [];

  lines.push("=".repeat(60));
  lines.push(`تقرير الوكيل: ${report.agentName}`);
  lines.push("=".repeat(60));
  lines.push("");

  if (report.timestamp) {
    lines.push(`التاريخ: ${report.timestamp}`);
    lines.push("");
  }

  lines.push(`مستوى الثقة: ${(report.confidence * 100).toFixed(0)}%`);
  lines.push("");

  lines.push("--- التحليل ---");
  lines.push("");
  lines.push(toText(report.text));
  lines.push("");

  if (report.notes && report.notes.length > 0) {
    lines.push("--- ملاحظات ---");
    report.notes.forEach((note) => {
      lines.push(`• ${note}`);
    });
    lines.push("");
  }

  if (report.metadata) {
    lines.push("--- معلومات إضافية ---");
    Object.entries(report.metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        lines.push(`${key}: ${value}`);
      }
    });
    lines.push("");
  }

  lines.push("=".repeat(60));
  lines.push("");

  return lines.join("\n");
}

function formatAllReports(
  reports: AgentReport[],
  projectTitle?: string
): string {
  const lines: string[] = [];

  lines.push("═".repeat(80));
  lines.push("═".repeat(80));
  lines.push("");
  lines.push("           التقرير النهائي الشامل - التطوير الإبداعي");
  lines.push("");
  lines.push("═".repeat(80));
  lines.push("═".repeat(80));
  lines.push("");

  if (projectTitle) {
    lines.push(`المشروع: ${projectTitle}`);
    lines.push("");
  }

  lines.push(`التاريخ: ${new Date().toLocaleString("ar")}`);
  lines.push(`عدد الوكلاء المستخدمة: ${reports.length}`);
  lines.push("");

  // Summary
  lines.push("═".repeat(80));
  lines.push("الملخص التنفيذي");
  lines.push("═".repeat(80));
  lines.push("");

  const avgConfidence =
    reports.reduce((sum, r) => sum + r.confidence, 0) / reports.length;
  lines.push(`متوسط الثقة: ${(avgConfidence * 100).toFixed(0)}%`);

  const highConfidenceCount = reports.filter((r) => r.confidence >= 0.8).length;
  const mediumConfidenceCount = reports.filter(
    (r) => r.confidence >= 0.6 && r.confidence < 0.8
  ).length;
  const lowConfidenceCount = reports.filter((r) => r.confidence < 0.6).length;

  lines.push("");
  lines.push("توزيع مستويات الثقة:");
  lines.push(`  • عالية (≥80%): ${highConfidenceCount} وكيل`);
  lines.push(`  • متوسطة (60-79%): ${mediumConfidenceCount} وكيل`);
  lines.push(`  • منخفضة (<60%): ${lowConfidenceCount} وكيل`);
  lines.push("");

  // Individual reports
  lines.push("═".repeat(80));
  lines.push("التقارير الفردية");
  lines.push("═".repeat(80));
  lines.push("");

  reports.forEach((report, index) => {
    lines.push(`\n\n${"─".repeat(80)}`);
    lines.push(`الوكيل ${index + 1} من ${reports.length}`);
    lines.push("─".repeat(80));
    lines.push("");
    lines.push(formatSingleReport(report));
  });

  // Footer
  lines.push("");
  lines.push("═".repeat(80));
  lines.push("نهاية التقرير");
  lines.push("═".repeat(80));
  lines.push("");
  lines.push("تم إنشاء هذا التقرير بواسطة نظام التطوير الإبداعي الذكي");
  lines.push("");

  return lines.join("\n");
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-500";
  if (confidence >= 0.6) return "bg-yellow-500";
  return "bg-red-500";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "عالية";
  if (confidence >= 0.6) return "متوسطة";
  return "منخفضة";
}

// =====================================================
// Single Report Viewer Component
// =====================================================

export function AgentReportViewer({ report, trigger }: AgentReportViewerProps) {
  const [open, setOpen] = useState(false);

  const handleExport = () => {
    const content = formatSingleReport(report);
    const filename = `${report.agentId}-${Date.now()}.txt`;
    exportToTextFile(content, filename);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <Eye className="h-4 w-4" />
      عرض التقرير
    </Button>
  );

  return (
    <>
      <div onClick={() => setOpen(true)} className="inline-block">
        {trigger || defaultTrigger}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {report.agentName}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2 pt-2">
              <Badge
                variant="outline"
                className={`${getConfidenceColor(report.confidence)} text-white`}
              >
                الثقة: {(report.confidence * 100).toFixed(0)}%
              </Badge>
              <Badge variant="secondary">
                {getConfidenceLabel(report.confidence)}
              </Badge>
              {report.timestamp && (
                <span className="text-sm text-muted-foreground">
                  {report.timestamp}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[50vh] w-full rounded-md border p-4">
            <div className="space-y-4">
              {/* Main Content */}
              <div>
                <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                  التحليل
                </h3>
                <div
                  className="whitespace-pre-wrap text-sm"
                  dir="rtl"
                  style={{ fontFamily: "inherit" }}
                >
                  {toText(report.text)}
                </div>
              </div>

              {/* Notes */}
              {report.notes && report.notes.length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    ملاحظات
                  </h3>
                  <ul className="space-y-1">
                    {report.notes.map((note, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-primary">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata */}
              {report.metadata && Object.keys(report.metadata).length > 0 && (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-2">
                    معلومات إضافية
                  </h3>
                  <div className="space-y-1 text-sm">
                    {Object.entries(report.metadata).map(([key, value]) => (
                      <div key={key} className="flex gap-2">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              تصدير التقرير
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =====================================================
// Multiple Reports Exporter Component
// =====================================================

export function AgentReportsExporter({
  reports,
  projectTitle,
}: AgentReportsExporterProps) {
  const handleExportAll = () => {
    if (reports.length === 0) {
      alert("لا توجد تقارير للتصدير");
      return;
    }

    const content = formatAllReports(reports, projectTitle);
    const filename = `final-report-${Date.now()}.txt`;
    exportToTextFile(content, filename);
  };

  const avgConfidence =
    reports.length > 0
      ? reports.reduce((sum, r) => sum + r.confidence, 0) / reports.length
      : 0;

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
      <div className="flex-1">
        <h3 className="font-semibold text-lg">التقرير النهائي الشامل</h3>
        <p className="text-sm text-muted-foreground">
          {reports.length} تقرير • متوسط الثقة:{" "}
          {(avgConfidence * 100).toFixed(0)}%
        </p>
      </div>
      <Button
        onClick={handleExportAll}
        disabled={reports.length === 0}
        size="lg"
        className="gap-2"
      >
        <Download className="h-5 w-5" />
        تصدير التقرير النهائي
      </Button>
    </div>
  );
}

// =====================================================
// Export Helper (can be used independently)
// =====================================================

export function exportAgentReport(report: AgentReport): void {
  const content = formatSingleReport(report);
  const filename = `${report.agentId}-${Date.now()}.txt`;
  exportToTextFile(content, filename);
}

export function exportAllAgentReports(
  reports: AgentReport[],
  projectTitle?: string
): void {
  const content = formatAllReports(reports, projectTitle);
  const filename = `final-report-${Date.now()}.txt`;
  exportToTextFile(content, filename);
}

/**
 * Cast Agent Exporter
 * Export functions for analysis results in various formats
 */

import type { AnalysisResult } from "./types";

// ============================================
// CSV EXPORT
// ============================================

/**
 * Export analysis result as CSV format
 */
export const exportToCSV = (analysis: AnalysisResult): string => {
  const headers = [
    "Name",
    "Role",
    "Gender Conflict",
    "Dialogue Lines",
    "Mentions",
    "Active Scenes",
    "Word Count",
    "Importance Score",
  ];

  let csv = headers.join(",") + "\n";

  analysis.characters.forEach((c) => {
    const row = [
      `"${c.name}"`,
      c.roleType,
      c.genderConflict ? "YES" : "NO",
      c.dialogueCount,
      c.mentionCount,
      c.scenes.length,
      c.wordCount,
      c.importanceScore.toFixed(2),
    ];
    csv += row.join(",") + "\n";
  });

  return csv;
};

// ============================================
// JSON EXPORT
// ============================================

/**
 * Export analysis result as formatted JSON
 */
export const exportToJSON = (analysis: AnalysisResult): string => {
  return JSON.stringify(analysis, null, 2);
};

// ============================================
// TEXT REPORT EXPORT
// ============================================

/**
 * Export analysis result as a human-readable text report
 */
export const exportToTXT = (analysis: AnalysisResult): string => {
  const lines: string[] = [];
  const separator = "=".repeat(50);
  const subSeparator = "-".repeat(50);

  lines.push("CAST BREAKDOWN REPORT");
  lines.push(separator);
  lines.push("");
  lines.push(`Total Characters: ${analysis.characters.length}`);
  lines.push(`Total Scenes: ${analysis.totalScenes}`);
  lines.push("");
  lines.push(subSeparator);
  lines.push("");

  analysis.characters.forEach((c, i) => {
    lines.push(`${i + 1}. ${c.name} (${c.roleType})`);
    lines.push(
      `   Gender: ${c.gender || "Unknown"}${c.genderConflict ? " ⚠️ CONFLICT" : ""}`
    );
    lines.push(`   Dialogue: ${c.dialogueCount} lines (${c.wordCount} words)`);
    lines.push(`   Scenes: ${c.scenes.join(", ") || "None"}`);
    if (c.tags?.length) {
      lines.push(`   Tags: ${c.tags.join(", ")}`);
    }
    lines.push("");
  });

  return lines.join("\n");
};

// ============================================
// CASTING CALL DOCUMENT
// ============================================

/**
 * Generate a professional casting call document
 */
export const generateCastingCall = (analysis: AnalysisResult): string => {
  const lines: string[] = [];
  const separator = "=".repeat(50);
  const subSeparator = "-".repeat(30);

  lines.push("CASTING CALL DOCUMENT");
  lines.push(separator);
  lines.push("");

  const leads = analysis.characters.filter((c) => c.roleType === "Lead");
  const supporting = analysis.characters.filter(
    (c) => c.roleType === "Supporting"
  );

  if (leads.length > 0) {
    lines.push("LEAD ROLES");
    lines.push(subSeparator);

    leads.forEach((c) => {
      lines.push("");
      lines.push(`${c.name} (${c.gender}, ${c.age || "Any Age"})`);
      lines.push(`Description: ${c.description || "N/A"}`);
      lines.push(`Importance Score: ${c.importanceScore.toFixed(1)}`);
    });
  }

  if (supporting.length > 0) {
    lines.push("");
    lines.push("");
    lines.push("SUPPORTING ROLES");
    lines.push(subSeparator);

    supporting.forEach((c) => {
      lines.push("");
      lines.push(`${c.name} (${c.gender}, ${c.age || "Any Age"})`);
      lines.push(`${c.description || "N/A"}`);
    });
  }

  return lines.join("\n");
};

// ============================================
// FILE DOWNLOAD UTILITY
// ============================================

/**
 * Trigger browser download for exported data
 */
export const downloadFile = (
  content: string,
  filename: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

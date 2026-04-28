import type { CastMember, ExtendedCastMember, CastAnalysisResult } from "../types/cast-breakdown-types";

export function exportCastToCSV(members: CastMember[] | ExtendedCastMember[]): string {
  const headers = ["Name", "Arabic Name", "Role", "Age", "Gender", "Description", "Motivation"];
  const rows = members.map((member) => {
    const extended = member as ExtendedCastMember;
    return [
      member.name,
      extended.nameArabic ?? "",
      extended.roleCategory || member.role,
      extended.ageRange || member.age,
      member.gender,
      `"${(extended.visualDescription || member.description || "").replace(/"/g, '""')}"`,
      `"${(member.motivation || "").replace(/"/g, '""')}"`,
    ];
  });
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function exportCastToJSON(result: CastAnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function generateCastingCall(members: CastMember[] | ExtendedCastMember[]): string {
  let documentText = "CASTING CALL DOCUMENT\n";
  documentText += `${"=".repeat(50)}\n\n`;

  const leads = members.filter(
    (m) => (m as ExtendedCastMember).roleCategory === "Lead" || m.role === "Lead"
  );
  const supporting = members.filter(
    (m) => (m as ExtendedCastMember).roleCategory === "Supporting" || m.role === "Supporting"
  );

  if (leads.length > 0) {
    documentText += "LEAD ROLES\n";
    documentText += `${"-".repeat(30)}\n`;
    leads.forEach((member) => {
      const extended = member as ExtendedCastMember;
      documentText += `\n${member.name.toUpperCase()} (${member.gender}, ${extended.ageRange || member.age})\n`;
      documentText += `Description: ${extended.visualDescription || member.description || "N/A"}\n`;
      documentText += `In this scene: ${member.motivation || "N/A"}\n`;
    });
  }

  if (supporting.length > 0) {
    documentText += "\n\nSUPPORTING ROLES\n";
    documentText += `${"-".repeat(30)}\n`;
    supporting.forEach((member) => {
      const extended = member as ExtendedCastMember;
      documentText += `\n${member.name} (${member.gender}, ${extended.ageRange || member.age})\n`;
      documentText += `${extended.visualDescription || member.description || "N/A"}\n`;
    });
  }

  return documentText;
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

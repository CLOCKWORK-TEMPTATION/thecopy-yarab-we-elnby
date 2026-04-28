// Cast Export Utilities

import type {
  CastMember,
  ExtendedCastMember,
  CastAnalysisResult,
} from "../../domain/models";

/**
 * Export cast members as CSV
 */
export const exportCastToCSV = (
  members: CastMember[] | ExtendedCastMember[]
): string => {
  const headers = [
    "Name",
    "Arabic Name",
    "Role",
    "Age",
    "Gender",
    "Description",
    "Motivation",
  ];
  const rows = members.map((m) => {
    const extended = m;
    return [
      m.name,
      extended.nameArabic ?? "",
      extended.roleCategory || m.role,
      extended.ageRange || m.age,
      m.gender,
      `"${(extended.visualDescription || m.description || "").replace(/"/g, '""')}"`,
      `"${(m.motivation || "").replace(/"/g, '""')}"`,
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
};

/**
 * Export cast members as JSON
 */
export const exportCastToJSON = (result: CastAnalysisResult): string => {
  return JSON.stringify(result, null, 2);
};

/**
 * Generate a casting call document
 */
export const generateCastingCall = (
  members: CastMember[] | ExtendedCastMember[]
): string => {
  let doc = "CASTING CALL DOCUMENT\n";
  doc += "=".repeat(50) + "\n\n";

  const leads = members.filter(
    (m) => m.roleCategory === "Lead" || m.role === "Lead"
  );
  const supporting = members.filter(
    (m) => m.roleCategory === "Supporting" || m.role === "Supporting"
  );

  if (leads.length > 0) {
    doc += "LEAD ROLES\n";
    doc += "-".repeat(30) + "\n";
    leads.forEach((m) => {
      const extended = m;
      doc += `\n${m.name.toUpperCase()} (${m.gender}, ${extended.ageRange || m.age})\n`;
      doc += `Description: ${extended.visualDescription || m.description || "N/A"}\n`;
      doc += `In this scene: ${m.motivation || "N/A"}\n`;
    });
  }

  if (supporting.length > 0) {
    doc += "\n\nSUPPORTING ROLES\n";
    doc += "-".repeat(30) + "\n";
    supporting.forEach((m) => {
      const extended = m;
      doc += `\n${m.name} (${m.gender}, ${extended.ageRange || m.age})\n`;
      doc += `${extended.visualDescription || m.description || "N/A"}\n`;
    });
  }

  return doc;
};

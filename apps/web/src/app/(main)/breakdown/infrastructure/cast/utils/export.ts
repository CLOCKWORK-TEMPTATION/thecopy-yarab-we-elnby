// Cast Export Utilities

import type {
  CastMember,
  ExtendedCastMember,
  CastAnalysisResult,
} from "../../../domain/models";

type CastExportMember = CastMember | ExtendedCastMember;

function isExtendedCastMember(
  member: CastExportMember
): member is ExtendedCastMember {
  return "roleCategory" in member;
}

function getRole(member: CastExportMember): string {
  return isExtendedCastMember(member) ? member.roleCategory : member.role;
}

function getAge(member: CastExportMember): string {
  return isExtendedCastMember(member) ? member.ageRange : member.age;
}

function getVisualDescription(member: CastExportMember): string {
  return isExtendedCastMember(member)
    ? member.visualDescription
    : member.description;
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

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
    return [
      m.name,
      isExtendedCastMember(m) ? (m.nameArabic ?? "") : "",
      getRole(m),
      getAge(m),
      m.gender,
      escapeCsv(getVisualDescription(m)),
      escapeCsv(m.motivation),
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

  const leads = members.filter((m) => getRole(m) === "Lead");
  const supporting = members.filter((m) => getRole(m) === "Supporting");

  if (leads.length > 0) {
    doc += "LEAD ROLES\n";
    doc += "-".repeat(30) + "\n";
    leads.forEach((m) => {
      doc += `\n${m.name.toUpperCase()} (${m.gender}, ${getAge(m)})\n`;
      doc += `Description: ${getVisualDescription(m) || "N/A"}\n`;
      doc += `In this scene: ${m.motivation || "N/A"}\n`;
    });
  }

  if (supporting.length > 0) {
    doc += "\n\nSUPPORTING ROLES\n";
    doc += "-".repeat(30) + "\n";
    supporting.forEach((m) => {
      doc += `\n${m.name} (${m.gender}, ${getAge(m)})\n`;
      doc += `${getVisualDescription(m) || "N/A"}\n`;
    });
  }

  return doc;
};

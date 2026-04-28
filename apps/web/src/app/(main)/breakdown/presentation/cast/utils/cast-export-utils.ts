import type {
  CastMember,
  ExtendedCastMember,
  CastAnalysisResult,
} from "../types/cast-breakdown-types";

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

export function exportCastToCSV(
  members: CastMember[] | ExtendedCastMember[]
): string {
  const headers = [
    "Name",
    "Arabic Name",
    "Role",
    "Age",
    "Gender",
    "Description",
    "Motivation",
  ];
  const rows = members.map((member) => {
    return [
      member.name,
      isExtendedCastMember(member) ? (member.nameArabic ?? "") : "",
      getRole(member),
      getAge(member),
      member.gender,
      escapeCsv(getVisualDescription(member)),
      escapeCsv(member.motivation),
    ];
  });
  return [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
}

export function exportCastToJSON(result: CastAnalysisResult): string {
  return JSON.stringify(result, null, 2);
}

export function generateCastingCall(
  members: CastMember[] | ExtendedCastMember[]
): string {
  let documentText = "CASTING CALL DOCUMENT\n";
  documentText += `${"=".repeat(50)}\n\n`;

  const leads = members.filter((member) => getRole(member) === "Lead");
  const supporting = members.filter(
    (member) => getRole(member) === "Supporting"
  );

  if (leads.length > 0) {
    documentText += "LEAD ROLES\n";
    documentText += `${"-".repeat(30)}\n`;
    leads.forEach((member) => {
      documentText += `\n${member.name.toUpperCase()} (${member.gender}, ${getAge(member)})\n`;
      documentText += `Description: ${getVisualDescription(member) || "N/A"}\n`;
      documentText += `In this scene: ${member.motivation || "N/A"}\n`;
    });
  }

  if (supporting.length > 0) {
    documentText += "\n\nSUPPORTING ROLES\n";
    documentText += `${"-".repeat(30)}\n`;
    supporting.forEach((member) => {
      documentText += `\n${member.name} (${member.gender}, ${getAge(member)})\n`;
      documentText += `${getVisualDescription(member) || "N/A"}\n`;
    });
  }

  return documentText;
}

export function downloadFile(
  content: string,
  filename: string,
  mimeType: string
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

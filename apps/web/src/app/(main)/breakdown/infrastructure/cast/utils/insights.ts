// Cast Insights Generation Utilities

import type {
  ExtendedCastMember,
  CastAnalysisResult,
} from "../../domain/models";

/**
 * Calculate age range distribution
 */
export function calculateAgeRanges(
  members: ExtendedCastMember[]
): Record<string, number> {
  const ranges: Record<string, number> = {};

  members.forEach((member) => {
    const age = member.ageRange || "Unknown";
    ranges[age] = (ranges[age] ?? 0) + 1;
  });

  return ranges;
}

/**
 * Generate insights about the cast composition
 */
export function generateCastInsights(
  _members: ExtendedCastMember[],
  summary: CastAnalysisResult["summary"]
): string[] {
  const insights: string[] = [];

  if (summary.totalCharacters === 0) {
    insights.push("No characters detected in the scene.");
    return insights;
  }

  // Gender balance insight
  const genderRatio = summary.maleCount / (summary.femaleCount ?? 1);
  if (genderRatio > 2) {
    insights.push(
      `Male-dominated cast: ${summary.maleCount} male vs ${summary.femaleCount} female characters.`
    );
  } else if (genderRatio < 0.5) {
    insights.push(
      `Female-dominated cast: ${summary.femaleCount} female vs ${summary.maleCount} male characters.`
    );
  } else {
    insights.push("Balanced gender representation in the cast.");
  }

  // Lead characters insight
  if (summary.leadCount > 3) {
    insights.push(`Ensemble cast with ${summary.leadCount} lead characters.`);
  } else if (summary.leadCount === 1) {
    insights.push("Single protagonist-driven scene.");
  }

  // Age diversity insight
  const ageRanges = Object.keys(summary.estimatedAgeRanges);
  if (ageRanges.length > 3) {
    insights.push(
      `Diverse age range across ${ageRanges.length} different age groups.`
    );
  }

  // Supporting characters
  if (summary.supportingCount > summary.leadCount) {
    insights.push(
      "Supporting cast outnumber leads - potential rich ensemble dynamic."
    );
  }

  return insights;
}

/**
 * Generate warnings for potential casting issues
 */
export function generateCastWarnings(members: ExtendedCastMember[]): string[] {
  const warnings: string[] = [];

  // Check for missing descriptions
  const vagueDescriptions = members.filter(
    (m) => !m.visualDescription || m.visualDescription.length < 20
  );
  if (vagueDescriptions.length > 0) {
    warnings.push(
      `${vagueDescriptions.length} character(s) lack detailed visual descriptions.`
    );
  }

  // Check for unknown genders
  const unknownGenders = members.filter((m) => m.gender === "Unknown");
  if (unknownGenders.length > 0) {
    warnings.push(
      `${unknownGenders.length} character(s) have unspecified gender.`
    );
  }

  // Check for generic names
  const genericNames = members.filter((m) =>
    /^(MAN|WOMAN|PERSON|STRANGER|FIGURE|UNKNOWN|رجل|امرأة|شخص)$/i.test(m.name)
  );
  if (genericNames.length > 0) {
    warnings.push(
      `${genericNames.length} generic character name(s) detected - consider naming for clarity.`
    );
  }

  // Check for mystery roles
  const mysteryRoles = members.filter((m) => m.roleCategory === "Mystery");
  if (mysteryRoles.length > 0) {
    warnings.push(
      `${mysteryRoles.length} character(s) marked as Mystery - verify their role in the story.`
    );
  }

  return warnings;
}

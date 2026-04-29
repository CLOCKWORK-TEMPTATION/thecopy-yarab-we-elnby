import type { ExtendedCastMember } from "../../../domain/models";

const DEFAULT_CAST_MEMBER: ExtendedCastMember = {
  id: "",
  name: "",
  role: "",
  age: "",
  gender: "Unknown",
  description: "",
  motivation: "",
  roleCategory: "Mystery",
  ageRange: "",
  visualDescription: "",
};

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readGender(value: unknown): ExtendedCastMember["gender"] {
  return value === "Male" ||
    value === "Female" ||
    value === "Non-binary" ||
    value === "Unknown"
    ? value
    : DEFAULT_CAST_MEMBER.gender;
}

function readRoleCategory(value: unknown): ExtendedCastMember["roleCategory"] {
  return value === "Lead" ||
    value === "Supporting" ||
    value === "Bit Part" ||
    value === "Silent" ||
    value === "Group" ||
    value === "Mystery"
    ? value
    : DEFAULT_CAST_MEMBER.roleCategory;
}

export function normalizeCastMember(value: unknown): ExtendedCastMember {
  const record = readObject(value);
  const member: ExtendedCastMember = {
    ...DEFAULT_CAST_MEMBER,
    id: readString(record["id"]),
    name: readString(record["name"]),
    role: readString(record["role"]),
    age: readString(record["age"]),
    gender: readGender(record["gender"]),
    description: readString(record["description"]),
    motivation: readString(record["motivation"]),
    roleCategory: readRoleCategory(record["roleCategory"]),
    ageRange: readString(record["ageRange"], readString(record["age"])),
    visualDescription: readString(
      record["visualDescription"],
      readString(record["description"])
    ),
  };

  const nameArabic = readString(record["nameArabic"]);
  if (nameArabic) {
    member.nameArabic = nameArabic;
  }

  const personalityTraits = readStringArray(record["personalityTraits"]);
  if (personalityTraits !== undefined) {
    member.personalityTraits = personalityTraits;
  }

  return member;
}

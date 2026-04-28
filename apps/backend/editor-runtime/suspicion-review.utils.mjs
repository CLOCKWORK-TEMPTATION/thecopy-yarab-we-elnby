export const isObjectRecord = (value) =>
  typeof value === "object" && value !== null;

export const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

export const isIntegerNumber = (value) => Number.isInteger(value) && value >= 0;

export const normalizeIncomingText = (value, maxLength = 50_000) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
};

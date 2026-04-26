// ... (rest of the file)

export function extractSection(text: string, sectionTitle: string): string {
  // SECURITY FIX: Use safe string matching instead of regex for section extraction
  const sectionStart = `===${sectionTitle}===`;
  const startIndex = text.toLowerCase().indexOf(sectionStart.toLowerCase());

  if (startIndex === -1) {
    return "";
  }

  const contentStart = startIndex + sectionStart.length;
  const nextHeaderIndex = text.indexOf("===", contentStart);

  if (nextHeaderIndex === -1) {
    return text.substring(contentStart).trim();
  }

  return text.substring(contentStart, nextHeaderIndex).trim();
}

// Alternative regex-based function for complex patterns (if needed)
export function extractSectionRegex(
  text: string,
  sectionTitle: string
): string {
  // `createSafeRegExp` escapes all special characters including \s.
  // We need to use native RegExp if we want to use \s, or avoid safe-regexp for this specific internal pattern.
  // Since we want to match whitespace flexibly, let's use a safe internal RegExp.
  // We'll escape just the sectionTitle.
  const escapedTitle = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`===\\s*${escapedTitle}\\s*===`, "i");
  const match = text.match(pattern);

  if (match?.index === undefined) {
    return "";
  }

  const startIndex = match.index + match[0].length;
  const nextHeaderIndex = text.indexOf("===", startIndex);

  if (nextHeaderIndex === -1) {
    return text.substring(startIndex).trim();
  }

  return text.substring(startIndex, nextHeaderIndex).trim();
}

// ... (rest of the file)

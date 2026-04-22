import { readTextIfExists } from "./utils";

export async function getNextRoundNumber(filePath: string): Promise<number> {
  const content = await readTextIfExists(filePath);
  const matches = [...content.matchAll(/##\s+الجولة\s+(\d+)/g)];
  if (matches.length === 0) {
    return 1;
  }

  const last = matches[matches.length - 1];
  return Number(last[1]) + 1;
}

export function appendRoundNote(existingContent: string, note: string): string {
  const trimmed = existingContent.trimEnd();
  if (!trimmed) {
    return `# سجل الجولات التنفيذية\n\n${note}\n`;
  }

  return `${trimmed}\n\n${note}\n`;
}
import type { ScreenplayBlock } from "../file-import/document-model";
import { sanitizeExportFileBaseName } from "./shared";

interface ExportAsClassifiedOptions {
  fileNameBase?: string;
  blocks: ScreenplayBlock[];
}

const mapFormatIdToClassifiedElement = (
  formatId: ScreenplayBlock["formatId"]
): string => {
  switch (formatId) {
    case "basmala":
      return "BASMALA";
    case "scene_header_1":
      return "SCENE-HEADER-1";
    case "scene_header_2":
      return "SCENE-HEADER-2";
    case "scene_header_3":
      return "SCENE-HEADER-3";
    case "scene_header_top_line":
      return "ACTION";
    case "action":
      return "ACTION";
    case "character":
      return "CHARACTER";
    case "dialogue":
      return "DIALOGUE";
    case "parenthetical":
      return "PARENTHETICAL";
    case "transition":
      return "TRANSITION";
    default:
      return "ACTION";
  }
};

const normalizeText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

export const generateClassifiedText = (blocks: ScreenplayBlock[]): string => {
  const lines: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block) continue;
    const text = normalizeText(block.text);
    if (!text) continue;

    if (block.formatId === "scene_header_top_line") {
      continue;
    }

    const element = mapFormatIdToClassifiedElement(block.formatId);
    if (!element) {
      continue;
    }
    let finalValue = text;

    if (element === "CHARACTER") {
      if (!finalValue.endsWith(":")) {
        finalValue += " :";
      }
    }

    lines.push(`${element} = ${finalValue}`);
  }

  return lines.join("\n");
};

export const exportAsClassified = ({
  fileNameBase,
  blocks,
}: ExportAsClassifiedOptions): void => {
  const textContent = generateClassifiedText(blocks);
  const safeName =
    (sanitizeExportFileBaseName(fileNameBase ?? "النص_المصنف") ||
      "النص_المصنف") + ".txt";

  const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = safeName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

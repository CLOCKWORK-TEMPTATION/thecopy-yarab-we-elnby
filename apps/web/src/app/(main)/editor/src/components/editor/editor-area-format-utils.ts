import { redo, undo } from "@tiptap/pm/history";

import { SCREENPLAY_ELEMENTS } from "../../editor";
import {
  isElementType,
  type ElementType,
} from "../../extensions/classification-types";

import {
  commandNameByFormat,
  formatLabelByType,
} from "./editor-area-constants";

import type { DocumentStats, EditorCommand } from "./editor-area.types";
import type { RunEditorCommandOptions } from "../../types/editor-engine";
import type { Editor } from "@tiptap/core";

// — ينفذ أمراً عاماً على المحرر ويعيد true عند النجاح
export function runEditorCommand(
  editor: Editor,
  commandInput: EditorCommand | RunEditorCommandOptions
): boolean {
  const command =
    typeof commandInput === "string" ? commandInput : commandInput.command;

  switch (command) {
    case "bold":
      return editor.chain().focus().toggleBold().run();
    case "italic":
      return editor.chain().focus().toggleItalic().run();
    case "underline":
      return editor.chain().focus().toggleUnderline().run();
    case "align-right":
      return applyTextAlignToEditor(editor, "right");
    case "align-center":
      return applyTextAlignToEditor(editor, "center");
    case "align-left":
      return applyTextAlignToEditor(editor, "left");
    case "undo":
      // — التركيز يضمن أن ProseMirror يعرف سياق التحرير قبل التراجع
      editor.commands.focus();
      return undo(editor.state, editor.view.dispatch, editor.view);
    case "redo":
      editor.commands.focus();
      return redo(editor.state, editor.view.dispatch, editor.view);
    case "select-all":
      editor.commands.selectAll();
      return true;
    case "focus-end":
      editor.commands.focus("end");
      return true;
    default:
      return false;
  }
}

// — يطبق محاذاة نصية عبر أمر TipTap أو يتراجع إلى DOM fallback
export function applyTextAlignToEditor(
  editor: Editor,
  alignment: "left" | "center" | "right"
): boolean {
  const chain = editor.chain().focus() as unknown as {
    setTextAlign?: (value: "left" | "center" | "right") => {
      run: () => boolean;
    };
    run: () => boolean;
  };

  if (typeof chain.setTextAlign === "function") {
    const result = chain.setTextAlign(alignment).run();
    if (result) return true;
  }

  const setTextAlign = (editor.commands as Record<string, unknown>)[
    "setTextAlign"
  ];
  if (typeof setTextAlign === "function") {
    const result = (
      setTextAlign as (value: "left" | "center" | "right") => boolean
    )(alignment);
    if (result) return true;
  }

  return applyTextAlignDomFallback(editor, alignment);
}

// — يطبق محاذاة DOM مباشرةً عند فشل أوامر TipTap
export function applyTextAlignDomFallback(
  editor: Editor,
  alignment: "left" | "center" | "right"
): boolean {
  const domSelection =
    typeof window !== "undefined" && typeof window.getSelection === "function"
      ? window.getSelection()
      : null;

  let targetElement: HTMLElement | null = null;
  const anchorNode = domSelection?.anchorNode ?? null;

  if (anchorNode) {
    const anchorElement =
      anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement;
    targetElement = anchorElement?.closest<HTMLElement>("[data-type]") ?? null;
  }

  if (!targetElement) {
    const fromPos = editor.state.selection.from;
    const nodeAtPos = editor.view.nodeDOM(fromPos);
    const baseElement =
      nodeAtPos instanceof HTMLElement
        ? nodeAtPos
        : (nodeAtPos?.parentElement ?? null);
    targetElement = baseElement?.closest<HTMLElement>("[data-type]") ?? null;
  }

  if (!targetElement) return false;

  targetElement.style.textAlign = alignment;
  if (targetElement.getAttribute("data-type") === "action") {
    if (alignment === "right") {
      targetElement.style.textAlignLast = "right";
      targetElement.style.setProperty("text-justify", "inter-word");
    } else {
      targetElement.style.textAlignLast = "auto";
      targetElement.style.setProperty("text-justify", "auto");
    }
  }

  return true;
}

// — يطبق نوع عنصر سيناريو على موضع المؤشر الحالي
export function setEditorFormat(editor: Editor, format: ElementType): boolean {
  const commandName = commandNameByFormat[format];
  const command = (editor.commands as Record<string, unknown>)[commandName];
  if (typeof command !== "function") return false;
  return (command as () => boolean)();
}

// — يعيد نوع العنصر النشط حالياً في المحرر أو null إذا لم يُعرف
export function getEditorCurrentFormat(editor: Editor): ElementType | null {
  for (const item of SCREENPLAY_ELEMENTS) {
    if (!isElementType(item.name)) continue;
    if (editor.isActive(item.name)) return item.name;
  }
  return null;
}

// — يعيد التسمية العربية للعنصر النشط أو "—" عند غياب النوع
export function getEditorCurrentFormatLabel(editor: Editor): string {
  const format = getEditorCurrentFormat(editor);
  return format ? formatLabelByType[format] : "—";
}

// — يبحث عن أول ظهور للنص في المستند ويضبط التحديد عليه ويُمرِّر الشاشة
export function findTextInEditor(editor: Editor, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return false;

  const { doc } = editor.state;
  let foundPos = -1;

  doc.descendants((node, pos) => {
    if (foundPos !== -1) return false;
    if (node.isText && typeof node.text === "string") {
      const idx = node.text.toLowerCase().indexOf(needle);
      if (idx !== -1) {
        foundPos = pos + idx;
        return false;
      }
    }
    return true;
  });

  if (foundPos === -1) return false;

  const endPos = foundPos + needle.length;
  editor
    .chain()
    .focus()
    .setTextSelection({ from: foundPos, to: endPos })
    .scrollIntoView()
    .run();

  return true;
}

// — يحسب عدد ظهورات النص في نص المستند الكامل (غير حساس للحالة)
export function countTextOccurrences(haystack: string, query: string): number {
  const needle = query.trim().toLowerCase();
  if (!needle || !haystack) return 0;

  const lower = haystack.toLowerCase();
  let count = 0;
  let index = 0;
  while ((index = lower.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

// — يستخرج رسالة خطأ paste-classifier من CustomEvent أو يعيد رسالة افتراضية
export function extractPasteClassifierErrorMessage(event: Event): string {
  const customEvent = event as CustomEvent<{ message?: unknown }>;
  const rawMessage = customEvent.detail?.message;
  return typeof rawMessage === "string" && rawMessage.trim().length > 0
    ? rawMessage
    : "تعذر تطبيق نظام الشك على النص الملصوق.";
}

/**
 * عدّاد كلمات يدعم العربية بصرامة.
 *
 * إصلاح P0-1: التقرير وثّق أن عدّاد الكلمات لا يتحدث مع الكتابة
 * رغم تحدّث عدّاد الحروف. السبب الأرجح: محارف اتجاه RTL خفية
 * (U+200E LRM, U+200F RLM, U+202A..U+202E, U+2066..U+2069) ومسافة
 * غير قاطعة (U+00A0) كانت تُنتج "كلمة" واحدة وهمية تستهلك كل النص.
 *
 * المعالجة:
 *   1. نزيل محارف الاتجاه قبل التقطيع.
 *   2. نعتمد فاصل Unicode \p{White_Space} لاحتساب كل أنواع المسافات.
 *   3. نتجاهل القيم الفارغة بعد filter حتى لا يحتسب نص بمسافات فقط ككلمة.
 */
const DIRECTIONAL_MARKS_PATTERN = /[‎‏‪-‮⁦-⁩]/g;

export function countArabicWords(text: string): number {
  if (typeof text !== "string" || text.length === 0) {
    return 0;
  }
  const cleaned = text
    .replace(DIRECTIONAL_MARKS_PATTERN, "")
    .replace(/ /g, " ")
    .trim();
  if (cleaned.length === 0) {
    return 0;
  }
  // \p{White_Space} يغطي جميع أنواع المسافات في Unicode بما فيها العربية.
  const tokens = cleaned.split(/[\p{White_Space}]+/u).filter((t) => t.length > 0);
  return tokens.length;
}

/**
 * عدّاد حروف يستثني كل أنواع المسافات ومحارف الاتجاه.
 */
export function countArabicCharacters(text: string): number {
  if (typeof text !== "string" || text.length === 0) {
    return 0;
  }
  return text
    .replace(DIRECTIONAL_MARKS_PATTERN, "")
    .replace(/[\p{White_Space}]/gu, "").length;
}

// — يحسب إحصائيات المستند (كلمات، حروف، صفحات، مشاهد) من النص والـ HTML
export function computeDocumentStats(
  text: string,
  html: string,
  pagesCount: number
): DocumentStats {
  const words = countArabicWords(text);
  const characters = countArabicCharacters(text);
  const scenes = (
    html.match(
      /data-type="scene_header_top_line"|data-type="scene_header_3"/g
    ) ?? []
  ).length;
  return { words, characters, pages: pagesCount, scenes };
}

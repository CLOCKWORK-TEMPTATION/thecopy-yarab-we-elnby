import { insertMenuDefinitions, type EditorStyleFormatId } from "../constants";
import { fromLegacyElementType } from "../extensions/classification-types";

import type { EditorArea } from "../components/editor";

export type InsertActionId =
  | `insert-template:${EditorStyleFormatId}`
  | `photo-montage:${EditorStyleFormatId}`;

export interface MenuToastPayload {
  title: string;
  description: string;
  variant?: "default" | "destructive";
}

interface InsertMenuActionRuntime {
  actionId: InsertActionId;
  area: EditorArea;
  toast: (payload: MenuToastPayload) => void;
  getNextPhotoMontageNumber: () => number;
}

const INSERT_DEFINITION_BY_ID = insertMenuDefinitions.reduce<
  Record<EditorStyleFormatId, (typeof insertMenuDefinitions)[number]>
>(
  (acc, definition) => {
    acc[definition.id] = definition;
    return acc;
  },
  {} as Record<EditorStyleFormatId, (typeof insertMenuDefinitions)[number]>
);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * هل الفقرة الحالية فارغة؟ — تُستخدم لتقرير ما إذا كنا سنستبدل
 * المحتوى الحالي بالقالب الجديد (إن كان السطر فارغاً) أم سندرج
 * كتلة جديدة بعده (إن كان يحتوي نصاً).
 *
 * السبب: QA أشار إلى أن استخدام قائمة الإدراج على سطر فارغ
 * يُنشئ سطراً جديداً ويترك الأصلي فارغاً (BUG-007). نريد
 * تحويل الفقرة الحالية عندما تكون فارغة.
 */
const isCurrentBlockEmpty = (area: EditorArea): boolean => {
  const { state } = area.editor;
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.isBlock && node.type.name !== "doc") {
      return node.content.size === 0 || node.textContent.trim().length === 0;
    }
  }
  return false;
};

const buildSceneHeaderTopLineHtml = (
  header1: string,
  header2: string
): string => {
  const safeHeader1 = escapeHtml(header1.trim());
  const safeHeader2 = escapeHtml(header2.trim());
  return `<div data-type="scene_header_top_line"><div data-type="scene_header_1">${safeHeader1}</div><div data-type="scene_header_2">${safeHeader2}</div></div>`;
};

const insertTemplateTextAndSelect = (area: EditorArea, text: string): void => {
  const selectionStart = area.editor.state.selection.from;
  const inserted = area.editor
    .chain()
    .focus()
    .insertContent(escapeHtml(text))
    .run();

  if (!inserted) return;

  area.editor
    .chain()
    .focus()
    .setTextSelection({
      from: selectionStart,
      to: selectionStart + text.length,
    })
    .run();
};

export const isInsertActionId = (
  actionId: string
): actionId is InsertActionId =>
  actionId.startsWith("insert-template:") ||
  actionId.startsWith("photo-montage:");

export const runInsertMenuAction = ({
  actionId,
  area,
  toast,
  getNextPhotoMontageNumber,
}: InsertMenuActionRuntime): void => {
  const [behavior, rawId] = actionId.split(":") as [
    "insert-template" | "photo-montage",
    EditorStyleFormatId,
  ];
  const definition = INSERT_DEFINITION_BY_ID[rawId];
  const template = (definition.defaultTemplate ?? "").trim();
  const sceneHeader1Template = (
    INSERT_DEFINITION_BY_ID.scene_header_1.defaultTemplate ?? "مشهد 1:"
  ).trim();
  const sceneHeader2Template = (
    INSERT_DEFINITION_BY_ID.scene_header_2.defaultTemplate ??
    "داخلي - المكان - الوقت"
  ).trim();

  /**
   * إذا كانت الفقرة الحالية فارغة، نستبدل الكتلة الفارغة بالقالب
   * بدل إدراج كتلة جديدة بعدها — هذا يُحقق سلوك «تحويل الفقرة الحالية»
   * الذي أشار إليه QA في BUG-007.
   */
  const replaceCurrentIfEmpty = (html: string): void => {
    if (isCurrentBlockEmpty(area)) {
      const { state } = area.editor;
      const { $from } = state.selection;
      for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.isBlock && node.type.name !== "doc") {
          const blockStart = $from.before(depth);
          const blockEnd = blockStart + node.nodeSize;
          area.editor
            .chain()
            .focus()
            .insertContentAt({ from: blockStart, to: blockEnd }, html)
            .run();
          return;
        }
      }
    }
    area.editor.chain().focus().insertContent(html).run();
  };

  if (behavior === "photo-montage") {
    const montageNumber = getNextPhotoMontageNumber();
    const montageHeader = `فوتو مونتاج ${montageNumber}`;
    replaceCurrentIfEmpty(
      buildSceneHeaderTopLineHtml(montageHeader, "مشاهد متتابعة")
    );
    toast({
      title: "تم إدراج فوتو مونتاج",
      description: `تم إنشاء ${montageHeader}.`,
    });
    return;
  }

  if (definition.id === "scene_header_1") {
    replaceCurrentIfEmpty(
      buildSceneHeaderTopLineHtml(
        template || sceneHeader1Template,
        sceneHeader2Template
      )
    );
    toast({
      title: "تم الإدراج",
      description: "تم إدراج رأس المشهد (1) ضمن سطر رأس المشهد.",
    });
    return;
  }

  if (definition.id === "scene_header_2") {
    replaceCurrentIfEmpty(
      buildSceneHeaderTopLineHtml(
        sceneHeader1Template,
        template || sceneHeader2Template
      )
    );
    toast({
      title: "تم الإدراج",
      description: "تم إدراج رأس المشهد (2) ضمن سطر رأس المشهد.",
    });
    return;
  }

  const mappedElementType = fromLegacyElementType(definition.id);
  if (!mappedElementType) {
    toast({
      title: "تعذر الإدراج",
      description: `نوع الإدراج ${definition.id} غير مدعوم في المحرك الحالي.`,
      variant: "destructive",
    });
    return;
  }

  area.setFormat(mappedElementType);
  if (template) {
    insertTemplateTextAndSelect(area, template);
  }
  toast({
    title: "تم الإدراج",
    description: `تم إدراج قالب ${definition.label}.`,
  });
};

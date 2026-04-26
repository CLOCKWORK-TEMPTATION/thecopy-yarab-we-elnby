import {
  FILMLANE_CLIPBOARD_MIME,
  type ClipboardOrigin,
  type EditorClipboardOperationResult,
  type EditorClipboardPayload,
} from "../types/editor-clipboard";
import { htmlToScreenplayBlocks } from "../utils/file-import";

import type { ScreenplayBlock } from "../utils/file-import";
import type { Editor } from "@tiptap/core";

/**
 * @description أدوات مساعدة لعمليات الحافظة في محرر السيناريو
 */

// Hash function for text validation
const hashText = (value: string): string => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};

const clipboardResult = (
  result: EditorClipboardOperationResult
): EditorClipboardOperationResult => result;

// Validate clipboard payload structure
const isValidClipboardPayload = (
  value: unknown
): value is EditorClipboardPayload => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<EditorClipboardPayload>;
  if (typeof candidate.plainText !== "string") return false;
  if (typeof candidate.hash !== "string") return false;
  if (typeof candidate.createdAt !== "string") return false;
  if (
    candidate.sourceKind !== "selection" &&
    candidate.sourceKind !== "document"
  )
    return false;
  if (candidate.blocks && !Array.isArray(candidate.blocks)) return false;
  return true;
};

/**
 * @description نسخ النص المحدد أو المستند كاملاً إلى الحافظة
 */
export const copyToClipboard = async (
  editor: Editor,
  selectionOnly = false
): Promise<EditorClipboardOperationResult> => {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return clipboardResult({
      ok: false,
      status: "unavailable",
      message: "الحافظة غير متاحة في هذا المتصفح.",
    });
  }

  const hasSelection = !editor.state.selection.empty;
  const plainText = hasSelection
    ? editor.state.doc.textBetween(
        editor.state.selection.from,
        editor.state.selection.to,
        "\n"
      )
    : editor.getText();

  if (!plainText.trim()) {
    return clipboardResult({
      ok: false,
      status: selectionOnly ? "empty-selection" : "empty-document",
      message: selectionOnly
        ? "لا يوجد نص محدد لنسخه."
        : "لا يوجد محتوى يمكن نسخه.",
    });
  }

  const blocks =
    selectionOnly || !hasSelection
      ? undefined
      : htmlToScreenplayBlocks(editor.getHTML());

  const payload: EditorClipboardPayload = {
    plainText,
    ...(blocks !== undefined ? { blocks } : {}),
    sourceKind: hasSelection ? "selection" : "document",
    hash: hashText(plainText),
    createdAt: new Date().toISOString(),
  };

  const serializedPayload = JSON.stringify(payload);

  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      typeof navigator.clipboard.write === "function"
    ) {
      const clipboardItem = new ClipboardItem({
        "text/plain": new Blob([plainText], { type: "text/plain" }),
        [FILMLANE_CLIPBOARD_MIME]: new Blob([serializedPayload], {
          type: FILMLANE_CLIPBOARD_MIME,
        }),
      });
      await navigator.clipboard.write([clipboardItem]);
      return clipboardResult({
        ok: true,
        status: "success",
        message: "تم نسخ النص إلى الحافظة.",
        textLength: plainText.length,
        sourceKind: payload.sourceKind,
      });
    }
  } catch {
    // fallback to plain text write when custom MIME fails.
  }

  if (typeof navigator.clipboard.writeText === "function") {
    try {
      await navigator.clipboard.writeText(plainText);
      return clipboardResult({
        ok: true,
        status: "success",
        message: "تم نسخ النص إلى الحافظة.",
        textLength: plainText.length,
        sourceKind: payload.sourceKind,
      });
    } catch {
      return clipboardResult({
        ok: false,
        status: "permission-denied",
        message: "رفض المتصفح صلاحية الكتابة إلى الحافظة.",
      });
    }
  }

  return clipboardResult({
    ok: false,
    status: "unavailable",
    message: "واجهة الكتابة إلى الحافظة غير متاحة.",
  });
};

/**
 * @description قص النص المحدد من المحرر ونسخه إلى الحافظة
 */
export const cutToClipboard = async (
  editor: Editor
): Promise<EditorClipboardOperationResult> => {
  if (editor.state.selection.empty) {
    return clipboardResult({
      ok: false,
      status: "empty-selection",
      message: "حدد نصاً قبل تنفيذ القص.",
    });
  }

  const copied = await copyToClipboard(editor, true);
  if (!copied.ok) return copied;

  const deleted = editor.chain().focus().deleteSelection().run();
  if (!deleted) {
    return clipboardResult({
      ok: false,
      status: "failed",
      message: "تم النسخ لكن تعذر حذف التحديد من المحرر.",
    });
  }

  return clipboardResult({
    ok: true,
    status: "success",
    message: "تم قص النص المحدد إلى الحافظة.",
    textLength: copied.textLength ?? 0,
    sourceKind: copied.sourceKind ?? "selection",
  });
};

/**
 * @description لصق النص من الحافظة إلى المحرر مع التصنيف التلقائي
 */
export const pasteFromClipboard = async (
  origin: ClipboardOrigin,
  importClassifiedText: (
    text: string,
    mode: "insert",
    context?: { classificationProfile?: "paste" | "generic-open" }
  ) => Promise<void>,
  importStructuredBlocks: (
    blocks: ScreenplayBlock[],
    mode: "insert"
  ) => Promise<void>
): Promise<EditorClipboardOperationResult> => {
  void origin;
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return clipboardResult({
      ok: false,
      status: "unavailable",
      message: "الحافظة غير متاحة في هذا المتصفح.",
    });
  }

  try {
    if (typeof navigator.clipboard.read === "function") {
      const items = await navigator.clipboard.read();
      let blocksToImport: ScreenplayBlock[] | null = null;
      let textToImport: string | null = null;

      for (const item of items) {
        if (item.types.includes(FILMLANE_CLIPBOARD_MIME)) {
          const payloadBlob = await item.getType(FILMLANE_CLIPBOARD_MIME);
          const payloadText = await payloadBlob.text();
          const parsed = JSON.parse(payloadText) as unknown;
          if (
            isValidClipboardPayload(parsed) &&
            parsed.hash === hashText(parsed.plainText)
          ) {
            if (parsed.blocks && parsed.blocks.length > 0) {
              blocksToImport = parsed.blocks;
              break;
            }

            if (parsed.plainText.trim()) {
              textToImport = parsed.plainText;
              break;
            }
          }
        }

        if (item.types.includes("text/plain")) {
          const plainBlob = await item.getType("text/plain");
          const text = await plainBlob.text();
          if (text.trim()) {
            textToImport = text;
            break;
          }
        }
      }

      if (blocksToImport) {
        await importStructuredBlocks(blocksToImport, "insert");
        return clipboardResult({
          ok: true,
          status: "success",
          message: "تم لصق كتل السيناريو من الحافظة.",
          textLength: blocksToImport.map((block) => block.text ?? "").join("\n")
            .length,
        });
      }

      if (textToImport) {
        await importClassifiedText(textToImport, "insert", {
          classificationProfile: "paste",
        });
        return clipboardResult({
          ok: true,
          status: "success",
          message: "تم لصق النص من الحافظة.",
          textLength: textToImport.length,
        });
      }
    }
  } catch {
    // fallback to readText below.
  }

  if (typeof navigator.clipboard.readText !== "function") {
    return clipboardResult({
      ok: false,
      status: "unavailable",
      message: "واجهة القراءة من الحافظة غير متاحة.",
    });
  }

  let text = "";
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return clipboardResult({
      ok: false,
      status: "permission-denied",
      message: "رفض المتصفح صلاحية القراءة من الحافظة.",
    });
  }

  if (!text.trim()) {
    return clipboardResult({
      ok: false,
      status: "empty-clipboard",
      message: "لا يوجد نص قابل للصق في الحافظة.",
    });
  }

  await importClassifiedText(text, "insert", {
    classificationProfile: "paste",
  });
  return clipboardResult({
    ok: true,
    status: "success",
    message: "تم لصق النص من الحافظة.",
    textLength: text.length,
  });
};

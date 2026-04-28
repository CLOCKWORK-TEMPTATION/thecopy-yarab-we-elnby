/**
 * @module extensions/paste-classifier/extension
 *
 * تعريف Tiptap Extension للـ paste classifier:
 * يربط handlePaste داخل ProseMirror Plugin بتدفق التصنيف الكامل.
 * عند حدوث خطأ غير قابل للتعافي يُرسَل CustomEvent على window
 * باسم PASTE_CLASSIFIER_ERROR_EVENT بحيث تُلتقط في طبقة UI.
 */

import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { agentReviewLogger } from "../paste-classifier-config";

import { PASTE_CLASSIFIER_ERROR_EVENT } from "../paste-classifier-config";

import { applyPasteClassifierFlowToView } from "./paste-flow";

import type { PasteClassifierOptions } from "./types";

/**
 * Tiptap Extension يلتقط حدث اللصق ويوكّل تدفق التصنيف الكامل.
 */
export const PasteClassifier = Extension.create<PasteClassifierOptions>({
  name: "pasteClassifier",

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const agentReview = this.options.agentReview;

    return [
      new Plugin({
        key: new PluginKey("pasteClassifier"),

        props: {
          handlePaste(view, event) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            const text = clipboardData.getData("text/plain");
            if (!text?.trim()) return false;

            event.preventDefault();
            void applyPasteClassifierFlowToView(view, text, {
              ...(agentReview !== undefined ? { agentReview } : {}),
              classificationProfile: "paste",
            }).catch((error) => {
              const message =
                error instanceof Error ? error.message : String(error);
              agentReviewLogger.error("paste-failed-fatal", {
                error,
                message,
              });

              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent(PASTE_CLASSIFIER_ERROR_EVENT, {
                    detail: { message },
                  })
                );
              }
            });
            return true;
          },
        },
      }),
    ];
  },
});

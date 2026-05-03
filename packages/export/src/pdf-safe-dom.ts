// ============================================================================
// بناء export-safe DOM للـ PDF
// ============================================================================
// المنهج:
//   1. ننسخ DOM المصدر بعمق.
//   2. نلفّه داخل container مع inline styles آمنة (RGB/HEX فقط).
//   3. نطبّق على كل عنصر داخل النسخة computed colors محوّلة.
//   4. نعرضه خارج viewport ثم نمرره إلى مكتبة التصدير.
//   5. نحذف النسخة بعد الانتهاء.
//
// هذا الملف لا يستورد html2canvas/jsPDF حتى لا يفرض اعتماداً.
// caller يستورد المكتبة المناسبة ويستدعي prepareExportDom قبل تمرير العنصر.

import { applyExportSafeColors } from "./color.js";

/**
 * خيارات بناء container الـ export.
 */
export interface PrepareExportDomOptions {
  /** عرض container — يُستخدم ليناسب صفحة PDF. */
  width?: number;
  /** خلفية افتراضية. */
  background?: string;
  /** خط افتراضي للنص العربي. */
  fontFamily?: string;
  /** اتجاه النص. */
  direction?: "rtl" | "ltr";
}

/**
 * نتيجة الإعداد. caller مسؤول عن استدعاء dispose() بعد التصدير.
 */
export interface ExportDomHandle {
  /** العنصر الذي يُمرَّر إلى html2canvas/jsPDF. */
  container: HTMLElement;
  /** يحذف الـ container من DOM ويفرغ الموارد. */
  dispose: () => void;
}

/**
 * يطبّق applyExportSafeColors على كل عنصر بداخل subtree.
 */
function applyToSubtree(root: HTMLElement): void {
  applyExportSafeColors(root);
  const all = root.querySelectorAll<HTMLElement>("*");
  for (let i = 0; i < all.length; i += 1) {
    const el = all.item(i);
    if (el !== null) {
      applyExportSafeColors(el);
    }
  }
}

/**
 * يبني نسخة DOM آمنة للتصدير.
 *
 * @param source العنصر المصدر (مثلاً div.ProseMirror).
 * @param options خيارات الـ container.
 */
export function prepareExportDom(
  source: HTMLElement,
  options: PrepareExportDomOptions = {},
): ExportDomHandle {
  if (typeof document === "undefined") {
    throw new Error("[export] prepareExportDom requires a browser environment");
  }

  const width = options.width ?? 794; // A4 @ 96dpi.
  const background = options.background ?? "#ffffff";
  const fontFamily =
    options.fontFamily ??
    `"Noto Naskh Arabic", "Amiri", "Cairo", "Segoe UI", system-ui, sans-serif`;
  const direction = options.direction ?? "rtl";

  const container = document.createElement("div");
  container.setAttribute("data-export-safe-dom", "true");
  container.style.position = "fixed";
  container.style.top = "-10000px";
  container.style.left = "0";
  container.style.width = `${width.toString()}px`;
  container.style.background = background;
  container.style.color = "#000000";
  container.style.fontFamily = fontFamily;
  container.style.direction = direction;
  container.style.padding = "32px";
  container.style.boxSizing = "border-box";
  container.style.zIndex = "-1";
  container.style.pointerEvents = "none";

  const clone = source.cloneNode(true) as HTMLElement;
  // نزيل أي data-attribute قد يكسر التصدير.
  clone.querySelectorAll<HTMLElement>("[data-tippy-root]").forEach((node) => {
    node.remove();
  });
  // نزيل عناصر floating/menu/portal التي لا يجب أن تظهر في PDF.
  clone.querySelectorAll<HTMLElement>("[data-export-exclude]").forEach((node) => {
    node.remove();
  });

  container.appendChild(clone);
  document.body.appendChild(container);

  // بعد الإلصاق، نطبّق ألوان آمنة على كل subtree.
  applyToSubtree(container);

  return {
    container,
    dispose: () => {
      try {
        container.remove();
      } catch {
        // ignore
      }
    },
  };
}

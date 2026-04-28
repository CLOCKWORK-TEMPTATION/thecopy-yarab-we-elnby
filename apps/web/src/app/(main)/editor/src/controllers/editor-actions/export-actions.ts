import { definedProps } from "@/lib/defined-props";

import { ensureDocxFilename } from "../../constants/format-mappings";
import { logger } from "../../utils/logger";

import type { EditorActionsFeedbackDeps } from "./types";
import type { ExportFormat } from "../../constants/menu-definitions";

const LABEL_BY_FORMAT: Record<ExportFormat, string> = {
  docx: "DOCX",
  html: "HTML",
  pdf: "PDF",
  pdfa: "PDF/A",
  fdx: "FDX",
  fountain: "Fountain",
  classified: "النص المصنف",
};

export const runExport = async (
  format: ExportFormat,
  deps: EditorActionsFeedbackDeps,
  fileBase?: string
): Promise<void> => {
  const area = deps.getArea();
  if (!area) return;

  const html = area.getAllHtml().trim();
  if (!html) {
    deps.toast({
      title: "لا يوجد محتوى",
      description: "اكتب شيئًا أولًا قبل الحفظ.",
      variant: "destructive",
    });
    return;
  }

  try {
    const blocks = area.getBlocks();

    if (format === "docx") {
      const { exportToDocx } = await import("../../utils/exporters");
      await exportToDocx(
        html,
        ensureDocxFilename(fileBase ?? "screenplay.docx"),
        { blocks }
      );
      deps.toast({
        title: "تم التصدير",
        description: "تم حفظ الملف بصيغة DOCX.",
      });
      return;
    }

    if (format === "fdx") {
      const { exportAsFdx } = await import("../../utils/exporters");
      exportAsFdx(definedProps({ html, fileNameBase: fileBase, blocks }));
      deps.toast({
        title: "تم التصدير",
        description: `تم تصدير الملف بصيغة ${LABEL_BY_FORMAT[format]}.`,
      });
      return;
    }

    if (format === "fountain") {
      const { exportAsFountain } = await import("../../utils/exporters");
      exportAsFountain(definedProps({ html, fileNameBase: fileBase, blocks }));
      deps.toast({
        title: "تم التصدير",
        description: `تم تصدير الملف بصيغة ${LABEL_BY_FORMAT[format]}.`,
      });
      return;
    }

    if (format === "pdfa") {
      const { exportAsPdfA } = await import("../../utils/exporters");
      await exportAsPdfA(
        definedProps({
          html,
          fileNameBase: fileBase,
          title: "تصدير محرر السيناريو",
        })
      );
      deps.toast({
        title: "تم التصدير",
        description: `تم تصدير الملف بصيغة ${LABEL_BY_FORMAT[format]}.`,
      });
      return;
    }

    if (format === "classified") {
      const { exportAsClassified } = await import("../../utils/exporters");
      exportAsClassified(definedProps({ fileNameBase: fileBase, blocks }));
      deps.toast({
        title: "تم اعتماد النص",
        description: "تم تصدير الملف كملف نصي مصنف (TXT).",
      });
      return;
    }

    if (format === "html") {
      const { exportAsHtml } = await import("../../utils/exporters");
      exportAsHtml(
        definedProps({
          html,
          fileNameBase: fileBase,
          title: "تصدير محرر السيناريو",
        })
      );
    } else {
      const { exportAsPdf } = await import("../../utils/exporters");
      await exportAsPdf(
        definedProps({
          html,
          fileNameBase: fileBase,
          title: "تصدير محرر السيناريو",
        })
      );
    }

    deps.toast({
      title: "تم التصدير",
      description: `تم تصدير الملف بصيغة ${LABEL_BY_FORMAT[format]}.`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "حدث خطأ غير معروف أثناء التصدير.";
    deps.toast({
      title: "تعذر التصدير",
      description: message,
      variant: "destructive",
    });
    deps.recordDiagnostic("تعذر التصدير", message);
    logger.error("Document export failed", {
      scope: "export",
      data: { format, error },
    });
  }
};

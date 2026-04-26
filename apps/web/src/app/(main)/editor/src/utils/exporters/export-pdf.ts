import DOMPurify from "isomorphic-dompurify";
import { jsPDF } from "jspdf";

import {
  type ExportRequest,
  buildFullHtmlDocument,
  sanitizeExportFileBaseName,
} from "./shared";

/**
 * يُصدّر المستند كـ PDF عبر jsPDF + html2canvas.
 *
 * الإصلاح: النسخة القديمة كانت تحقن HTML خام بدون أي CSS.
 * الآن: يبني HTML كامل عبر buildFullHtmlDocument (نفس تنسيقات المحرر)
 * ثم يحوّله لـ PDF.
 */
export const exportAsPdf = async (request: ExportRequest): Promise<void> => {
  const fileBase = sanitizeExportFileBaseName(request.fileNameBase);

  // بناء HTML كامل بالتنسيقات — مثل ما المستخدم شايفه في المحرر
  const styledHtml = buildFullHtmlDocument(request.html, request.title);

  // Sanitize the HTML before injecting it to prevent XSS vulnerabilities
  const sanitizedHtml = DOMPurify.sanitize(styledHtml, {
    WHOLE_DOCUMENT: true,
  });

  // BUG-010: jsPDF.html() يستدعي html2canvas داخلياً، و html2canvas
  // يعدّل viewport المستند بشكل مؤقت لالتقاط المحتوى — ما يسبب
  // تغيير زوم المحرر وتحريك الـ scroll لدى المستخدم.
  //
  // الحل:
  // 1. نلتقط scrollX/scrollY قبل التشغيل ونُعيدها بعده.
  // 2. نستخدم iframe مستقلاً ذا viewport ثابت بدل document الرئيسي،
  //    فيعمل html2canvas داخله بدون مساس بصفحة المستخدم.
  const previousScrollX = window.scrollX;
  const previousScrollY = window.scrollY;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.border = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.visibility = "hidden";
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument;
    if (!iframeDoc) {
      throw new Error("pdf-export: تعذّر تحضير مستند داخلي لـ jsPDF");
    }

    iframeDoc.open();
    iframeDoc.write(sanitizedHtml);
    iframeDoc.close();

    // ننتظر حتى يبني المتصفح شجرة DOM داخل iframe قبل الإلتقاط
    await new Promise<void>((resolve) => {
      if (iframeDoc.readyState === "complete") {
        resolve();
        return;
      }
      iframe.addEventListener("load", () => resolve(), { once: true });
    });

    const innerBody = iframeDoc.body;

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });
    pdf.setR2L(true);

    await pdf.html(innerBody, {
      x: 24,
      y: 24,
      margin: [24, 24, 24, 24],
      autoPaging: "text",
      width: 547,
      windowWidth: 794,
      html2canvas: {
        scale: 1.5,
        useCORS: true,
        logging: false,
        // نمنع html2canvas من تحريك صفحة المستخدم أثناء الالتقاط
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
        windowHeight: 1123,
      },
    });

    pdf.save(`${fileBase}.pdf`);
  } finally {
    iframe.remove();
    // استرجاع موضع التمرير الأصلي كضمان إضافي حتى لا يقفز المحرر
    window.scrollTo(previousScrollX, previousScrollY);
  }
};

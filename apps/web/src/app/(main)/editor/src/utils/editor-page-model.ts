import type { Editor } from "@tiptap/core";
import { CONTENT_HEIGHT_PX } from "../constants";

/**
 * @description إدارة نموذج الصفحات ومراقبتها في محرر السيناريو
 */
export class EditorPageModel {
  private editor: Editor;
  private body: HTMLDivElement;
  private hasPagesExtension: boolean;
  private resizeObserver: ResizeObserver | null = null;
  private paginationObserver: MutationObserver | null = null;
  private estimatedPages = 1;
  private onPageModelChange?: () => void;

  constructor(
    editor: Editor,
    body: HTMLDivElement,
    hasPagesExtension: boolean,
    onPageModelChange?: () => void
  ) {
    this.editor = editor;
    this.body = body;
    this.hasPagesExtension = hasPagesExtension;
    if (onPageModelChange) {
      this.onPageModelChange = onPageModelChange;
    }
  }

  /**
   * @description ربط مراقبي نموذج الصفحات
   */
  bindObservers(): void {
    if (typeof window !== "undefined") {
      window.addEventListener("resize", this.handleWindowResize);
    }

    if (typeof ResizeObserver === "undefined") return;

    const attachObserver = (): void => {
      const editorRoot = this.body.querySelector<HTMLElement>(
        ".filmlane-prosemirror-root, .ProseMirror"
      );
      if (!editorRoot) return;

      this.resizeObserver?.disconnect();
      this.resizeObserver = new ResizeObserver(() => {
        this.refreshPageModel();
        this.onPageModelChange?.();
      });
      this.resizeObserver.observe(editorRoot);
    };

    attachObserver();
    window.setTimeout(attachObserver, 0);

    if (typeof MutationObserver === "undefined") return;

    this.paginationObserver?.disconnect();
    this.paginationObserver = new MutationObserver(() => {
      this.refreshPageModel();
      this.onPageModelChange?.();
    });
    this.paginationObserver.observe(this.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * @description فصل مراقبي نموذج الصفحات
   */
  disconnectObservers(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", this.handleWindowResize);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.paginationObserver?.disconnect();
    this.paginationObserver = null;
  }

  /**
   * @description تحديث نموذج الصفحات
   */
  refreshPageModel(force = false): void {
    const visiblePages = this.normalizeTrailingPagination();
    const pagesFromStorage = this.getPagesFromExtensionStorage();
    const nextPages =
      visiblePages ??
      pagesFromStorage ??
      (this.hasPagesExtension
        ? this.estimatedPages
        : this.measurePageEstimate());

    if (!force && nextPages === this.estimatedPages) return;

    this.estimatedPages = nextPages;
  }

  /**
   * @description إخفاء الصفحات الذيلية الفارغة التي يولّدها امتداد Pages
   *   بعد آخر كتلة محتوى فعلية. نُبقي فوتر الصفحة الأخيرة الظاهرة ونزيل فقط
   *   الفجوة/الهيدر اللاحقين والـ page breaks التالية الفارغة.
   *
   * @returns {number | null} عدد الصفحات الظاهر فعليًا بعد التطبيع، أو `null`
   *   إذا لم تتوفر بعد معطيات كافية من DOM.
   */
  private normalizeTrailingPagination(): number | null {
    const editorRoot = this.body.querySelector<HTMLElement>(
      ".filmlane-prosemirror-root, .ProseMirror"
    );
    if (!editorRoot) return null;

    const paginationRoot = editorRoot.querySelector<HTMLElement>(
      "[data-tiptap-pagination]"
    );
    if (!paginationRoot) return null;

    const pageBreaks = Array.from(
      paginationRoot.querySelectorAll<HTMLElement>(".tiptap-page-break")
    );
    if (pageBreaks.length === 0) return null;

    for (const pageBreak of pageBreaks) {
      delete pageBreak.dataset["filmlaneTerminalPage"];
      delete pageBreak.dataset["filmlaneTrailingPage"];
      pageBreak.style.removeProperty("display");
    }

    const contentBlocks = Array.from(
      editorRoot.querySelectorAll<HTMLElement>("[data-type]")
    );
    const lastContentBlock = contentBlocks.at(-1);
    if (!lastContentBlock) return null;

    const lastContentPage = this.resolveLastContentPage(lastContentBlock);
    if (!lastContentPage || lastContentPage < 1) return null;

    const terminalBreak = pageBreaks.find((pageBreak) =>
      pageBreak.querySelector(
        `.tiptap-page-footer[data-footer-page-number="${lastContentPage}"]`
      )
    );

    if (!terminalBreak) {
      return lastContentPage;
    }

    const terminalBreakIndex = pageBreaks.indexOf(terminalBreak);
    if (terminalBreakIndex < 0) {
      return lastContentPage;
    }

    terminalBreak.dataset["filmlaneTerminalPage"] = "true";

    for (
      let index = terminalBreakIndex + 1;
      index < pageBreaks.length;
      index += 1
    ) {
      const trailingBreak = pageBreaks[index];
      if (!trailingBreak) continue;
      trailingBreak.dataset["filmlaneTrailingPage"] = "true";
      trailingBreak.style.setProperty("display", "none", "important");
    }

    const terminalFooter = terminalBreak.querySelector<HTMLElement>(
      ".tiptap-page-footer"
    );
    if (terminalFooter) {
      const paginationRect = paginationRoot.getBoundingClientRect();
      const footerRect = terminalFooter.getBoundingClientRect();
      const minHeight = Math.max(
        1,
        Math.ceil(footerRect.bottom - paginationRect.top)
      );
      editorRoot.style.minHeight = `${minHeight}px`;
    }

    return lastContentPage;
  }

  /**
   * @description تحديد الصفحة الفعلية لآخر عنصر محتوى.
   *   نفضّل واجهة امتداد Pages نفسها، ونرجع إلى قياس مواضع الفوترات عند الحاجة.
   */
  private resolveLastContentPage(lastContentBlock: HTMLElement): number | null {
    const storage = this.editor.storage as {
      pages?: { getPageForPosition?: (pos: number) => number };
    };
    const getPageForPosition = storage.pages?.getPageForPosition;

    if (typeof getPageForPosition === "function") {
      try {
        const position = this.editor.view.posAtDOM(lastContentBlock, 0);
        const page = getPageForPosition(position);
        if (typeof page === "number" && Number.isFinite(page) && page >= 1) {
          return Math.floor(page);
        }
      } catch {
        /* fallback إلى القياس الهندسي */
      }
    }

    const footers = Array.from(
      this.body.querySelectorAll<HTMLElement>(".tiptap-page-footer")
    );
    if (footers.length === 0) return 1;

    const lastBottom = lastContentBlock.getBoundingClientRect().bottom;
    for (const footer of footers) {
      const footerTop = footer.getBoundingClientRect().top;
      if (lastBottom < footerTop) {
        const pageNumber = Number(footer.dataset["footerPageNumber"] ?? "0");
        if (Number.isFinite(pageNumber) && pageNumber >= 1) {
          return pageNumber;
        }
      }
    }

    return footers.length + 1;
  }

  /**
   * @description قياس تقدير عدد الصفحات
   */
  private measurePageEstimate(): number {
    const editorRoot = this.body.querySelector<HTMLElement>(
      ".filmlane-prosemirror-root, .ProseMirror"
    );
    if (!editorRoot) return 1;

    const pageBodyHeight = Math.max(1, CONTENT_HEIGHT_PX);
    const contentHeight = Math.max(1, editorRoot.scrollHeight);
    return Math.max(1, Math.ceil(contentHeight / pageBodyHeight));
  }

  /**
   * @description الحصول على عدد الصفحات من امتداد الصفحات
   */
  private getPagesFromExtensionStorage(): number | null {
    const storage = this.editor.storage as {
      pages?: { getPageCount?: () => number };
    };
    const pages = storage.pages?.getPageCount?.();
    if (typeof pages !== "number" || !Number.isFinite(pages)) return null;
    return Math.max(1, Math.floor(pages));
  }

  /**
   * @description معالج تغيير حجم النافذة
   */
  private handleWindowResize = (): void => {
    this.refreshPageModel();
    this.onPageModelChange?.();
  };

  /**
   * @description الحصول على عدد الصفحات المقدر
   */
  get estimatedPagesCount(): number {
    return this.estimatedPages;
  }
}

import type { Editor } from "@tiptap/core";

/**
 * @description خوارزميات إصلاح مشكلة "الشخصية اليتيمة" (Character Widow Fix)
 *
 * المشكلة: عندما ينتهي اسم الشخصية في أسفل الصفحة ولا يتبعه حوار في نفس الصفحة
 * الحل: دفع الشخصية إلى الصفحة التالية لضمان ظهور الحوار معها
 */

type GetPageFn = (pos: number) => number;

interface PushResult {
  target: HTMLElement;
  prop: string;
  amount: number;
}

// — يمسح جميع إصلاحات widow السابقة من الجذر
function clearPreviousFixes(editorRoot: HTMLElement): void {
  const previouslyFixed = editorRoot.querySelectorAll<HTMLElement>(
    "[data-character-widow-fix]"
  );
  for (const el of previouslyFixed) {
    const prop = el.getAttribute("data-character-widow-fix") ?? "margin-top";
    el.style.removeProperty(prop);
    el.removeAttribute("data-character-widow-fix");
  }
  void editorRoot.offsetHeight;
}

// — يحسب المساحة المتبقية أسفل العنصر داخل الصفحة
function computeSpaceBelow(current: HTMLElement, page: Element): number {
  const charRect = current.getBoundingClientRect();
  const footer = page.querySelector(".tiptap-page-footer");
  const contentBottom = footer
    ? footer.getBoundingClientRect().top
    : page.getBoundingClientRect().bottom;
  return contentBottom - charRect.bottom;
}

// — يتحقق من كون الشخصية يتيمة عبر الفحص الهندسي
function isWidowByGeometry(spaceBelow: number, charHeight: number): boolean {
  return spaceBelow >= 0 && spaceBelow < charHeight * 1.5;
}

// — يتحقق من كون الشخصية يتيمة عبر واجهة امتداد الصفحات
function isWidowByPageExtension(
  editor: Editor,
  current: HTMLElement,
  next: HTMLElement,
  getPageFn: GetPageFn
): boolean {
  try {
    const p1 = getPageFn(editor.view.posAtDOM(current, 0));
    const p2 = getPageFn(editor.view.posAtDOM(next, 0));
    return p1 !== p2;
  } catch {
    return false;
  }
}

// — يتحقق من كون الشخصية يتيمة عبر حاويات DOM
function isWidowByDomContainers(page: Element, next: HTMLElement): boolean {
  const nextPage = next.closest(".tiptap-page, .page");
  return nextPage !== null && page !== nextPage;
}

// — يُحدد هدف الدفع والمبلغ ومعرّف الخاصية
function resolvePushTarget(
  current: HTMLElement,
  prev: HTMLElement | null,
  page: Element,
  spaceBelow: number,
  charHeight: number
): PushResult {
  const effectiveSpaceBelow = Math.max(0, spaceBelow);
  const prevPage = prev ? prev.closest(".tiptap-page, .page") : null;

  if (prev && prevPage === page) {
    return {
      target: prev,
      prop: "margin-bottom",
      amount: Math.ceil(effectiveSpaceBelow) + 4,
    };
  }

  return {
    target: current,
    prop: "margin-top",
    amount: Math.ceil(effectiveSpaceBelow + charHeight) + 4,
  };
}

// — يعالج كتلة شخصية واحدة ويُحدد ما إذا كانت يتيمة ثم يُطبّق الإصلاح
function processCharacterBlock(
  editor: Editor,
  allBlocks: HTMLElement[],
  i: number,
  page: Element,
  getPageFn: GetPageFn | undefined
): boolean {
  const current = allBlocks[i];
  if (!current) return false;

  const charRect = current.getBoundingClientRect();
  const spaceBelow = computeSpaceBelow(current, page);

  const prev = i > 0 ? (allBlocks[i - 1] ?? null) : null;
  const next = i + 1 < allBlocks.length ? (allBlocks[i + 1] ?? null) : null;

  let isWidow = isWidowByGeometry(spaceBelow, charRect.height);

  if (!isWidow && next && typeof getPageFn === "function") {
    isWidow = isWidowByPageExtension(editor, current, next, getPageFn);
  }

  if (!isWidow && next) {
    isWidow = isWidowByDomContainers(page, next);
  }

  if (!isWidow) return false;

  const { target, prop, amount } = resolvePushTarget(
    current,
    prev,
    page,
    spaceBelow,
    charRect.height
  );

  target.style.setProperty(prop, `${amount}px`, "important");
  target.setAttribute("data-character-widow-fix", prop);
  return true;
}

export class CharacterWidowFixer {
  private rafId: number | null = null;
  private applyingFix = false;

  /**
   * @description جدولة إصلاح الشخصية اليتيمة في الإطار التالي
   */
  schedule(editor: Editor): void {
    if (typeof window === "undefined") return;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
    }

    this.rafId = window.requestAnimationFrame(() => {
      this.rafId = null;
      this.apply(editor);
    });
  }

  /**
   * @description إلغاء جدولة الإصلاح
   */
  cancel(): void {
    if (typeof window === "undefined" || this.rafId === null) return;
    window.cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  /**
   * @description تطبيق إصلاح الشخصية اليتيمة
   */
  private apply(editor: Editor): void {
    if (this.applyingFix) return;

    const editorRoot = document.querySelector<HTMLElement>(
      ".filmlane-prosemirror-root, .ProseMirror"
    );
    if (!editorRoot) return;

    clearPreviousFixes(editorRoot);

    const allBlocks = Array.from(
      editorRoot.querySelectorAll<HTMLElement>("[data-type]")
    );
    if (allBlocks.length === 0) return;

    const pagesStorage = editor.storage as {
      pages?: { getPageForPosition?: GetPageFn };
    };
    const getPageFn = pagesStorage.pages?.getPageForPosition;

    let hasAdjustment = false;

    for (let i = 0; i < allBlocks.length; i += 1) {
      const current = allBlocks[i];
      if (!current) continue;
      if (current.getAttribute("data-type") !== "character") continue;

      const page = current.closest(".tiptap-page, .page");
      if (!page) continue;

      const adjusted = processCharacterBlock(
        editor,
        allBlocks,
        i,
        page,
        getPageFn
      );
      if (adjusted) hasAdjustment = true;
    }

    if (!hasAdjustment) return;

    this.applyingFix = true;
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          this.applyingFix = false;
        });
      });
    } else {
      this.applyingFix = false;
    }
  }

  /**
   * @description التحقق من حالة التطبيق الحالية
   */
  get isApplyingFix(): boolean {
    return this.applyingFix;
  }
}

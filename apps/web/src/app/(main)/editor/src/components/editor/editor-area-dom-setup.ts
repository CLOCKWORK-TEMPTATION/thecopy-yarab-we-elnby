import {
  applyLayoutMetrics,
  applyEditorTypography,
} from "../../utils/editor-layout";

/**
 * @description ينشئ هيكل DOM لمنطقة المحرر: ورقة السيناريو + جسم التحرير +
 * تلميح إمكانية الوصول، ويُضيفها إلى عنصر الإيداع (mount).
 *
 * @returns body — عنصر div التحرير الداخلي المراد تمرير المحرر إليه.
 */
export function buildEditorMount(mount: HTMLElement): HTMLDivElement {
  const sheet = document.createElement("div");
  sheet.className = "screenplay-sheet filmlane-sheet-paged";
  sheet.style.height = "auto";
  sheet.style.overflow = "hidden";
  sheet.style.minHeight = "var(--page-height)";
  // — دلالة بصرية/وصفية للقراء الآليين —
  sheet.setAttribute("role", "document");
  sheet.setAttribute("aria-label", "ورقة السيناريو");
  sheet.setAttribute("lang", "ar");

  const body = document.createElement("div");
  body.className = "screenplay-sheet__body";
  // — A11Y-09: تعريف دلالي لمنطقة التحرير —
  body.setAttribute("role", "textbox");
  body.setAttribute("aria-multiline", "true");
  body.setAttribute("aria-label", "محرر السيناريو");
  body.setAttribute("aria-describedby", "screenplay-editor-hint");
  body.setAttribute("spellcheck", "true");
  body.setAttribute("lang", "ar");

  // — تلميح مخفي بصرياً لقراء الشاشة —
  const hint = document.createElement("span");
  hint.id = "screenplay-editor-hint";
  hint.className = "sr-only";
  hint.textContent =
    "محرر نصي متعدد الأسطر لكتابة السيناريو. استخدم Ctrl+0 حتى Ctrl+7 لتبديل نوع العنصر. اضغط Tab للخروج من المحرر.";

  applyLayoutMetrics(sheet);
  applyEditorTypography(body);
  sheet.appendChild(body);

  mount.innerHTML = "";
  mount.appendChild(hint);
  mount.appendChild(sheet);

  return body;
}

import React from "react";
import type { DocumentStats } from "../editor/editor-area.types";

/**
 * @description خصائص مكون ذيل المحرر (App Footer).
 *   يعرض إحصائيات المستند الحية: الصفحات، الكلمات، الأحرف، المشاهد،
 *   بالإضافة إلى تنسيق العنصر الحالي تحت المؤشر.
 */
export interface AppFooterProps {
  stats: DocumentStats;
  currentFormatLabel: string;
  isMobile: boolean;
}

/**
 * @description تُنسِّق رقمًا إلى شكل نصي بفواصل عربية للآلاف لضمان القراءة الواضحة.
 */
const formatCount = (value: number): string =>
  new Intl.NumberFormat("ar-EG").format(Math.max(0, value));

/**
 * ذيل المحرر.
 *
 * إعادة تصميم بصري فقط: تحوّل من شريط سفلي ممتد داكن إلى مجموعة
 * badges عائمة في أسفل الصفحة. نفس القيم، نفس الـ data-testid،
 * نفس التحديثات الحية (aria-live) — فقط طريقة العرض تغيرت.
 */
export function AppFooter({
  stats,
  currentFormatLabel,
  isMobile,
}: AppFooterProps): React.JSX.Element {
  const pagesText = `${formatCount(stats.pages)} صفحة`;
  const wordsText = `${formatCount(stats.words)} كلمة`;
  const charactersText = `${formatCount(stats.characters)} حرف`;
  const scenesText = `${formatCount(stats.scenes)} مشهد`;

  return (
    <footer
      className="app-footer pointer-events-none relative z-30 flex-shrink-0 px-6 pt-2 pb-4 text-[11px]"
      style={{ direction: "rtl" }}
      data-testid="app-footer"
      role="contentinfo"
      aria-label="شريط إحصائيات المستند"
    >
      <div
        className={`pointer-events-auto flex items-center ${
          isMobile ? "flex-wrap gap-2" : "justify-between gap-3"
        }`}
      >
        <div
          className="flex flex-wrap items-center gap-2"
          aria-live="polite"
          aria-atomic="false"
        >
          <span
            className="app-footer-badge flex items-center gap-1.5 px-3 py-1"
            data-testid="footer-stat-pages"
            aria-label={`عدد الصفحات ${pagesText}`}
          >
            <span className="text-[color:var(--mf-text-muted)]">
              {pagesText}
            </span>
          </span>

          <span
            className="app-footer-badge flex items-center gap-1.5 px-3 py-1"
            data-testid="footer-stat-words"
            aria-label={`عدد الكلمات ${wordsText}`}
          >
            <span className="text-[color:var(--mf-text-muted)]">
              {wordsText}
            </span>
          </span>

          <span
            className="app-footer-badge flex items-center gap-1.5 px-3 py-1"
            data-testid="footer-stat-scenes"
            aria-label={`عدد المشاهد ${scenesText}`}
          >
            <span className="text-[color:var(--mf-text-muted)]">
              {scenesText}
            </span>
          </span>

          {!isMobile && (
            <span
              className="app-footer-badge flex items-center gap-1.5 px-3 py-1"
              data-testid="footer-stat-characters"
              aria-label={`عدد الأحرف ${charactersText}`}
            >
              <span className="text-[color:var(--mf-text-muted)]">
                {charactersText}
              </span>
            </span>
          )}
        </div>

        <div
          className="app-footer-badge flex items-center gap-2 px-3 py-1"
          data-variant="accent"
          aria-live="polite"
        >
          <span
            className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
            aria-hidden="true"
          />
          <span data-testid="footer-current-format" className="font-semibold">
            {currentFormatLabel}
          </span>
        </div>
      </div>
    </footer>
  );
}

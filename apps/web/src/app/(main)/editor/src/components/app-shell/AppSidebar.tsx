import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import {
  EDITOR_SHELL_SIDEBAR_BOTTOM_PX,
  EDITOR_SHELL_SIDEBAR_RIGHT_PX,
  EDITOR_SHELL_SIDEBAR_TOP_PX,
} from "../../constants/shell-layout";

export interface AppSidebarSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: readonly string[];
}

export interface AppSidebarProps {
  sections: readonly AppSidebarSection[];
  openSectionId: string | null;
  isMobile: boolean;
  onToggleSection: (sectionId: string) => void;
  onItemAction: (sectionId: string, itemLabel: string) => void;
  settingsPanel: React.ReactNode;
  /**
   * نص المحرر الحالي — يُستخدم لحساب عدد مطابقات البحث داخل المستند.
   * عند تزويده، يظهر قسم «نتائج من المحرر» في نتائج البحث (BUG-005).
   */
  documentText?: string;
  /**
   * يُستدعى عند الضغط على نتيجة المحرر — يطلب من الأب الانتقال
   * إلى أول مطابقة داخل المحرر (تحديد + scrollIntoView).
   */
  onEditorSearchJump?: (query: string) => void;
}

/**
 * الشريط الجانبي للمحرر.
 *
 * إعادة تصميم بصري فقط: تحولت اللوحة من خلفية داكنة إلى "بطاقة عائمة"
 * بيضاء دافئة فوق سطح ورقي. حوافها ناعمة، ظلها واسع وخفيف، والنص داكن.
 * لم يتغير أي سلوك: البحث، التصفية، فتح/طي الأقسام، حقن لوحة الإعدادات،
 * ومنطق onItemAction — جميعها محفوظة كما هي.
 */
export function AppSidebar({
  sections,
  openSectionId,
  isMobile: _isMobile,
  onToggleSection,
  onItemAction,
  settingsPanel,
  documentText = "",
  onEditorSearchJump,
}: AppSidebarProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const visibleSections = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        filteredItems:
          normalizedQuery.length === 0
            ? section.items
            : section.items.filter((item) =>
                item.toLowerCase().includes(normalizedQuery)
              ),
      })),
    [normalizedQuery, sections]
  );

  /**
   * حساب عدد مطابقات البحث داخل نص المحرر (غير حساس للحالة).
   * السبب: QA أشار إلى أن البحث في الشريط الجانبي لا يرى محتوى
   * المحرر — كلمة «أمين» موجودة لكنه يُرجع «لا توجد نتائج» (BUG-005).
   */
  const editorMatchCount = useMemo(() => {
    if (normalizedQuery.length === 0) return 0;
    if (!documentText) return 0;
    const haystack = documentText.toLowerCase();
    let count = 0;
    let index = 0;
    while ((index = haystack.indexOf(normalizedQuery, index)) !== -1) {
      count += 1;
      index += normalizedQuery.length;
    }
    return count;
  }, [normalizedQuery, documentText]);

  /**
   * مقتطف قصير من نص المحرر يحيط بأول مطابقة — لعرضه كمعاينة
   * أسفل زر النتائج. يُظهر المستخدم أن البحث عثر على السياق الصحيح.
   */
  const editorMatchPreview = useMemo(() => {
    if (editorMatchCount === 0) return "";
    const idx = documentText.toLowerCase().indexOf(normalizedQuery);
    if (idx === -1) return "";
    const start = Math.max(0, idx - 24);
    const end = Math.min(
      documentText.length,
      idx + normalizedQuery.length + 24
    );
    const prefix = start > 0 ? "…" : "";
    const suffix = end < documentText.length ? "…" : "";
    return `${prefix}${documentText.slice(start, end).replace(/\s+/g, " ").trim()}${suffix}`;
  }, [editorMatchCount, documentText, normalizedQuery]);

  const hasAnySearchResult =
    normalizedQuery.length === 0 ||
    editorMatchCount > 0 ||
    visibleSections.some((section) => section.filteredItems.length > 0);

  return (
    <aside
      className="app-sidebar fixed z-30 flex w-72 flex-col"
      style={{
        top: `${EDITOR_SHELL_SIDEBAR_TOP_PX}px`,
        right: `${EDITOR_SHELL_SIDEBAR_RIGHT_PX}px`,
        bottom: `${EDITOR_SHELL_SIDEBAR_BOTTOM_PX}px`,
        maxHeight: `calc(100vh - ${EDITOR_SHELL_SIDEBAR_TOP_PX + EDITOR_SHELL_SIDEBAR_BOTTOM_PX}px)`,
      }}
      data-layout-mode="fixed-desktop"
      data-testid="app-sidebar"
      aria-label="الشريط الجانبي للمحرر"
    >
      <div className="app-sidebar-card relative z-[2] flex h-full min-h-0 w-full flex-col items-stretch overflow-hidden p-4">
        <HoverBorderGradient
          containerClassName="rounded-xl mb-6"
          className="flex w-full items-center gap-2 rounded-xl bg-transparent px-3 py-3 text-[color:var(--mf-text-muted)]"
          duration={2}
        >
          <Search
            className="size-4 transition-colors group-focus-within:text-[color:var(--mf-accent)]"
            aria-hidden="true"
          />
          <input
            id="sidebar-search"
            name="sidebar-search"
            type="text"
            autoComplete="off"
            spellCheck={false}
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            suppressHydrationWarning
            placeholder="بحث..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            data-testid="sidebar-search"
            className="w-full border-none bg-transparent text-[13px] text-[color:var(--mf-text)] placeholder:text-[color:var(--mf-text-faint)] focus:outline-none"
          />
          <kbd className="hidden rounded border border-[color:var(--mf-border)] bg-white px-1.5 py-0.5 text-[10px] group-hover:block">
            ⌘K
          </kbd>
        </HoverBorderGradient>

        <div
          className="scrollbar-none min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
          data-testid="sidebar-sections-scroll"
        >
          {!hasAnySearchResult && (
            <div className="app-sidebar-focus-tip px-3 py-2 text-right text-xs">
              لا توجد نتائج مطابقة للبحث.
            </div>
          )}

          {normalizedQuery.length > 0 && editorMatchCount > 0 && (
            <div className="mb-3" data-testid="sidebar-editor-search-results">
              <HoverBorderGradient
                as="button"
                type="button"
                suppressHydrationWarning
                onClick={() => {
                  if (onEditorSearchJump) {
                    onEditorSearchJump(searchQuery.trim());
                  }
                }}
                containerClassName="rounded-xl w-full"
                className="app-sidebar-section group flex w-full flex-col items-stretch gap-1 rounded-xl bg-transparent p-3 text-right text-[color:var(--mf-text-muted)] transition-all duration-200 hover:text-[color:var(--mf-text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--mf-accent)]/60 focus-visible:outline-none"
                duration={2}
              >
                <span className="flex items-center justify-between gap-2 text-sm font-medium">
                  <span className="text-[11px] font-normal text-[color:var(--mf-text-faint)]">
                    اضغط للانتقال
                  </span>
                  <span>
                    {editorMatchCount === 1
                      ? "نتيجة واحدة في المحرر"
                      : `${editorMatchCount} نتائج في المحرر`}
                  </span>
                </span>
                {editorMatchPreview && (
                  <span className="truncate text-[11px] text-[color:var(--mf-text-faint)]">
                    {editorMatchPreview}
                  </span>
                )}
              </HoverBorderGradient>
            </div>
          )}

          {visibleSections.map((section) => {
            const SIcon = section.icon;
            const isOpen = openSectionId === section.id;
            const visibleItems = section.filteredItems;
            const hasItems = visibleItems.length > 0;
            const shouldRenderSection =
              normalizedQuery.length === 0 ||
              hasItems ||
              section.id === "settings";

            if (!shouldRenderSection) {
              return null;
            }

            return (
              <div key={section.id} className="mb-2">
                <HoverBorderGradient
                  as="button"
                  type="button"
                  suppressHydrationWarning
                  data-open={isOpen ? "true" : "false"}
                  onClick={() => onToggleSection(section.id)}
                  containerClassName="rounded-xl w-full"
                  className={`app-sidebar-section group flex w-full items-center gap-3 rounded-xl bg-transparent p-3 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-[color:var(--mf-accent)]/60 focus-visible:outline-none ${
                    isOpen
                      ? "text-[color:var(--mf-text-strong)]"
                      : "text-[color:var(--mf-text-muted)] hover:text-[color:var(--mf-text-strong)]"
                  }`}
                  duration={2}
                >
                  <SIcon
                    className={`size-[18px] transition-colors ${
                      isOpen
                        ? "text-[color:var(--mf-text-strong)]"
                        : "text-[color:var(--mf-text-muted)] group-hover:text-[color:var(--mf-text-strong)]"
                    }`}
                  />
                  <span className="flex-1 text-right text-sm font-medium">
                    {section.label}
                  </span>
                  {section.items.length > 0 && (
                    <span
                      className={`text-[color:var(--mf-text-faint)] transition-transform duration-300 ${
                        isOpen ? "-rotate-90" : ""
                      }`}
                    >
                      {hasItems ? "‹" : "·"}
                    </span>
                  )}
                </HoverBorderGradient>

                {isOpen && hasItems && (
                  <div className="mt-2 space-y-1 pr-4">
                    {visibleItems.map((item) => (
                      <HoverBorderGradient
                        as="button"
                        type="button"
                        suppressHydrationWarning
                        key={`${section.id}-${item}`}
                        onClick={() => onItemAction(section.id, item)}
                        containerClassName="rounded-lg w-full"
                        className="app-sidebar-item flex w-full items-center gap-2 rounded-lg bg-transparent px-3 py-2 text-xs text-[color:var(--mf-text-muted)] transition-colors hover:text-[color:var(--mf-text-strong)] focus-visible:ring-2 focus-visible:ring-[color:var(--mf-accent)]/60 focus-visible:outline-none"
                        duration={2}
                      >
                        <span
                          className="h-1 w-1 rounded-full bg-[color:var(--mf-text-faint)]"
                          aria-hidden="true"
                        />
                        {item}
                      </HoverBorderGradient>
                    ))}
                  </div>
                )}

                {isOpen &&
                  !hasItems &&
                  section.id !== "settings" &&
                  normalizedQuery.length > 0 && (
                    <div className="app-sidebar-focus-tip mt-2 px-3 py-2 text-right text-[11px]">
                      لا توجد عناصر لهذا القسم حسب البحث الحالي.
                    </div>
                  )}

                {isOpen && section.id === "settings" && settingsPanel}
              </div>
            );
          })}
        </div>

        <div className="mt-auto">
          <div className="app-sidebar-focus-tip flex w-full flex-col items-start p-4">
            <span
              className="mb-2 text-base text-[color:var(--mf-accent)]"
              aria-hidden="true"
            >
              ✦
            </span>
            <p className="text-xs leading-relaxed font-light text-[color:var(--mf-text-muted)]">
              تم تفعيل وضع التركيز الذكي. استمتع بتجربة كتابة خالية من المشتتات.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

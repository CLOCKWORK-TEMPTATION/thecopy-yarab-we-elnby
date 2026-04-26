import { User, type LucideIcon } from "lucide-react";
import React, { useCallback, useEffect, useId, useMemo, useRef } from "react";

import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

import type { ProgressiveSurfaceState } from "../editor";

/**
 * عنصر قائمة واحد داخل قائمة منسدلة من قوائم الهيدر.
 */
export interface AppShellMenuItem {
  label: string;
  actionId: string;
  shortcut?: string;
  icon?: LucideIcon;
  iconGlyph?: string;
  disabled?: boolean;
}

/**
 * قسم قائمة علوي (ملف، تعديل، إضافة، أدوات، مساعدة).
 */
export interface AppShellMenuSection {
  label: string;
  items: readonly AppShellMenuItem[];
}

export interface AppHeaderProps {
  menuSections: readonly AppShellMenuSection[];
  activeMenu: string | null;
  onToggleMenu: (sectionLabel: string) => void;
  activeProjectTitle: string | null;
  progressiveSurfaceState: ProgressiveSurfaceState | null;
  onApproveVisibleVersion: () => void;
  onDismissFailure: () => void;
  onAction: (actionId: string) => void;
  infoDotColor: string;
  brandGradient: string;
  onlineDotColor: string;
}

const toTestId = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, "-");

const isEnabled = (item: AppShellMenuItem): boolean => !item.disabled;

/**
 * شريط القوائم العلوي للمحرر.
 *
 * إعادة التصميم البصرية فقط: تحويل الشريط الممتد إلى مجموعات عائمة (clusters)
 * فوق سطح ورقي دافئ. كل السلوكيات (WAI-ARIA Menubar، تنقل الأسهم،
 * فتح/إغلاق القوائم، تركيز أول عنصر، Escape/Tab/Enter، RTL navigation)
 * محفوظة بالكامل بدون تعديل.
 */
export function AppHeader({
  menuSections,
  activeMenu,
  onToggleMenu,
  activeProjectTitle,
  progressiveSurfaceState,
  onApproveVisibleVersion,
  onDismissFailure,
  onAction,
  infoDotColor,
  brandGradient,
  onlineDotColor,
}: AppHeaderProps): React.JSX.Element {
  const menubarId = useId();
  const menubarButtonRefs = useRef<Record<string, HTMLButtonElement | null>>(
    {}
  );
  const menuItemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const previouslyActiveMenuRef = useRef<string | null>(null);
  const pendingFocusFirstItemRef = useRef<string | null>(null);

  const activeRun = progressiveSurfaceState?.activeRun ?? null;
  const visibleVersion = progressiveSurfaceState?.visibleVersion ?? null;
  const approvalEligible =
    activeRun?.status === "settled" &&
    visibleVersion?.approvalEligible === true;
  const isApproved = activeRun?.status === "approved";
  const hasRecoverableFailure =
    activeRun?.status === "failed-after-visible" &&
    activeRun.failureRecoveryRequired;
  const statusLabel = isApproved
    ? "معتمد"
    : hasRecoverableFailure
      ? "فشل بعد الظهور"
      : activeRun?.status === "settled"
        ? "مستقر"
        : activeRun?.surfaceLocked
          ? "قيد المعالجة"
          : "جاهز";

  const sectionIndex = useMemo(() => {
    const map = new Map<string, number>();
    menuSections.forEach((section, index) => map.set(section.label, index));
    return map;
  }, [menuSections]);

  const getSiblingSectionLabel = useCallback(
    (
      fromLabel: string,
      direction: "next" | "prev" | "first" | "last"
    ): string | null => {
      if (menuSections.length === 0) return null;
      if (direction === "first") return menuSections[0]?.label ?? null;
      if (direction === "last")
        return menuSections[menuSections.length - 1]?.label ?? null;
      const currentIndex = sectionIndex.get(fromLabel);
      if (currentIndex === undefined) return null;
      const delta = direction === "next" ? 1 : -1;
      const nextIndex =
        (currentIndex + delta + menuSections.length) % menuSections.length;
      return menuSections[nextIndex]?.label ?? null;
    },
    [menuSections, sectionIndex]
  );

  const focusSectionButton = useCallback((sectionLabel: string): void => {
    const target = menubarButtonRefs.current[sectionLabel];
    if (target) {
      target.focus();
    }
  }, []);

  const focusMenuItem = useCallback(
    (sectionLabel: string, itemIndex: number): void => {
      const key = `${sectionLabel}::${itemIndex}`;
      const target = menuItemRefs.current[key];
      if (target) {
        target.focus();
      }
    },
    []
  );

  const getFirstEnabledIndex = useCallback(
    (section: AppShellMenuSection): number => {
      return section.items.findIndex(isEnabled);
    },
    []
  );

  const getLastEnabledIndex = useCallback(
    (section: AppShellMenuSection): number => {
      for (let i = section.items.length - 1; i >= 0; i -= 1) {
        const candidate = section.items[i];
        if (candidate && isEnabled(candidate)) return i;
      }
      return -1;
    },
    []
  );

  const stepEnabledIndex = useCallback(
    (
      section: AppShellMenuSection,
      fromIndex: number,
      direction: 1 | -1
    ): number => {
      const length = section.items.length;
      if (length === 0) return -1;
      let cursor = fromIndex;
      for (let step = 0; step < length; step += 1) {
        cursor = (cursor + direction + length) % length;
        const candidate = section.items[cursor];
        if (candidate && isEnabled(candidate)) return cursor;
      }
      return -1;
    },
    []
  );

  useEffect(() => {
    if (activeMenu && previouslyActiveMenuRef.current !== activeMenu) {
      const section = menuSections.find((item) => item.label === activeMenu);
      if (section) {
        const targetIndex =
          pendingFocusFirstItemRef.current === activeMenu
            ? getFirstEnabledIndex(section)
            : getFirstEnabledIndex(section);
        if (targetIndex >= 0) {
          requestAnimationFrame(() => {
            focusMenuItem(activeMenu, targetIndex);
          });
        }
      }
      pendingFocusFirstItemRef.current = null;
    }

    if (!activeMenu && previouslyActiveMenuRef.current) {
      const lastLabel = previouslyActiveMenuRef.current;
      requestAnimationFrame(() => {
        focusSectionButton(lastLabel);
      });
    }

    previouslyActiveMenuRef.current = activeMenu;
  }, [
    activeMenu,
    menuSections,
    focusMenuItem,
    focusSectionButton,
    getFirstEnabledIndex,
  ]);

  const handleSectionButtonKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      sectionLabel: string
    ): void => {
      const key = event.key;
      if (key === "ArrowRight") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "prev");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "ArrowLeft") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "next");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "first");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "End") {
        event.preventDefault();
        const target = getSiblingSectionLabel(sectionLabel, "last");
        if (target) focusSectionButton(target);
        return;
      }
      if (key === "ArrowDown" || key === "Enter" || key === " ") {
        event.preventDefault();
        pendingFocusFirstItemRef.current = sectionLabel;
        if (activeMenu !== sectionLabel) {
          onToggleMenu(sectionLabel);
        } else {
          const section = menuSections.find(
            (item) => item.label === sectionLabel
          );
          if (section) {
            const firstIndex = getFirstEnabledIndex(section);
            if (firstIndex >= 0) focusMenuItem(sectionLabel, firstIndex);
          }
        }
        return;
      }
      if (key === "Escape") {
        if (activeMenu) {
          event.preventDefault();
          onToggleMenu(activeMenu);
        }
      }
    },
    [
      activeMenu,
      onToggleMenu,
      menuSections,
      focusMenuItem,
      focusSectionButton,
      getFirstEnabledIndex,
      getSiblingSectionLabel,
    ]
  );

  const handleMenuItemKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLButtonElement>,
      sectionLabel: string,
      itemIndex: number
    ): void => {
      const key = event.key;
      const section = menuSections.find((item) => item.label === sectionLabel);
      if (!section) return;

      if (key === "ArrowDown") {
        event.preventDefault();
        const next = stepEnabledIndex(section, itemIndex, 1);
        if (next >= 0) focusMenuItem(sectionLabel, next);
        return;
      }
      if (key === "ArrowUp") {
        event.preventDefault();
        const prev = stepEnabledIndex(section, itemIndex, -1);
        if (prev >= 0) focusMenuItem(sectionLabel, prev);
        return;
      }
      if (key === "Home") {
        event.preventDefault();
        const first = getFirstEnabledIndex(section);
        if (first >= 0) focusMenuItem(sectionLabel, first);
        return;
      }
      if (key === "End") {
        event.preventDefault();
        const last = getLastEnabledIndex(section);
        if (last >= 0) focusMenuItem(sectionLabel, last);
        return;
      }
      if (key === "Escape") {
        event.preventDefault();
        onToggleMenu(sectionLabel);
        focusSectionButton(sectionLabel);
        return;
      }
      if (key === "Tab") {
        if (activeMenu === sectionLabel) {
          onToggleMenu(sectionLabel);
        }
        return;
      }
      if (key === "ArrowRight" || key === "ArrowLeft") {
        event.preventDefault();
        const direction = key === "ArrowRight" ? "prev" : "next";
        const target = getSiblingSectionLabel(sectionLabel, direction);
        if (!target) return;
        if (activeMenu === sectionLabel) {
          onToggleMenu(sectionLabel);
        }
        pendingFocusFirstItemRef.current = target;
        onToggleMenu(target);
        return;
      }
      if (key === "Enter" || key === " ") {
        event.preventDefault();
        const targetItem = section.items[itemIndex];
        if (targetItem && isEnabled(targetItem)) {
          onAction(targetItem.actionId);
        }
      }
    },
    [
      activeMenu,
      menuSections,
      onAction,
      onToggleMenu,
      focusMenuItem,
      focusSectionButton,
      getFirstEnabledIndex,
      getLastEnabledIndex,
      getSiblingSectionLabel,
      stepEnabledIndex,
    ]
  );

  return (
    <header
      className="app-header relative z-40 flex h-[68px] flex-shrink-0 items-center justify-between px-6"
      data-app-menu-root="true"
      data-testid="app-header"
      role="banner"
    >
      {/* مجموعة يمين (بصريًا في RTL): الهوية + شريط القوائم */}
      <div className="app-header-primary flex items-center gap-3">
        <HoverBorderGradient
          containerClassName="app-header-brand rounded-full"
          className="flex h-11 items-center gap-2.5 bg-transparent px-5"
          duration={2}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: infoDotColor,
              boxShadow: `0 0 8px ${infoDotColor}66`,
            }}
            aria-hidden="true"
          />
          <span
            className="bg-clip-text text-[15px] font-bold text-transparent"
            style={{ backgroundImage: brandGradient }}
          >
            أفان تيتر
          </span>
        </HoverBorderGradient>

        <HoverBorderGradient
          as="div"
          role="menubar"
          aria-label="شريط القوائم الرئيسي"
          aria-orientation="horizontal"
          id={menubarId}
          containerClassName="app-header-menubar rounded-full"
          className="relative z-50 flex h-11 items-center gap-1 bg-transparent p-1"
          duration={2}
        >
          {menuSections.map((section) => {
            const sectionTestId = toTestId(section.label);
            const menuId = `${menubarId}-menu-${sectionTestId}`;
            const buttonId = `${menubarId}-button-${sectionTestId}`;
            const isOpen = activeMenu === section.label;
            return (
              <div
                key={section.label}
                className="group relative h-full"
                onClick={(event) => {
                  event.stopPropagation();
                }}
              >
                <button
                  type="button"
                  id={buttonId}
                  ref={(element) => {
                    menubarButtonRefs.current[section.label] = element;
                  }}
                  role="menuitem"
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  aria-controls={isOpen ? menuId : undefined}
                  tabIndex={activeMenu ? (isOpen ? 0 : -1) : 0}
                  className={`flex h-full min-w-[72px] items-center justify-center rounded-full px-4 text-[13px] font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--mf-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                    isOpen
                      ? "bg-[color:var(--mf-surface-soft)] text-[color:var(--mf-text-strong)] shadow-inner"
                      : "bg-transparent text-[color:var(--mf-text-muted)] hover:bg-[color:var(--mf-surface-soft)] hover:text-[color:var(--mf-text-strong)]"
                  }`}
                  onClick={() => onToggleMenu(section.label)}
                  onKeyDown={(event) =>
                    handleSectionButtonKeyDown(event, section.label)
                  }
                  data-testid={`menu-section-${sectionTestId}`}
                >
                  {section.label}
                </button>

                {isOpen && (
                  <div
                    id={menuId}
                    role="menu"
                    aria-label={section.label}
                    aria-orientation="vertical"
                    className="mf-surface absolute top-full right-0 z-50 mt-2 min-w-[220px] overflow-hidden p-1.5"
                  >
                    {section.items.map((item, itemIndex) => {
                      const itemKey = `${section.label}::${itemIndex}`;
                      return (
                        <button
                          type="button"
                          key={itemKey}
                          role="menuitem"
                          ref={(element) => {
                            menuItemRefs.current[itemKey] = element;
                          }}
                          disabled={item.disabled}
                          aria-disabled={item.disabled ? true : undefined}
                          tabIndex={-1}
                          onClick={() => {
                            if (!isEnabled(item)) return;
                            onAction(item.actionId);
                          }}
                          onKeyDown={(event) =>
                            handleMenuItemKeyDown(
                              event,
                              section.label,
                              itemIndex
                            )
                          }
                          data-testid={`menu-action-${item.actionId}`}
                          className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-[13px] transition-colors outline-none ${
                            item.disabled
                              ? "cursor-not-allowed text-[color:var(--mf-text-faint)]"
                              : "text-[color:var(--mf-text)] hover:bg-[color:var(--mf-surface-soft)] hover:text-[color:var(--mf-text-strong)] focus-visible:bg-[color:var(--mf-surface-soft)] focus-visible:text-[color:var(--mf-text-strong)]"
                          }`}
                        >
                          <span className="flex-1 text-right">
                            {item.label}
                          </span>
                          {item.shortcut && (
                            <span
                              className="text-[10px] text-[color:var(--mf-text-faint)]"
                              aria-hidden="true"
                            >
                              {item.shortcut}
                            </span>
                          )}
                          {item.iconGlyph && (
                            <span
                              className="w-4 text-center text-[13px] text-[color:var(--mf-text-muted)]"
                              aria-hidden="true"
                            >
                              {item.iconGlyph}
                            </span>
                          )}
                          {item.icon && (
                            <item.icon
                              className="size-4 text-[color:var(--mf-text-muted)]"
                              aria-hidden="true"
                            />
                          )}
                          {item.shortcut && (
                            <span className="sr-only">
                              اختصار لوحة المفاتيح {item.shortcut}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </HoverBorderGradient>
      </div>

      {/* مجموعة يسار (بصريًا في RTL): الحالة، الاعتماد، المشروع، الحساب، النسخة */}
      <div className="app-header-secondary flex items-center gap-2">
        {(activeRun ?? visibleVersion) && (
          <div
            className="mf-pill flex h-11 items-center gap-2 px-4 text-[11px] font-bold"
            data-testid="app-header-status"
          >
            <span className="text-[color:var(--mf-text-muted)]">الحالة</span>
            <span
              className="text-[color:var(--mf-text-strong)]"
              aria-live="polite"
            >
              {statusLabel}
            </span>
          </div>
        )}

        {approvalEligible && (
          <button
            type="button"
            onClick={onApproveVisibleVersion}
            className="app-header-status-approve flex h-11 items-center px-4 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--mf-success)] focus-visible:outline-none"
            data-testid="approve-visible-version"
          >
            اعتماد النسخة
          </button>
        )}

        {hasRecoverableFailure && (
          <button
            type="button"
            onClick={onDismissFailure}
            className="app-header-status-dismiss flex h-11 items-center px-4 text-[11px] font-bold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--mf-warning)] focus-visible:outline-none"
            data-testid="dismiss-progressive-failure"
          >
            إغلاق الفشل
          </button>
        )}

        <HoverBorderGradient
          containerClassName="rounded-full"
          className="flex h-11 items-center gap-2 bg-transparent px-4 text-[11px] font-bold tracking-wider text-[color:var(--mf-text-muted)] uppercase"
          duration={2}
        >
          <span
            className="h-1.5 w-1.5 animate-pulse rounded-full"
            style={{ backgroundColor: onlineDotColor }}
            aria-hidden="true"
          />
          <span aria-label="حالة الاتصال: متصل">Online</span>
        </HoverBorderGradient>

        {activeProjectTitle ? (
          <HoverBorderGradient
            containerClassName="rounded-full max-w-[260px]"
            className="flex h-11 items-center gap-2 bg-transparent px-4 text-[11px] text-[color:var(--mf-text)]"
            duration={2}
          >
            <span className="text-[color:var(--mf-text-muted)]">المشروع</span>
            <span className="truncate font-bold">{activeProjectTitle}</span>
          </HoverBorderGradient>
        ) : null}

        <HoverBorderGradient
          containerClassName="rounded-full h-11 w-11"
          className="flex h-full w-full cursor-pointer items-center justify-center bg-transparent"
          duration={2}
        >
          <User
            className="size-4 text-[color:var(--mf-text-muted)]"
            aria-label="الحساب"
          />
        </HoverBorderGradient>

        <HoverBorderGradient
          containerClassName="rounded-full"
          className="group flex h-11 cursor-pointer items-center gap-2.5 bg-transparent px-5 leading-none"
          duration={2}
        >
          <span
            className="bg-clip-text text-[15px] font-bold text-transparent"
            style={{ backgroundImage: brandGradient }}
          >
            النسخة
          </span>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: onlineDotColor }}
            aria-hidden="true"
          />
        </HoverBorderGradient>
      </div>
    </header>
  );
}

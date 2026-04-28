/**
 * @module app-header
 * @description شريط القوائم العلوي للمحرر.
 *
 * إعادة التصميم البصرية فقط: تحويل الشريط الممتد إلى مجموعات عائمة (clusters)
 * فوق سطح ورقي دافئ. كل السلوكيات (WAI-ARIA Menubar، تنقل الأسهم،
 * فتح/إغلاق القوائم، تركيز أول عنصر، Escape/Tab/Enter، RTL navigation)
 * محفوظة بالكامل بدون تعديل.
 */

import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import { HeaderBrand } from "./HeaderBrand";
import { HeaderSecondary } from "./HeaderSecondary";
import { MenuDropdown } from "./MenuDropdown";
import { useMenuNavigation } from "./useMenuNavigation";
import { useKeyboardHandlers } from "./useKeyboardHandlers";
import { useStatusState } from "./useStatusState";
import { toTestId } from "./utils";
import type { AppHeaderProps } from "./types";

export type {
  AppHeaderProps,
  AppShellMenuItem,
  AppShellMenuSection,
} from "./types";

/**
 * شريط القوائم العلوي للمحرر.
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
  const menuNavigation = useMenuNavigation(menuSections, activeMenu);
  const {
    menubarId,
    menubarButtonRefs,
    menuItemRefs,
    sectionIndex,
  } = menuNavigation;

  const { handleSectionButtonKeyDown, handleMenuItemKeyDown } =
    useKeyboardHandlers({
      activeMenu,
      menuSections,
      onToggleMenu,
      onAction,
      menuNavigation,
    });

  const statusState = useStatusState(progressiveSurfaceState);

  const setMenuItemRef = (
    element: HTMLButtonElement | null,
    sectionLabel: string,
    itemIndex: number
  ) => {
    const key = `${sectionLabel}::${itemIndex}`;
    menuItemRefs.current[key] = element;
  };

  return (
    <header
      className="app-header relative z-40 flex h-[68px] flex-shrink-0 items-center justify-between px-6"
      data-app-menu-root="true"
      data-testid="app-header"
      role="banner"
    >
      {/* مجموعة يمين (بصريًا في RTL): الهوية + شريط القوائم */}
      <div className="app-header-primary flex items-center gap-3">
        <HeaderBrand infoDotColor={infoDotColor} brandGradient={brandGradient} />

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
                  aria-controls={isOpen ? `${menubarId}-menu-${sectionTestId}` : undefined}
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

                <MenuDropdown
                  section={section}
                  isOpen={isOpen}
                  menubarId={menubarId}
                  onAction={onAction}
                  onKeyDown={(event, itemIndex) =>
                    handleMenuItemKeyDown(event, section.label, itemIndex)
                  }
                  setMenuItemRef={setMenuItemRef}
                />
              </div>
            );
          })}
        </HoverBorderGradient>
      </div>

      {/* مجموعة يسار (بصريًا في RTL): الحالة، الاعتماد، المشروع، الحساب، النسخة */}
      <HeaderSecondary
        statusState={statusState}
        activeProjectTitle={activeProjectTitle}
        onlineDotColor={onlineDotColor}
        brandGradient={brandGradient}
        onApproveVisibleVersion={onApproveVisibleVersion}
        onDismissFailure={onDismissFailure}
      />
    </header>
  );
}

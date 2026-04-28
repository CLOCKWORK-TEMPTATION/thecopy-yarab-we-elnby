/**
 * @module app-header/MenuDropdown
 * @description مكون القائمة المنسدلة
 */

import { toTestId, isEnabled } from "./utils";

import type { AppShellMenuSection } from "./types";

interface MenuDropdownProps {
  section: AppShellMenuSection;
  isOpen: boolean;
  menubarId: string;
  onAction: (actionId: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLButtonElement>,
    itemIndex: number
  ) => void;
  setMenuItemRef: (
    element: HTMLButtonElement | null,
    sectionLabel: string,
    itemIndex: number
  ) => void;
}

export function MenuDropdown({
  section,
  isOpen,
  menubarId,
  onAction,
  onKeyDown,
  setMenuItemRef,
}: MenuDropdownProps): React.JSX.Element | null {
  if (!isOpen) return null;

  const sectionTestId = toTestId(section.label);
  const menuId = `${menubarId}-menu-${sectionTestId}`;

  return (
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
              setMenuItemRef(element, section.label, itemIndex);
            }}
            disabled={item.disabled}
            aria-disabled={item.disabled ? true : undefined}
            tabIndex={-1}
            onClick={() => {
              if (!isEnabled(item)) return;
              onAction(item.actionId);
            }}
            onKeyDown={(event) => onKeyDown(event, itemIndex)}
            data-testid={`menu-action-${item.actionId}`}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-[13px] transition-colors outline-none ${
              item.disabled
                ? "cursor-not-allowed text-[color:var(--mf-text-faint)]"
                : "text-[color:var(--mf-text)] hover:bg-[color:var(--mf-surface-soft)] hover:text-[color:var(--mf-text-strong)] focus-visible:bg-[color:var(--mf-surface-soft)] focus-visible:text-[color:var(--mf-text-strong)]"
            }`}
          >
            <span className="flex-1 text-right">{item.label}</span>
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
  );
}

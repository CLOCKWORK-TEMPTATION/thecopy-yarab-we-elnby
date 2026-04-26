import React from "react";

import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";

import {
  EDITOR_COMPOSITION_SHIFT_LEFT_PX,
  EDITOR_SHELL_DOCK_TOP_PX,
} from "../../constants/shell-layout";

import type { LucideIcon } from "lucide-react";

export interface AppDockButtonItem {
  actionId: string;
  icon: LucideIcon;
  title: string;
}

export interface AppDockProps {
  buttons: readonly AppDockButtonItem[];
  onAction: (actionId: string) => void;
  isMobile: boolean;
  isCompact?: boolean;
}

/**
 * زر أيقوني عائم داخل الـ dock مع تأثير HoverBorderGradient من Aceternity.
 */
function DockIconButton({
  icon: Icon,
  title,
  onClick,
  isMobile,
}: {
  icon: LucideIcon;
  title: string;
  onClick: () => void;
  isMobile: boolean;
}): React.JSX.Element {
  return (
    <HoverBorderGradient
      as="button"
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      containerClassName={`rounded-full ${isMobile ? "h-9 w-9" : "h-10 w-10"}`}
      className="app-dock-button relative z-10 flex h-full w-full items-center justify-center rounded-full bg-transparent p-0"
      duration={1.5}
    >
      <Icon
        className={`${isMobile ? "size-4" : "size-[18px]"} shrink-0 text-[color:var(--mf-text-muted)]`}
        strokeWidth={1.75}
      />
    </HoverBorderGradient>
  );
}

export function AppDock({
  buttons,
  onAction,
  isMobile,
  isCompact = false,
}: AppDockProps): React.JSX.Element {
  const visibleButtons = buttons;
  const leftStyle = isCompact
    ? "50%"
    : `calc(50% - ${EDITOR_COMPOSITION_SHIFT_LEFT_PX}px)`;

  return (
    <div
      className="app-dock pointer-events-none fixed z-40 flex justify-center"
      style={{
        top: `${EDITOR_SHELL_DOCK_TOP_PX}px`,
        left: leftStyle,
        transform: "translateX(-50%)",
      }}
      data-testid="app-dock"
    >
      <div className="pointer-events-auto">
        <div
          data-testid="app-dock-shell"
          className="app-dock-shell mx-auto flex h-16 items-center px-4"
        >
          {visibleButtons.map((button, index) => {
            const showSeparator =
              index === 1 || index === 3 || index === 7 || index === 13;
            return (
              <React.Fragment key={`${button.title}-${index}`}>
                <DockIconButton
                  icon={button.icon}
                  title={button.title}
                  isMobile={isMobile}
                  onClick={() => onAction(button.actionId)}
                />
                {showSeparator && (
                  <div
                    className="app-dock-divider mx-2 h-5 w-px self-center"
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

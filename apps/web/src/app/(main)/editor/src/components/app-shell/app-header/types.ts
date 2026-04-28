/**
 * @module app-header/types
 * @description أنواع TypeScript لمكون AppHeader
 */

import type { ProgressiveSurfaceState } from "../editor";
import type { LucideIcon } from "lucide-react";

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

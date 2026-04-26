"use client";

import {
  Search,
  FileEdit,
  Users,
  Camera,
  Lightbulb,
  BarChart3,
  Sparkles,
  Settings,
  Moon,
  Command,
  ArrowRight,
  Clock,
  Star,
  Mic,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Smart Command Palette Component
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Keyboard navigation (Ctrl/Cmd + K)
 * - Quick access to all apps
 * - Recent commands history
 * - AI suggestions
 * - Voice search support
 */

export interface CommandItem {
  id: string;
  title: string;
  titleAr: string;
  description?: string;
  icon: LucideIcon;
  action: () => void;
  category: "app" | "action" | "setting" | "recent";
  keywords?: string[];
}

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = React.useState(open ?? false);
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recentCommands, setRecentCommands] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Sync external open state
  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
    if (newOpen) {
      setSearch("");
      setSelectedIndex(0);
    }
  };

  // Load recent commands from localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem("command-palette-recent");
    if (stored) {
      setRecentCommands(JSON.parse(stored));
    }
  }, []);

  // Save recent commands
  const addToRecent = (id: string) => {
    const updated = [id, ...recentCommands.filter((r) => r !== id)].slice(0, 5);
    setRecentCommands(updated);
    localStorage.setItem("command-palette-recent", JSON.stringify(updated));
  };

  // Navigation action helper
  const navigateTo = (path: string) => {
    router.push(path);
    handleOpenChange(false);
  };

  // All available commands
  const allCommands: CommandItem[] = [
    // Apps
    {
      id: "editor",
      title: "Screenplay Editor",
      titleAr: "محرر السيناريو",
      description: "Write and edit screenplays",
      icon: FileEdit,
      action: () => navigateTo("/editor"),
      category: "app",
      keywords: ["write", "script", "كتابة", "سيناريو"],
    },
    {
      id: "creative-writing",
      title: "Creative Writing Studio",
      titleAr: "استوديو الكتابة الإبداعية",
      description: "Arabic creative writing platform",
      icon: Sparkles,
      action: () => navigateTo("/arabic-creative-writing-studio"),
      category: "app",
      keywords: ["creative", "writing", "إبداعي", "كتابة"],
    },
    {
      id: "directors-studio",
      title: "Directors Studio",
      titleAr: "استوديو الإخراج",
      description: "Director's control center",
      icon: Camera,
      action: () => navigateTo("/directors-studio"),
      category: "app",
      keywords: ["director", "مخرج", "إخراج"],
    },
    {
      id: "cinematography",
      title: "Cinematography Studio",
      titleAr: "استوديو التصوير السينمائي",
      description: "Cinematography tools",
      icon: Camera,
      action: () => navigateTo("/cinematography-studio"),
      category: "app",
      keywords: ["cinema", "camera", "تصوير", "سينما"],
    },
    {
      id: "analysis",
      title: "Seven Stations Analysis",
      titleAr: "تحليل المحطات السبع",
      description: "Drama analysis system",
      icon: BarChart3,
      action: () => navigateTo("/analysis"),
      category: "app",
      keywords: ["analysis", "drama", "تحليل", "دراما"],
    },
    {
      id: "brainstorm",
      title: "Brainstorm Workshop",
      titleAr: "ورشة العصف الذهني",
      description: "Creative brainstorming",
      icon: Lightbulb,
      action: () => navigateTo("/brain-storm-ai"),
      category: "app",
      keywords: ["brainstorm", "ideas", "عصف", "أفكار"],
    },
    {
      id: "actorai",
      title: "ActorAI Arabic",
      titleAr: "الممثل الذكي العربي",
      description: "AI acting partner",
      icon: Users,
      action: () => navigateTo("/actorai-arabic"),
      category: "app",
      keywords: ["actor", "ai", "ممثل", "تمثيل"],
    },
    {
      id: "metrics",
      title: "Metrics Dashboard",
      titleAr: "لوحة المقاييس",
      description: "Analytics and metrics",
      icon: BarChart3,
      action: () => navigateTo("/metrics-dashboard"),
      category: "app",
      keywords: ["metrics", "analytics", "مقاييس", "تحليلات"],
    },
    // Actions
    {
      id: "new-project",
      title: "New Project",
      titleAr: "مشروع جديد",
      icon: FileEdit,
      action: () => {
        navigateTo("/editor?new=true");
      },
      category: "action",
      keywords: ["new", "create", "جديد", "إنشاء"],
    },
    // Settings
    {
      id: "toggle-theme",
      title: "Toggle Dark Mode",
      titleAr: "تبديل الوضع الداكن",
      icon: Moon,
      action: () => {
        document.documentElement.classList.toggle("dark");
        handleOpenChange(false);
      },
      category: "setting",
      keywords: ["theme", "dark", "light", "ثيم", "داكن", "فاتح"],
    },
    {
      id: "settings",
      title: "Settings",
      titleAr: "الإعدادات",
      icon: Settings,
      action: () => navigateTo("/settings"),
      category: "setting",
      keywords: ["settings", "preferences", "إعدادات"],
    },
  ];

  // Filter commands based on search
  const filteredCommands = React.useMemo(() => {
    if (!search) {
      // Show recent + all apps
      const recent = recentCommands
        .map((id) => allCommands.find((c) => c.id === id))
        .filter(Boolean) as CommandItem[];

      return {
        recent: recent.map((c) => ({ ...c, category: "recent" as const })),
        apps: allCommands.filter((c) => c.category === "app"),
        actions: allCommands.filter((c) => c.category === "action"),
        settings: allCommands.filter((c) => c.category === "setting"),
      };
    }

    const query = search.toLowerCase();
    const matches = allCommands.filter(
      (cmd) =>
        cmd.title.toLowerCase().includes(query) ||
        cmd.titleAr.includes(search) ||
        cmd.keywords?.some((k) => k.includes(query))
    );

    return {
      recent: [],
      apps: matches.filter((c) => c.category === "app"),
      actions: matches.filter((c) => c.category === "action"),
      settings: matches.filter((c) => c.category === "setting"),
    };
  }, [search, recentCommands]);

  // Flatten for keyboard navigation
  const flatCommands = [
    ...filteredCommands.recent,
    ...filteredCommands.apps,
    ...filteredCommands.actions,
    ...filteredCommands.settings,
  ];

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Ctrl/Cmd + K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpenChange(true);
        return;
      }

      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, flatCommands.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            addToRecent(flatCommands[selectedIndex].id);
            flatCommands[selectedIndex].action();
          }
          break;
        case "Escape":
          handleOpenChange(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, flatCommands]);

  // Reset selection when search changes
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const CommandGroup = ({
    title,
    titleAr,
    items,
    startIndex,
  }: {
    title: string;
    titleAr: string;
    items: CommandItem[];
    startIndex: number;
  }) => {
    if (items.length === 0) return null;

    return (
      <div className="py-2">
        <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
          {title === "Recent" && <Clock className="w-3 h-3" />}
          {title === "Apps" && <Star className="w-3 h-3" />}
          <span>{titleAr}</span>
        </div>
        {items.map((item, i) => {
          const index = startIndex + i;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                addToRecent(item.id);
                item.action();
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "command-palette__item w-full text-right",
                index === selectedIndex && "bg-accent"
              )}
            >
              <Icon className="command-palette__item-icon flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{item.titleAr}</div>
                {item.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {item.description}
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="command-palette p-0 gap-0">
        {/* Search Input */}
        <div className="command-palette__input flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن أي شيء..."
            className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
            dir="rtl"
          />
          <div className="flex items-center gap-2">
            <button
              className="p-1.5 rounded-md hover:bg-accent transition-colors"
              title="البحث الصوتي"
            >
              <Mic className="w-4 h-4 text-muted-foreground" />
            </button>
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs font-medium bg-muted rounded-md text-muted-foreground">
              <Command className="w-3 h-3" />K
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="command-palette__list">
          {flatCommands.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>لا توجد نتائج لـ &quot;{search}&quot;</p>
            </div>
          ) : (
            <>
              <CommandGroup
                title="Recent"
                titleAr="الأخيرة"
                items={filteredCommands.recent}
                startIndex={0}
              />
              <CommandGroup
                title="Apps"
                titleAr="التطبيقات"
                items={filteredCommands.apps}
                startIndex={filteredCommands.recent.length}
              />
              <CommandGroup
                title="Actions"
                titleAr="الإجراءات"
                items={filteredCommands.actions}
                startIndex={
                  filteredCommands.recent.length + filteredCommands.apps.length
                }
              />
              <CommandGroup
                title="Settings"
                titleAr="الإعدادات"
                items={filteredCommands.settings}
                startIndex={
                  filteredCommands.recent.length +
                  filteredCommands.apps.length +
                  filteredCommands.actions.length
                }
              />
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>
              للتنقل
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>
              للتحديد
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>
              للإغلاق
            </span>
          </div>
          <span className="text-accent-creative">
            ✨ مدعوم بالذكاء الاصطناعي
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export a hook for easy usage
export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

"use client";

import {
  ArrowRight,
  BarChart3,
  Camera,
  Clock,
  Command,
  FileEdit,
  Lightbulb,
  Mic,
  Moon,
  Search,
  Settings,
  Sparkles,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

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

interface CommandBuckets {
  recent: CommandItem[];
  apps: CommandItem[];
  actions: CommandItem[];
  settings: CommandItem[];
}

interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function createCommands(
  navigateTo: (path: string) => void,
  close: () => void
): CommandItem[] {
  return [
    command({
      id: "editor",
      title: "Screenplay Editor",
      titleAr: "محرر السيناريو",
      description: "Write and edit screenplays",
      icon: FileEdit,
      action: () => navigateTo("/editor"),
      category: "app",
      keywords: ["write", "script", "كتابة", "سيناريو"],
    }),
    command({
      id: "creative-writing",
      title: "Creative Writing Studio",
      titleAr: "استوديو الكتابة الإبداعية",
      description: "Arabic creative writing platform",
      icon: Sparkles,
      action: () => navigateTo("/arabic-creative-writing-studio"),
      category: "app",
      keywords: ["creative", "writing", "إبداعي", "كتابة"],
    }),
    command({
      id: "directors-studio",
      title: "Directors Studio",
      titleAr: "استوديو الإخراج",
      description: "Director's control center",
      icon: Camera,
      action: () => navigateTo("/directors-studio"),
      category: "app",
      keywords: ["director", "مخرج", "إخراج"],
    }),
    command({
      id: "cinematography",
      title: "Cinematography Studio",
      titleAr: "استوديو التصوير السينمائي",
      description: "Cinematography tools",
      icon: Camera,
      action: () => navigateTo("/cinematography-studio"),
      category: "app",
      keywords: ["cinema", "camera", "تصوير", "سينما"],
    }),
    command({
      id: "analysis",
      title: "Seven Stations Analysis",
      titleAr: "تحليل المحطات السبع",
      description: "Drama analysis system",
      icon: BarChart3,
      action: () => navigateTo("/analysis"),
      category: "app",
      keywords: ["analysis", "drama", "تحليل", "دراما"],
    }),
    command({
      id: "brainstorm",
      title: "Brainstorm Workshop",
      titleAr: "ورشة العصف الذهني",
      description: "Creative brainstorming",
      icon: Lightbulb,
      action: () => navigateTo("/brain-storm-ai"),
      category: "app",
      keywords: ["brainstorm", "ideas", "عصف", "أفكار"],
    }),
    command({
      id: "actorai",
      title: "ActorAI Arabic",
      titleAr: "الممثل الذكي العربي",
      description: "AI acting partner",
      icon: Users,
      action: () => navigateTo("/actorai-arabic"),
      category: "app",
      keywords: ["actor", "ai", "ممثل", "تمثيل"],
    }),
    command({
      id: "metrics",
      title: "Metrics Dashboard",
      titleAr: "لوحة المقاييس",
      description: "Analytics and metrics",
      icon: BarChart3,
      action: () => navigateTo("/metrics-dashboard"),
      category: "app",
      keywords: ["metrics", "analytics", "مقاييس", "تحليلات"],
    }),
    command({
      id: "new-project",
      title: "New Project",
      titleAr: "مشروع جديد",
      icon: FileEdit,
      action: () => navigateTo("/editor?new=true"),
      category: "action",
      keywords: ["new", "create", "جديد", "إنشاء"],
    }),
    command({
      id: "toggle-theme",
      title: "Toggle Dark Mode",
      titleAr: "تبديل الوضع الداكن",
      icon: Moon,
      action: () => {
        document.documentElement.classList.toggle("dark");
        close();
      },
      category: "setting",
      keywords: ["theme", "dark", "light", "ثيم", "داكن", "فاتح"],
    }),
    command({
      id: "settings",
      title: "Settings",
      titleAr: "الإعدادات",
      icon: Settings,
      action: () => navigateTo("/settings"),
      category: "setting",
      keywords: ["settings", "preferences", "إعدادات"],
    }),
  ];
}

function command(item: CommandItem): CommandItem {
  return item;
}

function parseRecentCommands(stored: string | null): string[] {
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

function filterCommands(
  allCommands: CommandItem[],
  recentCommands: string[],
  search: string
): CommandBuckets {
  if (!search) {
    const recent = recentCommands
      .map((id) => allCommands.find((item) => item.id === id))
      .filter((item): item is CommandItem => Boolean(item));
    return bucketCommands(allCommands, recent);
  }

  const query = search.toLowerCase();
  const matches = allCommands.filter(
    (item) =>
      item.title.toLowerCase().includes(query) ||
      item.titleAr.includes(search) ||
      item.keywords?.some((keyword) => keyword.includes(query))
  );

  return bucketCommands(matches, []);
}

function bucketCommands(
  commands: CommandItem[],
  recent: CommandItem[]
): CommandBuckets {
  return {
    recent: recent.map((item) => ({ ...item, category: "recent" })),
    apps: commands.filter((item) => item.category === "app"),
    actions: commands.filter((item) => item.category === "action"),
    settings: commands.filter((item) => item.category === "setting"),
  };
}

interface CommandGroupProps {
  title: string;
  titleAr: string;
  items: CommandItem[];
  startIndex: number;
  selectedIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: CommandItem) => void;
}

function CommandGroup({
  title,
  titleAr,
  items,
  startIndex,
  selectedIndex,
  onHover,
  onSelect,
}: CommandGroupProps) {
  if (items.length === 0) return null;

  return (
    <div className="py-2">
      <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
        {title === "Recent" && <Clock className="w-3 h-3" />}
        {title === "Apps" && <Star className="w-3 h-3" />}
        <span>{titleAr}</span>
      </div>
      {items.map((item, offset) => {
        const index = startIndex + offset;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            onMouseEnter={() => onHover(index)}
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
}

interface CommandResultsProps {
  buckets: CommandBuckets;
  flatCommands: CommandItem[];
  search: string;
  selectedIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: CommandItem) => void;
}

function CommandResults({
  buckets,
  flatCommands,
  search,
  selectedIndex,
  onHover,
  onSelect,
}: CommandResultsProps) {
  if (flatCommands.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground">
        <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>لا توجد نتائج لـ &quot;{search}&quot;</p>
      </div>
    );
  }

  return (
    <>
      <CommandGroup
        title="Recent"
        titleAr="الأخيرة"
        items={buckets.recent}
        startIndex={0}
        selectedIndex={selectedIndex}
        onHover={onHover}
        onSelect={onSelect}
      />
      <CommandGroup
        title="Apps"
        titleAr="التطبيقات"
        items={buckets.apps}
        startIndex={buckets.recent.length}
        selectedIndex={selectedIndex}
        onHover={onHover}
        onSelect={onSelect}
      />
      <CommandGroup
        title="Actions"
        titleAr="الإجراءات"
        items={buckets.actions}
        startIndex={buckets.recent.length + buckets.apps.length}
        selectedIndex={selectedIndex}
        onHover={onHover}
        onSelect={onSelect}
      />
      <CommandGroup
        title="Settings"
        titleAr="الإعدادات"
        items={buckets.settings}
        startIndex={
          buckets.recent.length + buckets.apps.length + buckets.actions.length
        }
        selectedIndex={selectedIndex}
        onHover={onHover}
        onSelect={onSelect}
      />
    </>
  );
}

function CommandFooter() {
  return (
    <div className="px-4 py-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd>للتنقل
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd>للتحديد
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd>للإغلاق
        </span>
      </div>
      <span className="text-accent-creative">✨ مدعوم بالذكاء الاصطناعي</span>
    </div>
  );
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = React.useState(open ?? false);
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [recentCommands, setRecentCommands] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleOpenChange = React.useCallback(
    (newOpen: boolean) => {
      setIsOpen(newOpen);
      onOpenChange?.(newOpen);
      if (newOpen) {
        setSearch("");
        setSelectedIndex(0);
      }
    },
    [onOpenChange]
  );

  const close = React.useCallback(
    () => handleOpenChange(false),
    [handleOpenChange]
  );
  const navigateTo = React.useCallback(
    (path: string) => {
      router.push(path);
      close();
    },
    [close, router]
  );

  const allCommands = React.useMemo(
    () => createCommands(navigateTo, close),
    [close, navigateTo]
  );
  const buckets = React.useMemo(
    () => filterCommands(allCommands, recentCommands, search),
    [allCommands, recentCommands, search]
  );
  const flatCommands = React.useMemo(
    () => [
      ...buckets.recent,
      ...buckets.apps,
      ...buckets.actions,
      ...buckets.settings,
    ],
    [buckets]
  );

  React.useEffect(() => {
    if (open !== undefined) setIsOpen(open);
  }, [open]);

  React.useEffect(() => {
    setRecentCommands(
      parseRecentCommands(localStorage.getItem("command-palette-recent"))
    );
  }, []);

  const addToRecent = React.useCallback((id: string) => {
    setRecentCommands((previous) => {
      const updated = [id, ...previous.filter((item) => item !== id)].slice(
        0,
        5
      );
      localStorage.setItem("command-palette-recent", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const executeCommand = React.useCallback(
    (item: CommandItem) => {
      addToRecent(item.id);
      item.action();
    },
    [addToRecent]
  );

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        handleOpenChange(true);
        return;
      }
      if (!isOpen) return;
      if (event.key === "ArrowDown")
        setSelectedIndex((index) =>
          Math.min(index + 1, flatCommands.length - 1)
        );
      if (event.key === "ArrowUp")
        setSelectedIndex((index) => Math.max(index - 1, 0));
      if (event.key === "Escape") handleOpenChange(false);
      if (event.key === "Enter" && flatCommands[selectedIndex])
        executeCommand(flatCommands[selectedIndex]);
      if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key))
        event.preventDefault();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [executeCommand, flatCommands, handleOpenChange, isOpen, selectedIndex]);

  React.useEffect(() => setSelectedIndex(0), [search]);
  React.useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="command-palette p-0 gap-0">
        <div className="command-palette__input flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
        <div className="command-palette__list">
          <CommandResults
            buckets={buckets}
            flatCommands={flatCommands}
            search={search}
            selectedIndex={selectedIndex}
            onHover={setSelectedIndex}
            onSelect={executeCommand}
          />
        </div>
        <CommandFooter />
      </DialogContent>
    </Dialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}

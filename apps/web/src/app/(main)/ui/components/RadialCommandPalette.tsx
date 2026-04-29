import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";

import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNotifications } from "@/hooks/use-notifications";

interface Command {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  shortcut?: string;
}

interface RadialCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  context?: "global" | "editor" | "analysis" | "development" | "brainstorm";
  commands: Command[];
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface CommandListProps {
  commands: Command[];
  onCommandClick: (cmd: Command) => void;
  mobile?: boolean;
}

function CommandList({ commands, onCommandClick, mobile }: CommandListProps) {
  if (commands.length === 0) {
    return (
      <div
        className={`text-center ${mobile ? "py-12" : "py-8"} text-[var(--color-muted)]`}
        dir="rtl"
      >
        لا توجد نتائج
      </div>
    );
  }

  if (mobile) {
    return (
      <>
        {commands.map((cmd, index) => (
          <motion.button
            key={cmd.id}
            className="w-full flex items-center gap-3 p-4 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-accent)]/10 transition-colors text-right border border-transparent hover:border-[var(--color-accent)]/30"
            onClick={() => onCommandClick(cmd)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            {cmd.icon && (
              <div className="text-[var(--color-accent)]">{cmd.icon}</div>
            )}
            <span className="flex-1 text-[var(--color-text)]">{cmd.label}</span>
            {cmd.shortcut && (
              <span className="text-[var(--color-muted)] px-2 py-1 bg-[var(--color-bg)] rounded text-sm">
                {cmd.shortcut}
              </span>
            )}
          </motion.button>
        ))}
      </>
    );
  }

  return (
    <>
      {commands.map((cmd, index) => (
        <motion.button
          key={cmd.id}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors text-right"
          onClick={() => onCommandClick(cmd)}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.03 }}
        >
          {cmd.icon && (
            <div className="text-[var(--color-accent)]">{cmd.icon}</div>
          )}
          <span className="flex-1 text-[var(--color-text)]">{cmd.label}</span>
          {cmd.shortcut && (
            <span className="text-[var(--color-muted)] px-2 py-1 bg-[var(--color-bg)] rounded">
              {cmd.shortcut}
            </span>
          )}
        </motion.button>
      ))}
    </>
  );
}

export function RadialCommandPalette({
  isOpen,
  onClose,
  context = "global",
  commands,
}: RadialCommandPaletteProps) {
  const notifications = useNotifications();
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isMobile = useIsMobile();
  const debouncedSearch = useDebounce(search, 180);
  const filteredCommands = useMemo(() => {
    if (!debouncedSearch) return commands;
    return commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch, commands]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || isMobile) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [isOpen, isMobile]);

  const handleCommandClick = useCallback(
    (cmd: Command) => {
      try {
        cmd.action();
        notifications.success(`تم تنفيذ: ${cmd.label}`);
        onClose();
      } catch {
        notifications.error("فشل تنفيذ الأمر");
      }
    },
    [notifications, onClose]
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="bg-[var(--color-panel)] border-[var(--color-surface)] h-[80vh] rounded-t-3xl"
        >
          <SheetHeader className="border-b border-[var(--color-surface)] pb-4">
            <SheetTitle
              className="text-[var(--color-text)] text-right"
              dir="rtl"
            >
              لوحة الأوامر
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-muted)]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن أمر..."
                className="pr-10 bg-[var(--color-surface)] border-[var(--color-surface)] text-[var(--color-text)]"
                dir="rtl"
              />
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[60vh]">
              <CommandList
                commands={filteredCommands}
                onCommandClick={handleCommandClick}
                mobile
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[600px] max-w-[90vw]"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="bg-[var(--color-panel)] border border-[var(--color-surface)] rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-surface)]">
                <Search className="w-5 h-5 text-[var(--color-muted)]" />
                <Input
                  ref={searchInputRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث عن أمر..."
                  className="flex-1 bg-transparent border-none focus-visible:ring-0 text-[var(--color-text)] placeholder:text-[var(--color-muted)]"
                  dir="rtl"
                />
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-[var(--color-surface)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[var(--color-muted)]" />
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto p-2">
                <CommandList
                  commands={filteredCommands}
                  onCommandClick={handleCommandClick}
                />
              </div>
              <div className="px-4 py-2 border-t border-[var(--color-surface)] text-[var(--color-muted)] flex items-center justify-between">
                <span>السياق: {context}</span>
                <span>Space للفتح • ESC للإغلاق</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

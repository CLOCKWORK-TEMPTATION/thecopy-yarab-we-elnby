"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Mic,
  Image as ImageIcon,
  X,
  Clock,
  Sparkles,
  FileText,
  Video,
  Users,
  Folder,
  ArrowRight,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import * as React from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Universal Search Component
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Text, voice, and image search
 * - AI-powered suggestions
 * - Recent searches
 * - Categorized results
 * - Keyboard navigation
 * - Fuzzy search
 */

export type SearchCategory =
  | "all"
  | "projects"
  | "scenes"
  | "characters"
  | "scripts"
  | "media";

export interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: SearchCategory;
  icon?: LucideIcon;
  url?: string;
  metadata?: {
    date?: string;
    author?: string;
    tags?: string[];
  };
  onClick?: () => void;
}

export interface UniversalSearchProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSearch?: (
    query: string,
    category: SearchCategory
  ) => Promise<SearchResult[]>;
  placeholder?: string;
  recentSearches?: string[];
  onRecentSearchClick?: (query: string) => void;
}

const categoryIcons: Record<SearchCategory, LucideIcon> = {
  all: Search,
  projects: Folder,
  scenes: Video,
  characters: Users,
  scripts: FileText,
  media: ImageIcon,
};

const categoryLabels: Record<SearchCategory, string> = {
  all: "الكل",
  projects: "المشاريع",
  scenes: "المشاهد",
  characters: "الشخصيات",
  scripts: "النصوص",
  media: "الوسائط",
};

export function UniversalSearch({
  open = false,
  onOpenChange,
  onSearch,
  placeholder = "ابحث عن أي شيء...",
  recentSearches = [],
  onRecentSearchClick,
}: UniversalSearchProps) {
  const [isOpen, setIsOpen] = React.useState(open);
  const [query, setQuery] = React.useState("");
  const [category, setCategory] = React.useState<SearchCategory>("all");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isVoiceActive, setIsVoiceActive] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
    if (!newOpen) {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpenChange(!isOpen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Search with debounce
  React.useEffect(() => {
    if (!query.trim() || !onSearch) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const searchResults = await onSearch(query, category);
        setResults(searchResults);
      } catch (error) {
        void error;
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, category, onSearch]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      results[selectedIndex].onClick?.();
      handleOpenChange(false);
    }
  };

  // Voice search (placeholder - requires Web Speech API)
  const handleVoiceSearch = () => {
    setIsVoiceActive(true);
    // Implement voice search using Web Speech API
    setTimeout(() => setIsVoiceActive(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden" dir="rtl">
        <div className="flex flex-col h-[600px]">
          {/* Search Header */}
          <div className="border-b bg-gradient-to-r from-background to-muted/20 p-4">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />

              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="flex-1 bg-transparent border-none outline-none text-lg placeholder:text-muted-foreground"
                autoFocus
              />

              {/* Voice Search */}
              <button
                onClick={handleVoiceSearch}
                className={cn(
                  "p-2 rounded-md hover:bg-accent transition-colors",
                  isVoiceActive && "bg-accent-creative text-white animate-pulse"
                )}
                aria-label="البحث الصوتي"
              >
                <Mic className="h-4 w-4" />
              </button>

              {/* Image Search */}
              <button
                className="p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="البحث بالصورة"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              {/* Clear */}
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-2 rounded-md hover:bg-accent transition-colors"
                  aria-label="مسح"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Category Tabs */}
            <Tabs
              value={category}
              onValueChange={(v) => setCategory(v as SearchCategory)}
              className="mt-4"
            >
              <TabsList className="w-full justify-start">
                {Object.entries(categoryLabels).map(([key, label]) => {
                  const Icon = categoryIcons[key as SearchCategory];
                  return (
                    <TabsTrigger key={key} value={key} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {isSearching ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : query && results.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">لا توجد نتائج</p>
                <p className="text-sm text-muted-foreground mt-1">
                  جرب كلمات بحث مختلفة
                </p>
              </div>
            ) : query && results.length > 0 ? (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {results.map((result, index) => (
                    <SearchResultItem
                      key={result.id}
                      result={result}
                      isSelected={index === selectedIndex}
                      onClick={() => {
                        result.onClick?.();
                        handleOpenChange(false);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium text-muted-foreground">
                        عمليات البحث الأخيرة
                      </h3>
                    </div>
                    <div className="space-y-1">
                      {recentSearches.map((search, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(search);
                            onRecentSearchClick?.(search);
                          }}
                          className="w-full text-right px-3 py-2 rounded-md hover:bg-accent transition-colors text-sm"
                        >
                          {search}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Suggestions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-4 w-4 text-accent-creative" />
                    <h3 className="text-sm font-medium text-muted-foreground">
                      اقتراحات ذكية
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "مشاهد الحركة",
                      "شخصيات رئيسية",
                      "حوارات درامية",
                      "مواقع تصوير",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setQuery(suggestion)}
                        className="px-4 py-3 rounded-lg border bg-gradient-to-br from-accent/50 to-transparent hover:from-accent hover:to-accent/50 transition-all text-sm font-medium text-right"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer with shortcuts */}
          <div className="border-t p-3 bg-muted/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 rounded bg-background border">
                    ↑↓
                  </kbd>
                  للتنقل
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 rounded bg-background border">
                    Enter
                  </kbd>
                  للفتح
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2 py-1 rounded bg-background border">
                    Esc
                  </kbd>
                  للإغلاق
                </span>
              </div>
              <span>مدعوم بالذكاء الاصطناعي</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SearchResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
}

function SearchResultItem({
  result,
  isSelected,
  onClick,
}: SearchResultItemProps) {
  const Icon = result.icon ?? categoryIcons[result.category];

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onClick={onClick}
      className={cn(
        "w-full text-right p-3 rounded-lg border transition-all",
        "hover:bg-accent hover:border-accent-foreground/20",
        isSelected && "bg-accent border-accent-foreground/20"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-md bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-sm truncate">{result.title}</h4>
            {result.metadata?.tags && (
              <div className="flex items-center gap-1">
                {result.metadata.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded-full bg-muted text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {result.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {result.description}
            </p>
          )}

          {result.metadata && (
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {result.metadata.date && <span>{result.metadata.date}</span>}
              {result.metadata.author && <span>{result.metadata.author}</span>}
            </div>
          )}
        </div>

        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </motion.button>
  );
}

"use client";

import { Music, Star } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  ARABIC_RHYMES,
  getWordEnding,
  type RhymeResult,
} from "./arabic-rhyme-finder-data";
import { RhymeFavorites, RhymeResults } from "./arabic-rhyme-finder-results";
import {
  RhymeSearchPanel,
  type RhymeFilterType,
} from "./arabic-rhyme-finder-search-panel";

/**
 * Arabic Rhyme Finder Component
 * For Arabic Creative Writing Studio
 *
 * Features:
 * - Find Arabic rhymes based on word endings
 * - Multiple rhyme types (perfect, near, slant)
 * - Poetry meter suggestions
 * - Favorite words collection
 * - Search history
 */

interface ArabicRhymeFinderProps {
  onWordSelect?: (word: string) => void;
  className?: string;
}

export function ArabicRhymeFinder({
  onWordSelect,
  className,
}: ArabicRhymeFinderProps) {
  const [searchWord, setSearchWord] = React.useState("");
  const [results, setResults] = React.useState<RhymeResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState<string[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [copiedWord, setCopiedWord] = React.useState<string | null>(null);
  const [selectedMeter, setSelectedMeter] = React.useState<string | null>(null);
  const [filterType, setFilterType] = React.useState<RhymeFilterType>("all");

  const searchRhymes = async (wordOverride?: string) => {
    const activeWord = wordOverride ?? searchWord;
    if (!activeWord.trim()) return;

    setIsSearching(true);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const ending = getWordEnding(activeWord);
    let foundRhymes = ARABIC_RHYMES[ending] ?? [];

    if (foundRhymes.length === 0) {
      const lastChar = activeWord.slice(-1);
      for (const [key, rhymes] of Object.entries(ARABIC_RHYMES)) {
        if (key.includes(lastChar)) {
          foundRhymes = [
            ...foundRhymes,
            ...rhymes.map((r) => ({ ...r, type: "near" as const })),
          ];
        }
      }
    }

    if (filterType !== "all") {
      foundRhymes = foundRhymes.filter((r) => r.type === filterType);
    }

    setResults(foundRhymes);
    setIsSearching(false);

    if (!searchHistory.includes(activeWord)) {
      setSearchHistory((prev) => [activeWord, ...prev.slice(0, 9)]);
    }
  };

  const runSearchRhymes = (wordOverride?: string): void => {
    searchRhymes(wordOverride).catch(() => {
      setIsSearching(false);
    });
  };

  const copyWord = (word: string) => {
    navigator.clipboard
      .writeText(word)
      .then(() => {
        setCopiedWord(word);
        setTimeout(() => setCopiedWord(null), 2000);
      })
      .catch(() => {
        setCopiedWord(null);
      });
  };

  const toggleFavorite = (word: string) => {
    setFavorites((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
  };

  return (
    <TooltipProvider>
      <div className={cn("arabic-rhyme-finder space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Music className="h-5 w-5 text-purple-500" />
              باحث القوافي العربية
            </h2>
            <p className="text-sm text-muted-foreground">Arabic Rhyme Finder</p>
          </div>
          <Badge variant="outline" className="border-purple-500/50">
            <Star className="h-3 w-3 ml-1 text-purple-500" />
            {favorites.length} محفوظ
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <RhymeSearchPanel
            searchWord={searchWord}
            onSearchWordChange={setSearchWord}
            isSearching={isSearching}
            filterType={filterType}
            onFilterTypeChange={setFilterType}
            selectedMeter={selectedMeter}
            onSelectedMeterChange={setSelectedMeter}
            searchHistory={searchHistory}
            onClearHistory={() => setSearchHistory([])}
            onTriggerSearch={runSearchRhymes}
          />

          <RhymeResults
            results={results}
            searchWord={searchWord}
            favorites={favorites}
            copiedWord={copiedWord}
            onToggleFavorite={toggleFavorite}
            onCopy={copyWord}
            {...(onWordSelect ? { onSelect: onWordSelect } : {})}
          />
        </div>

        <RhymeFavorites
          favorites={favorites}
          onPickWord={(word) => {
            setSearchWord(word);
            runSearchRhymes(word);
          }}
          onToggleFavorite={toggleFavorite}
        />
      </div>
    </TooltipProvider>
  );
}

export default ArabicRhymeFinder;

"use client";

import {
  BookmarkCheck,
  Check,
  Copy,
  Heart,
  Music,
  Sparkles,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import {
  getRhymeTypeColor,
  getRhymeTypeLabel,
  type RhymeResult,
} from "./arabic-rhyme-finder-data";

interface RhymeResultsProps {
  results: RhymeResult[];
  searchWord: string;
  favorites: string[];
  copiedWord: string | null;
  onToggleFavorite: (word: string) => void;
  onCopy: (word: string) => void;
  onSelect?: (word: string) => void;
}

export function RhymeResults({
  results,
  searchWord,
  favorites,
  copiedWord,
  onToggleFavorite,
  onCopy,
  onSelect,
}: RhymeResultsProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            نتائج القوافي
          </span>
          {results.length > 0 && (
            <Badge variant="secondary">{results.length} نتيجة</Badge>
          )}
        </CardTitle>
        {searchWord && (
          <CardDescription>
            قوافي لكلمة:{" "}
            <span className="font-bold text-purple-400">{searchWord}</span>
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Music className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">ابدأ البحث عن القوافي</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              اكتب كلمة في مربع البحث للعثور على كلمات تقفي معها
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {results.map((rhyme, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold">{rhyme.word}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", getRhymeTypeColor(rhyme.type))}
                    >
                      {getRhymeTypeLabel(rhyme.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onToggleFavorite(rhyme.word)}
                        >
                          {favorites.includes(rhyme.word) ? (
                            <Heart className="h-4 w-4 text-red-500 fill-red-500" />
                          ) : (
                            <Heart className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {favorites.includes(rhyme.word)
                          ? "إزالة من المفضلة"
                          : "إضافة للمفضلة"}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onCopy(rhyme.word)}
                        >
                          {copiedWord === rhyme.word ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>نسخ</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onSelect?.(rhyme.word)}
                        >
                          <BookmarkCheck className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>استخدام</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                {rhyme.meaning && (
                  <p className="text-sm text-muted-foreground mb-1">
                    المعنى: {rhyme.meaning}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{rhyme.syllables} مقاطع</span>
                  {rhyme.usage && (
                    <span className="text-purple-400 italic">
                      &quot;{rhyme.usage}&quot;
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RhymeFavoritesProps {
  favorites: string[];
  onPickWord: (word: string) => void;
  onToggleFavorite: (word: string) => void;
}

export function RhymeFavorites({
  favorites,
  onPickWord,
  onToggleFavorite,
}: RhymeFavoritesProps) {
  if (favorites.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          الكلمات المفضلة ({favorites.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {favorites.map((word, idx) => (
            <Badge
              key={idx}
              variant="secondary"
              className="text-base px-3 py-1 cursor-pointer hover:bg-purple-500/20"
              onClick={() => onPickWord(word)}
            >
              {word}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(word);
                }}
                className="mr-2 hover:text-red-500"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

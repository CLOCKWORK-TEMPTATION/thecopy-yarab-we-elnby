"use client";

import {
  BookOpen,
  Filter,
  History,
  Loader2,
  Search,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { POETRY_METERS } from "./arabic-rhyme-finder-data";

export type RhymeFilterType = "all" | "perfect" | "near" | "slant";

interface RhymeSearchPanelProps {
  searchWord: string;
  onSearchWordChange: (value: string) => void;
  isSearching: boolean;
  filterType: RhymeFilterType;
  onFilterTypeChange: (value: RhymeFilterType) => void;
  selectedMeter: string | null;
  onSelectedMeterChange: (value: string | null) => void;
  searchHistory: string[];
  onClearHistory: () => void;
  onTriggerSearch: (wordOverride?: string) => void;
}

export function RhymeSearchPanel({
  searchWord,
  onSearchWordChange,
  isSearching,
  filterType,
  onFilterTypeChange,
  selectedMeter,
  onSelectedMeterChange,
  searchHistory,
  onClearHistory,
  onTriggerSearch,
}: RhymeSearchPanelProps) {
  return (
    <div className="lg:col-span-1 space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4 text-purple-500" />
            البحث عن قافية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="اكتب كلمة للبحث..."
              value={searchWord}
              onChange={(e) => onSearchWordChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onTriggerSearch();
                }
              }}
              className="flex-1"
              dir="rtl"
            />
            <Button
              onClick={() => {
                onTriggerSearch();
              }}
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filterType}
              onValueChange={(v) => onFilterTypeChange(v as RhymeFilterType)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع القوافي</SelectItem>
                <SelectItem value="perfect">قوافي تامة</SelectItem>
                <SelectItem value="near">قوافي قريبة</SelectItem>
                <SelectItem value="slant">قوافي منحرفة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-purple-500" />
            بحور الشعر
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {POETRY_METERS.map((meter) => (
              <button
                key={meter.id}
                onClick={() =>
                  onSelectedMeterChange(
                    meter.id === selectedMeter ? null : meter.id
                  )
                }
                className={cn(
                  "w-full text-right p-2 rounded-lg transition-colors text-sm",
                  selectedMeter === meter.id
                    ? "bg-purple-500/20 border border-purple-500/30"
                    : "hover:bg-muted"
                )}
              >
                <div className="font-medium">{meter.name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {meter.pattern}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {searchHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                سجل البحث
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearHistory}
                className="h-6 px-2 text-xs"
              >
                مسح
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {searchHistory.map((word, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSearchWordChange(word);
                    onTriggerSearch(word);
                  }}
                  className="text-xs"
                >
                  {word}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

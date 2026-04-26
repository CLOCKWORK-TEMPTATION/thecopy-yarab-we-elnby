"use client";

import {
  BookOpen,
  Search,
  Sparkles,
  Music,
  Copy,
  Check,
  Loader2,
  History,
  Star,
  Filter,
  Heart,
  BookmarkCheck,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

interface RhymeResult {
  word: string;
  meaning?: string;
  type: "perfect" | "near" | "slant";
  syllables: number;
  usage?: string;
}

interface ArabicRhymeFinderProps {
  onWordSelect?: (word: string) => void;
  className?: string;
}

// Sample Arabic rhyme database
const ARABIC_RHYMES: Record<string, RhymeResult[]> = {
  ار: [
    {
      word: "نار",
      meaning: "fire",
      type: "perfect",
      syllables: 2,
      usage: "اشتعلت النار في الحطب",
    },
    {
      word: "دار",
      meaning: "home",
      type: "perfect",
      syllables: 2,
      usage: "عاد إلى داره سعيداً",
    },
    {
      word: "جار",
      meaning: "neighbor",
      type: "perfect",
      syllables: 2,
      usage: "الجار قبل الدار",
    },
    {
      word: "نهار",
      meaning: "daytime",
      type: "perfect",
      syllables: 3,
      usage: "في وضح النهار",
    },
    {
      word: "قرار",
      meaning: "decision",
      type: "perfect",
      syllables: 3,
      usage: "اتخذ قراراً حاسماً",
    },
    {
      word: "أسرار",
      meaning: "secrets",
      type: "perfect",
      syllables: 3,
      usage: "كشف الأسرار",
    },
    {
      word: "أنوار",
      meaning: "lights",
      type: "perfect",
      syllables: 3,
      usage: "أضاءت الأنوار",
    },
    {
      word: "أشجار",
      meaning: "trees",
      type: "perfect",
      syllables: 3,
      usage: "تحت ظل الأشجار",
    },
  ],
  يل: [
    {
      word: "ليل",
      meaning: "night",
      type: "perfect",
      syllables: 2,
      usage: "في جنح الليل",
    },
    {
      word: "جميل",
      meaning: "beautiful",
      type: "perfect",
      syllables: 3,
      usage: "منظر جميل",
    },
    {
      word: "طويل",
      meaning: "long",
      type: "perfect",
      syllables: 3,
      usage: "طريق طويل",
    },
    {
      word: "دليل",
      meaning: "guide",
      type: "perfect",
      syllables: 3,
      usage: "دليل واضح",
    },
    {
      word: "قليل",
      meaning: "few",
      type: "perfect",
      syllables: 3,
      usage: "عدد قليل",
    },
    {
      word: "سبيل",
      meaning: "path",
      type: "perfect",
      syllables: 3,
      usage: "في سبيل الله",
    },
    {
      word: "نخيل",
      meaning: "palm trees",
      type: "perfect",
      syllables: 3,
      usage: "غابة النخيل",
    },
  ],
  ين: [
    {
      word: "عين",
      meaning: "eye/spring",
      type: "perfect",
      syllables: 2,
      usage: "نبع العين",
    },
    {
      word: "حين",
      meaning: "when",
      type: "perfect",
      syllables: 2,
      usage: "حين الغروب",
    },
    {
      word: "يقين",
      meaning: "certainty",
      type: "perfect",
      syllables: 3,
      usage: "على يقين",
    },
    {
      word: "حنين",
      meaning: "longing",
      type: "perfect",
      syllables: 3,
      usage: "حنين الماضي",
    },
    {
      word: "سنين",
      meaning: "years",
      type: "perfect",
      syllables: 3,
      usage: "مرت السنين",
    },
    {
      word: "أمين",
      meaning: "trustworthy",
      type: "perfect",
      syllables: 3,
      usage: "رجل أمين",
    },
  ],
  ام: [
    {
      word: "سلام",
      meaning: "peace",
      type: "perfect",
      syllables: 3,
      usage: "السلام عليكم",
    },
    {
      word: "كلام",
      meaning: "speech",
      type: "perfect",
      syllables: 3,
      usage: "كلام جميل",
    },
    {
      word: "أيام",
      meaning: "days",
      type: "perfect",
      syllables: 3,
      usage: "مرت الأيام",
    },
    {
      word: "أحلام",
      meaning: "dreams",
      type: "perfect",
      syllables: 3,
      usage: "أحلام الطفولة",
    },
    {
      word: "نظام",
      meaning: "system",
      type: "perfect",
      syllables: 3,
      usage: "نظام دقيق",
    },
    {
      word: "إلهام",
      meaning: "inspiration",
      type: "perfect",
      syllables: 3,
      usage: "مصدر إلهام",
    },
  ],
  ون: [
    {
      word: "عيون",
      meaning: "eyes",
      type: "perfect",
      syllables: 3,
      usage: "عيون جميلة",
    },
    {
      word: "فنون",
      meaning: "arts",
      type: "perfect",
      syllables: 3,
      usage: "الفنون الجميلة",
    },
    {
      word: "شؤون",
      meaning: "affairs",
      type: "perfect",
      syllables: 3,
      usage: "شؤون الحياة",
    },
    {
      word: "قرون",
      meaning: "centuries",
      type: "perfect",
      syllables: 3,
      usage: "عبر القرون",
    },
    {
      word: "سكون",
      meaning: "stillness",
      type: "perfect",
      syllables: 3,
      usage: "سكون الليل",
    },
    {
      word: "جنون",
      meaning: "madness",
      type: "perfect",
      syllables: 3,
      usage: "حب جنون",
    },
  ],
  اب: [
    {
      word: "كتاب",
      meaning: "book",
      type: "perfect",
      syllables: 3,
      usage: "كتاب مفيد",
    },
    {
      word: "باب",
      meaning: "door",
      type: "perfect",
      syllables: 2,
      usage: "باب الأمل",
    },
    {
      word: "شباب",
      meaning: "youth",
      type: "perfect",
      syllables: 3,
      usage: "أيام الشباب",
    },
    {
      word: "جواب",
      meaning: "answer",
      type: "perfect",
      syllables: 3,
      usage: "في انتظار الجواب",
    },
    {
      word: "سحاب",
      meaning: "clouds",
      type: "perfect",
      syllables: 3,
      usage: "في السحاب",
    },
    {
      word: "أحباب",
      meaning: "loved ones",
      type: "perfect",
      syllables: 3,
      usage: "أحباب القلب",
    },
  ],
};

// Arabic poetry meters (بحور الشعر)
const POETRY_METERS = [
  { id: "tawil", name: "الطويل", pattern: "فعولن مفاعيلن فعولن مفاعلن" },
  { id: "basit", name: "البسيط", pattern: "مستفعلن فاعلن مستفعلن فعلن" },
  { id: "kamil", name: "الكامل", pattern: "متفاعلن متفاعلن متفاعلن" },
  { id: "wafir", name: "الوافر", pattern: "مفاعلتن مفاعلتن فعولن" },
  { id: "rajaz", name: "الرجز", pattern: "مستفعلن مستفعلن مستفعلن" },
  { id: "ramal", name: "الرمل", pattern: "فاعلاتن فاعلاتن فاعلاتن" },
  { id: "khafif", name: "الخفيف", pattern: "فاعلاتن مستفعلن فاعلاتن" },
  { id: "mutaqarib", name: "المتقارب", pattern: "فعولن فعولن فعولن فعولن" },
];

// Extract ending from Arabic word
const getWordEnding = (word: string): string => {
  const cleaned = word.trim();
  if (cleaned.length < 2) return cleaned;
  return cleaned.slice(-2);
};

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
  const [filterType, setFilterType] = React.useState<
    "all" | "perfect" | "near" | "slant"
  >("all");

  // Search for rhymes
  const searchRhymes = async () => {
    if (!searchWord.trim()) return;

    setIsSearching(true);

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const ending = getWordEnding(searchWord);
    let foundRhymes = ARABIC_RHYMES[ending] ?? [];

    // If no exact match, try similar endings
    if (foundRhymes.length === 0) {
      const lastChar = searchWord.slice(-1);
      for (const [key, rhymes] of Object.entries(ARABIC_RHYMES)) {
        if (key.includes(lastChar)) {
          foundRhymes = [
            ...foundRhymes,
            ...rhymes.map((r) => ({ ...r, type: "near" as const })),
          ];
        }
      }
    }

    // Apply filter
    if (filterType !== "all") {
      foundRhymes = foundRhymes.filter((r) => r.type === filterType);
    }

    setResults(foundRhymes);
    setIsSearching(false);

    // Add to search history
    if (!searchHistory.includes(searchWord)) {
      setSearchHistory((prev) => [searchWord, ...prev.slice(0, 9)]);
    }
  };

  // Copy word to clipboard
  const copyWord = (word: string) => {
    navigator.clipboard.writeText(word);
    setCopiedWord(word);
    setTimeout(() => setCopiedWord(null), 2000);
  };

  // Toggle favorite
  const toggleFavorite = (word: string) => {
    setFavorites((prev) =>
      prev.includes(word) ? prev.filter((w) => w !== word) : [...prev, word]
    );
  };

  // Get rhyme type color
  const getRhymeTypeColor = (type: RhymeResult["type"]) => {
    switch (type) {
      case "perfect":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "near":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "slant":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    }
  };

  return (
    <TooltipProvider>
      <div className={cn("arabic-rhyme-finder space-y-6", className)}>
        {/* Header */}
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
          {/* Search & Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Search */}
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
                    onChange={(e) => setSearchWord(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchRhymes()}
                    className="flex-1"
                    dir="rtl"
                  />
                  <Button onClick={searchRhymes} disabled={isSearching}>
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={filterType}
                    onValueChange={(v) => setFilterType(v as typeof filterType)}
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

            {/* Poetry Meters */}
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
                        setSelectedMeter(
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

            {/* Search History */}
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
                      onClick={() => setSearchHistory([])}
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
                          setSearchWord(word);
                          searchRhymes();
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

          {/* Results */}
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
                  <span className="font-bold text-purple-400">
                    {searchWord}
                  </span>
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
                          <span className="text-xl font-bold">
                            {rhyme.word}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              getRhymeTypeColor(rhyme.type)
                            )}
                          >
                            {rhyme.type === "perfect"
                              ? "تامة"
                              : rhyme.type === "near"
                                ? "قريبة"
                                : "منحرفة"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => toggleFavorite(rhyme.word)}
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
                                onClick={() => copyWord(rhyme.word)}
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
                                onClick={() => onWordSelect?.(rhyme.word)}
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
        </div>

        {/* Favorites */}
        {favorites.length > 0 && (
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
                    onClick={() => {
                      setSearchWord(word);
                      searchRhymes();
                    }}
                  >
                    {word}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(word);
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
        )}
      </div>
    </TooltipProvider>
  );
}

export default ArabicRhymeFinder;

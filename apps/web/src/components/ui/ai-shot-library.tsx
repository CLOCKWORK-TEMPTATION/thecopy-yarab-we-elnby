"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Sparkles,
  Camera,
  Film,
  Video,
  Bookmark,
  BookmarkCheck,
  Grid3X3,
  List,
  SlidersHorizontal,
  Plus,
  Download,
  Loader2,
  Wand2,
  Layers,
  Eye,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * AI Shot Library Component for Directors Studio
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - AI-powered semantic search for shots
 * - Filter by shot type, camera angle, movement, mood
 * - Reference image grid with previews
 * - Saved collections
 * - Similar shot suggestions
 * - Natural language search
 */

interface ShotReference {
  id: string;
  title: string;
  film: string;
  director: string;
  year: number;
  shotType: string;
  cameraAngle: string;
  cameraMovement: string;
  lighting: string;
  mood: string[];
  tags: string[];
  thumbnail: string;
  isSaved: boolean;
  views: number;
  similarity?: number;
}

interface AIShotLibraryProps {
  onSelectShot?: (shot: ShotReference) => void;
  onAddToScene?: (shot: ShotReference) => void;
  className?: string;
}

// Sample data - In production, this would come from an API
const SAMPLE_SHOTS: ShotReference[] = [
  {
    id: "1",
    title: "لقطة افتتاحية درامية",
    film: "The Godfather",
    director: "Francis Ford Coppola",
    year: 1972,
    shotType: "close-up",
    cameraAngle: "eye-level",
    cameraMovement: "static",
    lighting: "low-key",
    mood: ["dramatic", "intense", "mysterious"],
    tags: ["crime", "classic", "portrait"],
    thumbnail: "https://placehold.co/400x225/1a1a1a/888888?text=Shot+1",
    isSaved: false,
    views: 15420,
  },
  {
    id: "2",
    title: "لقطة تتبع طويلة",
    film: "Goodfellas",
    director: "Martin Scorsese",
    year: 1990,
    shotType: "medium",
    cameraAngle: "eye-level",
    cameraMovement: "steadicam",
    lighting: "natural",
    mood: ["energetic", "immersive"],
    tags: ["tracking", "restaurant", "continuous"],
    thumbnail: "https://placehold.co/400x225/1a1a1a/888888?text=Shot+2",
    isSaved: true,
    views: 23150,
  },
  {
    id: "3",
    title: "زاوية منخفضة مهيبة",
    film: "Citizen Kane",
    director: "Orson Welles",
    year: 1941,
    shotType: "wide",
    cameraAngle: "low",
    cameraMovement: "static",
    lighting: "high-key",
    mood: ["powerful", "dominant"],
    tags: ["power", "architecture", "classic"],
    thumbnail: "https://placehold.co/400x225/1a1a1a/888888?text=Shot+3",
    isSaved: false,
    views: 18900,
  },
  {
    id: "4",
    title: "لقطة سيلويت",
    film: "Blade Runner 2049",
    director: "Denis Villeneuve",
    year: 2017,
    shotType: "wide",
    cameraAngle: "eye-level",
    cameraMovement: "slow-push",
    lighting: "backlit",
    mood: ["atmospheric", "melancholic", "futuristic"],
    tags: ["sci-fi", "silhouette", "neon"],
    thumbnail: "https://placehold.co/400x225/1a1a1a/888888?text=Shot+4",
    isSaved: false,
    views: 31200,
  },
  {
    id: "5",
    title: "دوران 360 درجة",
    film: "The Matrix",
    director: "Wachowskis",
    year: 1999,
    shotType: "medium",
    cameraAngle: "varied",
    cameraMovement: "rotation",
    lighting: "stylized",
    mood: ["action", "iconic"],
    tags: ["action", "bullet-time", "vfx"],
    thumbnail: "https://placehold.co/400x225/1a1a1a/888888?text=Shot+5",
    isSaved: true,
    views: 45600,
  },
  {
    id: "6",
    title: "لقطة مرآة",
    film: "Taxi Driver",
    director: "Martin Scorsese",
    year: 1976,
    shotType: "close-up",
    cameraAngle: "eye-level",
    cameraMovement: "static",
    lighting: "natural",
    mood: ["psychological", "intense"],
    tags: ["mirror", "monologue", "character"],
    thumbnail: "https://placehold.co/400x225/1a1a1a/888888?text=Shot+6",
    isSaved: false,
    views: 28700,
  },
];

const SHOT_TYPES = [
  { value: "all", label: "الكل" },
  { value: "extreme-wide", label: "عريضة جداً" },
  { value: "wide", label: "عريضة" },
  { value: "medium", label: "متوسطة" },
  { value: "close-up", label: "قريبة" },
  { value: "extreme-close-up", label: "قريبة جداً" },
];

const CAMERA_ANGLES = [
  { value: "all", label: "الكل" },
  { value: "high", label: "عالية" },
  { value: "eye-level", label: "مستوى العين" },
  { value: "low", label: "منخفضة" },
  { value: "birds-eye", label: "عين الطائر" },
  { value: "dutch", label: "مائلة" },
];

const MOVEMENTS = [
  { value: "all", label: "الكل" },
  { value: "static", label: "ثابتة" },
  { value: "pan", label: "أفقية" },
  { value: "tilt", label: "عمودية" },
  { value: "dolly", label: "تتبع" },
  { value: "steadicam", label: "ستيديكام" },
  { value: "handheld", label: "محمولة" },
];

const MOODS = [
  "dramatic",
  "romantic",
  "action",
  "mysterious",
  "melancholic",
  "energetic",
  "peaceful",
  "intense",
  "atmospheric",
];

export function AIShotLibrary({ onAddToScene, className }: AIShotLibraryProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isAISearching, setIsAISearching] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");
  const [shots, setShots] = React.useState<ShotReference[]>(SAMPLE_SHOTS);
  const [selectedShot, setSelectedShot] = React.useState<ShotReference | null>(
    null
  );
  const [] = React.useState(false);

  // Filters
  const [filters, setFilters] = React.useState({
    shotType: "all",
    cameraAngle: "all",
    movement: "all",
    moods: [] as string[],
    savedOnly: false,
  });

  // AI Search
  const handleAISearch = async () => {
    if (!searchQuery.trim()) return;

    setIsAISearching(true);

    // Simulate AI search
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Filter based on query (simplified - in production would use AI)
    const keywords = searchQuery.toLowerCase().split(" ");
    const filtered = SAMPLE_SHOTS.map((shot) => {
      const matchScore = keywords.reduce((score, keyword) => {
        if (shot.title.toLowerCase().includes(keyword)) score += 3;
        if (shot.film.toLowerCase().includes(keyword)) score += 2;
        if (shot.tags.some((t) => t.includes(keyword))) score += 2;
        if (shot.mood.some((m) => m.includes(keyword))) score += 1;
        return score;
      }, 0);

      return { ...shot, similarity: Math.min(100, matchScore * 15 + 40) };
    })
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .filter((shot) => (shot.similarity || 0) > 30);

    setShots(filtered.length > 0 ? filtered : SAMPLE_SHOTS);
    setIsAISearching(false);
  };

  // Toggle save
  const toggleSave = (id: string) => {
    setShots(
      shots.map((shot) =>
        shot.id === id ? { ...shot, isSaved: !shot.isSaved } : shot
      )
    );
  };

  // Toggle mood filter
  const toggleMoodFilter = (mood: string) => {
    setFilters((prev) => ({
      ...prev,
      moods: prev.moods.includes(mood)
        ? prev.moods.filter((m) => m !== mood)
        : [...prev.moods, mood],
    }));
  };

  // Apply filters
  const filteredShots = React.useMemo(() => {
    return shots.filter((shot) => {
      if (filters.shotType !== "all" && shot.shotType !== filters.shotType)
        return false;
      if (
        filters.cameraAngle !== "all" &&
        shot.cameraAngle !== filters.cameraAngle
      )
        return false;
      if (
        filters.movement !== "all" &&
        shot.cameraMovement !== filters.movement
      )
        return false;
      if (
        filters.moods.length > 0 &&
        !filters.moods.some((m) => shot.mood.includes(m))
      )
        return false;
      if (filters.savedOnly && !shot.isSaved) return false;
      return true;
    });
  }, [shots, filters]);

  // Get mood color
  const getMoodColor = (mood: string) => {
    const colors: Record<string, string> = {
      dramatic: "bg-red-500/20 text-red-400",
      romantic: "bg-pink-500/20 text-pink-400",
      action: "bg-orange-500/20 text-orange-400",
      mysterious: "bg-purple-500/20 text-purple-400",
      melancholic: "bg-blue-500/20 text-blue-400",
      energetic: "bg-yellow-500/20 text-yellow-400",
      peaceful: "bg-green-500/20 text-green-400",
      intense: "bg-red-600/20 text-red-500",
      atmospheric: "bg-cyan-500/20 text-cyan-400",
    };
    return colors[mood] || "bg-muted text-muted-foreground";
  };

  return (
    <TooltipProvider>
      <div className={cn("ai-shot-library flex flex-col h-full", className)}>
        {/* Header */}
        <div className="p-4 border-b bg-card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Film className="h-5 w-5 text-brand" />
                مكتبة اللقطات الذكية
              </h2>
              <p className="text-sm text-muted-foreground">
                ابحث بالذكاء الاصطناعي أو تصفح اللقطات المرجعية
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                <Bookmark className="h-3 w-3 ml-1" />
                {shots.filter((s) => s.isSaved).length} محفوظ
              </Badge>
            </div>
          </div>

          {/* AI Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بوصف المشهد... مثال: لقطة درامية مع إضاءة منخفضة"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
                className="pr-10"
                dir="rtl"
              />
            </div>
            <Button onClick={handleAISearch} disabled={isAISearching}>
              {isAISearching ? (
                <>
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  جاري البحث...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 ml-2" />
                  بحث ذكي
                </>
              )}
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={filters.shotType}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, shotType: v }))
              }
            >
              <SelectTrigger className="w-32">
                <Video className="h-4 w-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHOT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.cameraAngle}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, cameraAngle: v }))
              }
            >
              <SelectTrigger className="w-36">
                <Camera className="h-4 w-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMERA_ANGLES.map((angle) => (
                  <SelectItem key={angle.value} value={angle.value}>
                    {angle.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.movement}
              onValueChange={(v) =>
                setFilters((prev) => ({ ...prev, movement: v }))
              }
            >
              <SelectTrigger className="w-32">
                <Layers className="h-4 w-4 ml-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENTS.map((movement) => (
                  <SelectItem key={movement.value} value={movement.value}>
                    {movement.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SlidersHorizontal className="h-4 w-4 ml-2" />
                  المزاج
                  {filters.moods.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="mr-2 h-5 w-5 p-0 flex items-center justify-center"
                    >
                      {filters.moods.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>اختر المزاج</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {MOODS.map((mood) => (
                  <DropdownMenuCheckboxItem
                    key={mood}
                    checked={filters.moods.includes(mood)}
                    onCheckedChange={() => toggleMoodFilter(mood)}
                  >
                    {mood}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={filters.savedOnly ? "secondary" : "outline"}
              size="sm"
              onClick={() =>
                setFilters((prev) => ({ ...prev, savedOnly: !prev.savedOnly }))
              }
            >
              <Bookmark className="h-4 w-4 ml-1" />
              المحفوظة فقط
            </Button>

            <div className="flex-1" />

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Results count */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {filteredShots.length} نتيجة
            </p>
            <Select defaultValue="relevance">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">الأكثر صلة</SelectItem>
                <SelectItem value="views">الأكثر مشاهدة</SelectItem>
                <SelectItem value="recent">الأحدث</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Grid View */}
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredShots.map((shot) => (
                <Card
                  key={shot.id}
                  className={cn(
                    "overflow-hidden cursor-pointer group card-interactive",
                    "hover:ring-2 hover:ring-brand/50"
                  )}
                  onClick={() => setSelectedShot(shot)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted overflow-hidden">
                    <img
                      src={shot.thumbnail}
                      alt={shot.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Similarity badge */}
                    {shot.similarity && (
                      <Badge className="absolute top-2 right-2 bg-brand text-white">
                        <Wand2 className="h-3 w-3 ml-1" />
                        {shot.similarity}% تطابق
                      </Badge>
                    )}

                    {/* Quick actions overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSave(shot.id);
                            }}
                          >
                            {shot.isSaved ? (
                              <BookmarkCheck className="h-4 w-4 text-brand" />
                            ) : (
                              <Bookmark className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {shot.isSaved ? "إزالة من المحفوظات" : "حفظ"}
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToScene?.(shot);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>إضافة للمشهد</TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Views */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 text-xs text-white/80">
                      <Eye className="h-3 w-3" />
                      {(shot.views / 1000).toFixed(1)}K
                    </div>
                  </div>

                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-sm line-clamp-1">
                          {shot.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {shot.film} ({shot.year})
                        </p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs">
                        {shot.shotType}
                      </Badge>
                      {shot.mood.slice(0, 2).map((m) => (
                        <Badge
                          key={m}
                          className={cn("text-xs", getMoodColor(m))}
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="space-y-2">
              {filteredShots.map((shot) => (
                <Card
                  key={shot.id}
                  className="overflow-hidden cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedShot(shot)}
                >
                  <div className="flex items-center gap-4 p-3">
                    {/* Thumbnail */}
                    <div className="w-32 aspect-video bg-muted rounded-md overflow-hidden flex-shrink-0">
                      <img
                        src={shot.thumbnail}
                        alt={shot.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium">{shot.title}</h3>
                        {shot.similarity && (
                          <Badge variant="secondary" className="text-xs">
                            {shot.similarity}% تطابق
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {shot.film} • {shot.director} • {shot.year}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-xs">
                          {shot.shotType}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {shot.cameraAngle}
                        </Badge>
                        {shot.mood.slice(0, 2).map((m) => (
                          <Badge
                            key={m}
                            className={cn("text-xs", getMoodColor(m))}
                          >
                            {m}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(shot.id);
                        }}
                      >
                        {shot.isSaved ? (
                          <BookmarkCheck className="h-4 w-4 text-brand" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToScene?.(shot);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Empty state */}
          {filteredShots.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Film className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">لم يتم العثور على نتائج</h3>
              <p className="text-sm text-muted-foreground mb-4">
                جرب تعديل معايير البحث أو استخدم البحث الذكي
              </p>
              <Button
                variant="outline"
                onClick={() =>
                  setFilters({
                    shotType: "all",
                    cameraAngle: "all",
                    movement: "all",
                    moods: [],
                    savedOnly: false,
                  })
                }
              >
                إعادة تعيين الفلاتر
              </Button>
            </div>
          )}
        </div>

        {/* Shot Detail Dialog */}
        <Dialog
          open={!!selectedShot}
          onOpenChange={() => setSelectedShot(null)}
        >
          <DialogContent className="max-w-3xl">
            {selectedShot && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-brand" />
                    {selectedShot.title}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedShot.film} • {selectedShot.director} •{" "}
                    {selectedShot.year}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {/* Preview */}
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    <img
                      src={selectedShot.thumbnail}
                      alt={selectedShot.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Technical Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        نوع اللقطة
                      </p>
                      <p className="font-medium">{selectedShot.shotType}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        زاوية الكاميرا
                      </p>
                      <p className="font-medium">{selectedShot.cameraAngle}</p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        الحركة
                      </p>
                      <p className="font-medium">
                        {selectedShot.cameraMovement}
                      </p>
                    </Card>
                    <Card className="p-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        الإضاءة
                      </p>
                      <p className="font-medium">{selectedShot.lighting}</p>
                    </Card>
                  </div>

                  {/* Mood Tags */}
                  <div>
                    <p className="text-sm font-medium mb-2">المزاج والأجواء</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedShot.mood.map((m) => (
                        <Badge key={m} className={getMoodColor(m)}>
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-sm font-medium mb-2">الوسوم</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedShot.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button
                      variant={selectedShot.isSaved ? "secondary" : "outline"}
                      onClick={() => toggleSave(selectedShot.id)}
                    >
                      {selectedShot.isSaved ? (
                        <>
                          <BookmarkCheck className="h-4 w-4 ml-2 text-brand" />
                          تم الحفظ
                        </>
                      ) : (
                        <>
                          <Bookmark className="h-4 w-4 ml-2" />
                          حفظ للمرجعية
                        </>
                      )}
                    </Button>
                    <Button onClick={() => onAddToScene?.(selectedShot)}>
                      <Plus className="h-4 w-4 ml-2" />
                      إضافة للمشهد
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 ml-2" />
                      تحميل
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

export default AIShotLibrary;

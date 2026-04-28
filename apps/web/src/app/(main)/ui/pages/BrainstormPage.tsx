import { motion } from "framer-motion";
import { Plus, Pin, Trash2, Grid3x3, Layers, Lightbulb } from "lucide-react";
import { useState } from "react";

import { ExportHub } from "@/app/(main)/ui/components/ExportHub";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface IdeaCard {
  id: string;
  title: string;
  content: string;
  tags: string[];
  group?: string;
  isPinned: boolean;
}

export function BrainstormPage() {
  const [viewMode, setViewMode] = useState<"grid" | "affinity">("grid");
  const [ideas, setIdeas] = useState<IdeaCard[]>([
    {
      id: "1",
      title: "فكرة الصراع الداخلي",
      content: "استكشاف صراع البطل بين الواجب والرغبة الشخصية",
      tags: ["شخصيات", "صراع"],
      isPinned: false,
    },
    {
      id: "2",
      title: "مشهد الكشف الكبير",
      content: "لحظة تكشف فيها الحقيقة بشكل درامي",
      tags: ["مشاهد", "ذروة"],
      isPinned: true,
    },
    {
      id: "3",
      title: "تطوير الشخصية الثانوية",
      content: "إضافة عمق لشخصية الحليف المقرب",
      tags: ["شخصيات", "تطوير"],
      isPinned: false,
    },
    {
      id: "4",
      title: "نهاية مفتوحة",
      content: "ترك نهاية القصة مفتوحة للتفسير",
      tags: ["بنية", "نهاية"],
      group: "النهايات",
      isPinned: false,
    },
    {
      id: "5",
      title: "نهاية محسومة",
      content: "إنهاء القصة بشكل واضح وحاسم",
      tags: ["بنية", "نهاية"],
      group: "النهايات",
      isPinned: false,
    },
  ]);

  const [newIdeaTitle, setNewIdeaTitle] = useState("");

  const handleAddIdea = () => {
    if (!newIdeaTitle.trim()) return;

    const newIdea: IdeaCard = {
      id: Date.now().toString(),
      title: newIdeaTitle,
      content: "",
      tags: [],
      isPinned: false,
    };

    setIdeas([...ideas, newIdea]);
    setNewIdeaTitle("");
  };

  const handleTogglePin = (id: string) => {
    setIdeas(
      ideas.map((idea) =>
        idea.id === id ? { ...idea, isPinned: !idea.isPinned } : idea
      )
    );
  };

  const handleDeleteIdea = (id: string) => {
    setIdeas(ideas.filter((idea) => idea.id !== id));
  };

  const groupedIdeas = ideas.reduce(
    (acc, idea) => {
      const group = idea.group ?? "عام";
      acc[group] ??= [];
      acc[group].push(idea);
      return acc;
    },
    {} as Record<string, IdeaCard[]>
  );

  const pinnedIdeas = ideas.filter((i) => i.isPinned);
  const unpinnedIdeas = ideas.filter((i) => !i.isPinned);

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-[var(--color-surface)] bg-[var(--color-panel)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[var(--color-text)] mb-1" dir="rtl">
              العصف الذهني
            </h1>
            <p className="text-[var(--color-muted)]" dir="rtl">
              {ideas.length} فكرة • {Object.keys(groupedIdeas).length} مجموعة
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-[var(--color-surface)] rounded-lg p-1">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className={
                  viewMode === "grid"
                    ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : ""
                }
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "affinity" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("affinity")}
                className={
                  viewMode === "affinity"
                    ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : ""
                }
              >
                <Layers className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Input
            value={newIdeaTitle}
            onChange={(e) => setNewIdeaTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddIdea();
            }}
            placeholder="أضف فكرة جديدة..."
            className="flex-1 bg-[var(--color-surface)] border-[var(--color-surface)] text-[var(--color-text)]"
            dir="rtl"
          />
          <Button
            onClick={handleAddIdea}
            className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
          >
            <Plus className="w-4 h-4 ml-2" />
            إضافة
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {ideas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4">
              <Lightbulb className="w-12 h-12 text-[var(--color-muted)]" />
            </div>
            <h2 className="text-[var(--color-text)] mb-2">لا توجد أفكار بعد</h2>
            <p className="text-[var(--color-muted)] max-w-md">
              ابدأ بإضافة أفكارك الإبداعية وسيتم تنظيمها تلقائياً
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="max-w-7xl mx-auto space-y-8">
            {pinnedIdeas.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Pin className="w-5 h-5 text-[var(--color-accent)]" />
                  <h2 className="text-[var(--color-text)]" dir="rtl">
                    مثبّت
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedIdeas.map((idea) => (
                    <IdeaCardComponent
                      key={idea.id}
                      idea={idea}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDeleteIdea}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              {pinnedIdeas.length > 0 && (
                <h2 className="text-[var(--color-text)] mb-4" dir="rtl">
                  جميع الأفكار
                </h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unpinnedIdeas.map((idea) => (
                  <IdeaCardComponent
                    key={idea.id}
                    idea={idea}
                    onTogglePin={handleTogglePin}
                    onDelete={handleDeleteIdea}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto space-y-6">
            {Object.entries(groupedIdeas).map(([group, groupIdeas]) => (
              <div key={group}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[var(--color-text)]" dir="rtl">
                    {group}
                  </h2>
                  <Badge
                    variant="outline"
                    className="border-[var(--color-muted)] text-[var(--color-muted)]"
                  >
                    {groupIdeas.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupIdeas.map((idea) => (
                    <IdeaCardComponent
                      key={idea.id}
                      idea={idea}
                      onTogglePin={handleTogglePin}
                      onDelete={handleDeleteIdea}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ExportHub scope="full_project" />
    </div>
  );
}

function IdeaCardComponent({
  idea,
  onTogglePin,
  onDelete,
}: {
  idea: IdeaCard;
  onTogglePin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
    >
      <Card className="p-4 bg-[var(--color-panel)] border-[var(--color-surface)] hover:border-[var(--color-accent-weak)] transition-colors group">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-[var(--color-text)] flex-1" dir="rtl">
            {idea.title}
          </h3>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePin(idea.id)}
              className={`p-1 h-auto ${idea.isPinned ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"} hover:bg-[var(--color-surface)]`}
            >
              <Pin className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(idea.id)}
              className="p-1 h-auto text-[var(--state-flagged)] hover:bg-[var(--color-surface)]"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {idea.content && (
          <p className="text-[var(--color-muted)] mb-3" dir="rtl">
            {idea.content}
          </p>
        )}

        {idea.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {idea.tags.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-[var(--color-surface)] text-[var(--color-muted)]"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

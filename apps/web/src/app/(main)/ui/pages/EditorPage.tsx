import { AnimatePresence } from "framer-motion";
import { Plus, Grid3x3, List } from "lucide-react";
import { useState } from "react";

import { ExportHub } from "@/app/(main)/ui/components/ExportHub";
import { InspectorPanel } from "@/app/(main)/ui/components/InspectorPanel";
import { NarrativeTimeline } from "@/app/(main)/ui/components/NarrativeTimeline";
import { SceneCard } from "@/app/(main)/ui/components/SceneCard";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/ai/utils/logger";

interface Scene {
  id: string;
  title: string;
  beats: string[];
  duration: string;
  status: "draft" | "final" | "alt" | "flagged";
  linksIn: number;
  linksOut: number;
  branch?: "A" | "B" | "C";
  act?: number;
  beat?: string;
  description?: string;
  characters?: string[];
}

export function EditorPage() {
  const [viewMode, setViewMode] = useState<"grid" | "timeline">("grid");
  const [focusedScene, setFocusedScene] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  const [scenes, setScenes] = useState<Scene[]>([
    {
      id: "1",
      title: "البداية: لقاء غير متوقع",
      beats: ["افتتاحية", "تعارف"],
      duration: "5 دقائق",
      status: "final",
      linksIn: 0,
      linksOut: 2,
      act: 1,
      beat: "افتتاحية",
      description: "مشهد افتتاحي يقدم الشخصيات الرئيسية",
      characters: ["أحمد", "سارة"],
    },
    {
      id: "2",
      title: "الصراع الداخلي",
      beats: ["تطور", "أزمة"],
      duration: "8 دقائق",
      status: "draft",
      linksIn: 1,
      linksOut: 2,
      act: 2,
      beat: "تطور",
      description: "تتصاعد المشاكل الداخلية للبطل",
      characters: ["أحمد"],
    },
    {
      id: "3",
      title: "المواجهة النهائية",
      beats: ["ذروة", "حل"],
      duration: "10 دقائق",
      status: "alt",
      linksIn: 2,
      linksOut: 1,
      branch: "A",
      act: 3,
      beat: "ذروة",
      description: "مواجهة حاسمة تحدد مصير الشخصيات",
      characters: ["أحمد", "سارة", "خالد"],
    },
    {
      id: "4",
      title: "نهاية بديلة: الأمل",
      beats: ["ذروة", "حل", "خاتمة"],
      duration: "7 دقائق",
      status: "flagged",
      linksIn: 2,
      linksOut: 0,
      branch: "B",
      act: 3,
      beat: "خاتمة",
      description: "نهاية أكثر تفاؤلاً",
      characters: ["أحمد", "سارة"],
    },
  ]);

  const handleSceneClick = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (scene) {
      setSelectedScene(scene);
      setFocusedScene(sceneId);
      setInspectorOpen(true);
    }
  };

  const handleAddScene = () => {
    const newScene: Scene = {
      id: Date.now().toString(),
      title: "مشهد جديد",
      beats: [],
      duration: "5 دقائق",
      status: "draft",
      linksIn: 0,
      linksOut: 0,
      description: "",
      characters: [],
    };
    setScenes([...scenes, newScene]);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-[var(--color-surface)] bg-[var(--color-panel)] px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[var(--color-text)] mb-1">محرر المشاهد</h1>
            <p className="text-[var(--color-muted)]">{scenes.length} مشهد</p>
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
                variant={viewMode === "timeline" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("timeline")}
                className={
                  viewMode === "timeline"
                    ? "bg-[var(--color-accent)] text-[var(--color-bg)]"
                    : ""
                }
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="default"
              onClick={handleAddScene}
              className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
            >
              <Plus className="w-4 h-4 ml-2" />
              مشهد جديد
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6">
          {scenes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 rounded-full bg-[var(--color-surface)] flex items-center justify-center mb-4">
                <Plus className="w-12 h-12 text-[var(--color-muted)]" />
              </div>
              <h2 className="text-[var(--color-text)] mb-2">
                لا توجد مشاهد بعد
              </h2>
              <p className="text-[var(--color-muted)] mb-6 max-w-md">
                ابدأ بإنشاء مشهدك الأول لبناء قصتك غير الخطية
              </p>
              <Button
                variant="default"
                onClick={handleAddScene}
                className="bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
              >
                <Plus className="w-4 h-4 ml-2" />
                إنشاء أول مشهد
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scenes.map((scene) => (
                <SceneCard
                  key={scene.id}
                  scene={{
                    id: scene.id,
                    title: scene.title,
                    beats: scene.beats,
                    duration: scene.duration,
                    status: scene.status,
                  }}
                  connections={{
                    linksIn: scene.linksIn,
                    linksOut: scene.linksOut,
                  }}
                  display={{
                    isFocused: focusedScene === scene.id,
                  }}
                  onClick={() => handleSceneClick(scene.id)}
                />
              ))}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <NarrativeTimeline
                mode="nonlinear"
                scenes={scenes}
                onSceneClick={handleSceneClick}
                onBranchCreate={(sceneId) => {
                  logger.info("Create branch from:", sceneId);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Inspector panel */}
      <AnimatePresence>
        {inspectorOpen && selectedScene && (
          <InspectorPanel
            isOpen={inspectorOpen}
            onClose={() => {
              setInspectorOpen(false);
              setFocusedScene(null);
            }}
            sceneData={selectedScene}
            onUpdate={(data) => {
              logger.info("Update scene:", data);
            }}
          />
        )}
      </AnimatePresence>

      {/* Export hub */}
      <ExportHub scope="full_project" />
    </div>
  );
}

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Camera, Lightbulb, AlertTriangle } from "lucide-react";
import { useState, useCallback, memo } from "react";

import ShotPlanningCard from "@/app/(main)/directors-studio/components/ShotPlanningCard";
import { useCurrentProject } from "@/app/(main)/directors-studio/lib/ProjectContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VirtualizedGrid } from "@/components/ui/virtualized-grid";

import type { Shot, Scene } from "@/types/api";

const ShotCard = memo(function ShotCard({
  shot,
  onDelete,
  deleteConfirmId,
  onCancelDelete,
}: {
  shot: Shot;
  onDelete: (shotId: string) => void;
  deleteConfirmId: string | null;
  onCancelDelete: () => void;
}) {
  const isConfirming = deleteConfirmId === shot.id;
  return (
    <Card className="h-full border-[var(--app-border)] bg-[var(--app-surface)]">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center">
              <Camera className="h-5 w-5 text-[var(--app-accent)]" />
            </div>
            <div>
              <CardTitle className="text-[var(--app-text)]">
                لقطة #{shot.shotNumber}
              </CardTitle>
              <CardDescription>{shot.shotType}</CardDescription>
            </div>
          </div>
          {isConfirming ? (
            <div className="flex gap-1">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(shot.id)}
                aria-label="تأكيد حذف اللقطة"
              >
                تأكيد
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelDelete}
                aria-label="إلغاء حذف اللقطة"
              >
                إلغاء
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(shot.id)}
              aria-label={`حذف اللقطة ${shot.shotNumber}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-semibold w-24">زاوية الكاميرا:</span>
            <span className="text-[var(--app-text-muted)]">
              {shot.cameraAngle}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-24">الحركة:</span>
            <span className="text-[var(--app-text-muted)]">
              {shot.cameraMovement}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold w-24">الإضاءة:</span>
            <span className="text-[var(--app-text-muted)]">
              {shot.lighting}
            </span>
          </div>
          {shot.aiSuggestion && (
            <div className="mt-3 p-3 bg-[var(--app-accent)]/5 rounded-md border border-[var(--app-accent)]/20">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-[var(--app-accent)] mt-0.5" />
                <div>
                  <p className="font-semibold text-xs text-[var(--app-accent)] mb-1">
                    اقتراح AI
                  </p>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    {shot.aiSuggestion}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default function ShotsPage() {
  const [selectedSceneId, setSelectedSceneId] = useState<string>("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { projectId: currentProjectId } = useCurrentProject();

  const { data: scenes } = useQuery({
    queryKey: ["scenes", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      const res = await fetch(`/api/projects/${currentProjectId}/scenes`);
      if (!res.ok) throw new Error(`فشل تحميل المشاهد: ${res.status}`);
      const data = await res.json();
      return data.data as Scene[];
    },
    enabled: !!currentProjectId,
  });

  const {
    data: shots,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shots", selectedSceneId],
    queryFn: async () => {
      if (!selectedSceneId) return [];
      const res = await fetch(`/api/scenes/${selectedSceneId}/shots`);
      if (!res.ok) throw new Error(`فشل تحميل اللقطات: ${res.status}`);
      const data = await res.json();
      return data.data as Shot[];
    },
    enabled: !!selectedSceneId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (shotId: string) => {
      const res = await fetch(`/api/shots/${shotId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`فشل حذف اللقطة: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shots"] });
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      setDeleteConfirmId(null);
    },
  });

  const handleDelete = useCallback(
    async (shotId: string) => {
      if (deleteConfirmId === shotId) {
        await deleteMutation.mutateAsync(shotId);
      } else {
        setDeleteConfirmId(shotId);
      }
    },
    [deleteConfirmId, deleteMutation]
  );

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  const selectedScene = scenes?.find((s) => s.id === selectedSceneId);
  const nextShotNumber = shots ? shots.length + 1 : 1;

  if (!currentProjectId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-16 w-16 text-[var(--app-text-muted)]" />
        <p className="text-[var(--app-text-muted)] text-lg">
          لا يوجد مشروع محدد. يرجى اختيار مشروع أولاً.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--app-text)]">اللقطات</h1>
        <p className="text-[var(--app-text-muted)] mt-2">
          تخطيط اللقطات للمشاهد
        </p>
      </div>

      {/* محدد المشهد */}
      <div className="mb-6">
        <label
          htmlFor="scene-selector"
          className="block text-sm font-medium mb-2 text-[var(--app-text)]"
        >
          اختر المشهد
        </label>
        <select
          id="scene-selector"
          value={selectedSceneId}
          onChange={(e) => {
            setSelectedSceneId(e.target.value);
            setDeleteConfirmId(null);
          }}
          className="w-full max-w-md px-4 py-2 border border-[var(--app-border)] rounded-md bg-[var(--app-surface)] text-[var(--app-text)]"
          aria-label="اختيار المشهد"
        >
          <option value="">-- اختر مشهد --</option>
          {scenes?.map((scene) => (
            <option key={scene.id} value={scene.id}>
              المشهد {scene.sceneNumber}: {scene.title}
            </option>
          ))}
        </select>
      </div>

      {selectedSceneId ? (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
                <p className="text-[var(--app-text-muted)]">
                  جاري تحميل اللقطات...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <p className="text-destructive">{(error).message}</p>
            </div>
          ) : shots && shots.length > 10 ? (
            <VirtualizedGrid
              items={shots}
              renderItem={(shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  onDelete={handleDelete}
                  deleteConfirmId={deleteConfirmId}
                  onCancelDelete={handleCancelDelete}
                />
              )}
              columnCount={3}
              itemHeight={320}
              itemWidth={350}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {shots?.map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  onDelete={handleDelete}
                  deleteConfirmId={deleteConfirmId}
                  onCancelDelete={handleCancelDelete}
                />
              ))}
            </div>
          )}

          {shots?.length === 0 && (
            <div className="text-center py-12">
              <Camera className="h-16 w-16 mx-auto text-[var(--app-text-muted)] mb-4" />
              <p className="text-[var(--app-text-muted)]">
                لا توجد لقطات لهذا المشهد حتى الآن
              </p>
            </div>
          )}

          {selectedScene && (
            <div className="mt-8">
              <ShotPlanningCard
                shotNumber={nextShotNumber}
                sceneNumber={selectedScene.sceneNumber}
                projectId={currentProjectId}
                sceneId={selectedSceneId}
              />
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <Camera className="h-16 w-16 mx-auto text-[var(--app-text-muted)] mb-4" />
          <p className="text-[var(--app-text-muted)]">اختر مشهد لعرض اللقطات</p>
        </div>
      )}
    </div>
  );
}

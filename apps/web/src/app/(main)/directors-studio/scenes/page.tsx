"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, AlertTriangle, Layers } from "lucide-react";
import { useState, useCallback, memo } from "react";

import SceneFormDialog from "@/app/(main)/directors-studio/components/SceneFormDialog";
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

import type { Scene } from "@/types/api";

/**
 * مكوّن بطاقة المشهد — مُعاد استخدامه في العرض العادي والافتراضي
 */
const SceneCard = memo(function SceneCard({
  scene,
  onEdit,
  onDelete,
  deleteConfirmId,
  onCancelDelete,
}: {
  scene: Scene;
  onEdit: (scene: Scene) => void;
  onDelete: (sceneId: string) => void;
  deleteConfirmId: string | null;
  onCancelDelete: () => void;
}) {
  const isConfirming = deleteConfirmId === scene.id;

  return (
    <Card className="h-full border-[var(--app-border)] bg-[var(--app-surface)]">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-[var(--app-text)]">
              المشهد {scene.sceneNumber}
            </CardTitle>
            <CardDescription>{scene.title}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(scene)}
              aria-label={`تعديل المشهد ${scene.sceneNumber}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {isConfirming ? (
              <div className="flex gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(scene.id)}
                  aria-label="تأكيد الحذف"
                >
                  تأكيد
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelDelete}
                  aria-label="إلغاء الحذف"
                >
                  إلغاء
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(scene.id)}
                aria-label={`حذف المشهد ${scene.sceneNumber}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold">الموقع:</span> {scene.location}
          </div>
          <div>
            <span className="font-semibold">الوقت:</span> {scene.timeOfDay}
          </div>
          <div>
            <span className="font-semibold">الشخصيات:</span>{" "}
            {scene.characters.join(", ")}
          </div>
          <div>
            <span className="font-semibold">عدد اللقطات:</span>{" "}
            {scene.shotCount}
          </div>
          <div>
            <span className="font-semibold">الحالة:</span>{" "}
            <span
              className={`px-2 py-1 rounded-full text-xs ${
                scene.status === "completed"
                  ? "bg-[var(--app-accent)]/10 text-[var(--app-accent)]"
                  : scene.status === "in-progress"
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-[var(--app-surface-alt,var(--app-surface))] text-[var(--app-text-muted)]"
              }`}
            >
              {scene.status === "planned"
                ? "مخطط"
                : scene.status === "in-progress"
                  ? "قيد التنفيذ"
                  : "مكتمل"}
            </span>
          </div>
          {scene.description && (
            <div className="pt-2">
              <p className="text-[var(--app-text-muted)]">
                {scene.description}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default function ScenesPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { projectId: currentProjectId } = useCurrentProject();

  const {
    data: scenes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["scenes", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      const res = await fetch(`/api/projects/${currentProjectId}/scenes`);
      if (!res.ok) throw new Error(`فشل تحميل المشاهد: ${res.status}`);
      const json: unknown = await res.json();
      const data = json as { data?: Scene[] };
      return data.data ?? [];
    },
    enabled: !!currentProjectId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (sceneId: string) => {
      const res = await fetch(`/api/scenes/${sceneId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`فشل حذف المشهد: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scenes"] });
      setDeleteConfirmId(null);
    },
  });

  const handleEdit = useCallback((scene: Scene) => {
    setSelectedScene(scene);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (sceneId: string) => {
      if (deleteConfirmId === sceneId) {
        await deleteMutation.mutateAsync(sceneId);
      } else {
        setDeleteConfirmId(sceneId);
      }
    },
    [deleteConfirmId, deleteMutation]
  );

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedScene(null);
  }, []);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-4 border-[var(--app-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--app-text-muted)]">جاري تحميل المشاهد...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-16 w-16 text-destructive" />
        <p className="text-destructive text-lg">حدث خطأ أثناء تحميل المشاهد</p>
        <p className="text-[var(--app-text-muted)] text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--app-text)]">المشاهد</h1>
          <p className="text-[var(--app-text-muted)] mt-2">
            إدارة مشاهد المشروع
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          aria-label="إنشاء مشهد جديد"
          className="bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent)]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          مشهد جديد
        </Button>
      </div>

      {scenes && scenes.length > 10 ? (
        <VirtualizedGrid
          items={scenes}
          renderItem={(scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleteConfirmId={deleteConfirmId}
              onCancelDelete={handleCancelDelete}
            />
          )}
          columnCount={3}
          itemHeight={350}
          itemWidth={350}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {scenes?.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleteConfirmId={deleteConfirmId}
              onCancelDelete={handleCancelDelete}
            />
          ))}
        </div>
      )}

      {scenes?.length === 0 && (
        <div className="text-center py-12">
          <Layers className="h-16 w-16 mx-auto text-[var(--app-text-muted)] mb-4" />
          <p className="text-[var(--app-text-muted)]">لا توجد مشاهد حتى الآن</p>
          <Button
            className="mt-4 bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent)]/90"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            إنشاء مشهد جديد
          </Button>
        </div>
      )}

      <SceneFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        {...(selectedScene && { scene: selectedScene })}
        projectId={currentProjectId}
      />
    </div>
  );
}

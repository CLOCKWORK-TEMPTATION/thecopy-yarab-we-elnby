"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, User, AlertTriangle, Users } from "lucide-react";
import { useState, useCallback, memo } from "react";

import CharacterFormDialog from "@/app/(main)/directors-studio/components/CharacterFormDialog";
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
import { useToast } from "@/hooks/use-toast";

import type { Character } from "@/types/api";

const CharacterCard = memo(function CharacterCard({
  character,
  onEdit,
  onDelete,
}: {
  character: Character;
  onEdit: (c: Character) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="h-full border-[var(--app-border)] bg-[var(--app-surface)]">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[var(--app-accent)]/10 flex items-center justify-center">
              <User className="h-6 w-6 text-[var(--app-accent)]" />
            </div>
            <div>
              <CardTitle className="text-[var(--app-text)]">
                {character.name}
              </CardTitle>
              <CardDescription>{character.appearances} ظهور</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(character)}
              aria-label={`تعديل ${character.name}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(character.id)}
              aria-label={`حذف ${character.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-semibold">حالة الاتساق:</span>{" "}
            <span
              className={`px-2 py-1 rounded-full text-xs ${character.consistencyStatus === "good" ? "bg-[var(--app-accent)]/10 text-[var(--app-accent)]" : character.consistencyStatus === "warning" ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}`}
            >
              {character.consistencyStatus === "good"
                ? "جيد"
                : character.consistencyStatus === "warning"
                  ? "تحذير"
                  : "ضعيف"}
            </span>
          </div>
          {character.lastSeen && (
            <div>
              <span className="font-semibold">آخر ظهور:</span>{" "}
              {character.lastSeen}
            </div>
          )}
          {character.notes && (
            <div className="pt-2">
              <span className="font-semibold">ملاحظات:</span>
              <p className="text-[var(--app-text-muted)] mt-1">
                {character.notes}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export default function CharactersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null
  );
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { projectId: currentProjectId } = useCurrentProject();
  const { toast } = useToast();

  const {
    data: characters,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["characters", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return [];
      const res = await fetch(`/api/projects/${currentProjectId}/characters`);
      if (!res.ok) throw new Error(`فشل تحميل الشخصيات: ${res.status}`);
      const json: unknown = await res.json();
      const data = json as { data?: Character[] };
      return data.data ?? [];
    },
    enabled: !!currentProjectId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (characterId: string) => {
      const res = await fetch(`/api/characters/${characterId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`فشل حذف الشخصية: ${res.status}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["characters"] });
      setDeleteConfirmId(null);
      toast({ title: "تم الحذف", description: "تم حذف الشخصية بنجاح" });
    },
    onError: (err: Error) => {
      toast({
        title: "حدث خطأ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleEdit = useCallback((character: Character) => {
    setSelectedCharacter(character);
    setIsDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    (characterId: string) => {
      if (deleteConfirmId === characterId) {
        deleteMutation.mutate(characterId);
      } else {
        setDeleteConfirmId(characterId);
      }
    },
    [deleteConfirmId, deleteMutation]
  );

  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedCharacter(null);
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
          <p className="text-[var(--app-text-muted)]">جاري تحميل الشخصيات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="h-12 w-12 text-destructive" />
        <p className="text-destructive">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[var(--app-text)]">
            الشخصيات
          </h1>
          <p className="text-[var(--app-text-muted)] mt-2">
            إدارة شخصيات المشروع
          </p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent)]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          شخصية جديدة
        </Button>
      </div>

      {characters && characters.length > 10 ? (
        <VirtualizedGrid
          items={characters}
          renderItem={(character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          columnCount={3}
          itemHeight={280}
          itemWidth={350}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {characters?.map((character) => (
            <CharacterCard
              key={character.id}
              character={character}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {characters?.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-16 w-16 mx-auto text-[var(--app-text-muted)] mb-4" />
          <p className="text-[var(--app-text-muted)]">
            لا توجد شخصيات حتى الآن
          </p>
          <Button
            className="mt-4 bg-[var(--app-accent)] text-white hover:bg-[var(--app-accent)]/90"
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            إنشاء شخصية جديدة
          </Button>
        </div>
      )}

      <CharacterFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        {...(selectedCharacter && { character: selectedCharacter })}
        projectId={currentProjectId}
      />
    </div>
  );
}

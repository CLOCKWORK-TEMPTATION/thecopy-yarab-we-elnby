"use client";

/**
 * الصفحة: directors-studio / ProjectManager
 * الهوية: إدارة مشاريع داخلية بطابع تنفيذي متسق مع shell الإخراجي
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات PageLayout المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { FolderOpen, Trash2, Edit2, Check } from "lucide-react";
import { useState, useCallback, useMemo, memo } from "react";

import { useCurrentProject } from "@/app/(main)/directors-studio/lib/ProjectContext";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  useProjects,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/useProject";

import type { Project } from "@/types/api";

const MESSAGES = {
  updateSuccess: {
    title: "تم التحديث",
    description: "تم تحديث عنوان المشروع بنجاح",
  },
  updateError: {
    title: "حدث خطأ",
    defaultDescription: "فشل تحديث المشروع",
  },
  deleteSuccess: {
    title: "تم الحذف",
    description: "تم حذف المشروع بنجاح",
  },
  deleteError: {
    title: "حدث خطأ",
    defaultDescription: "فشل حذف المشروع",
  },
} as const;

interface ProjectCardProps {
  project: Project;
  isCurrentProject: boolean;
  isEditing: boolean;
  editTitle: string;
  isPending: boolean;
  onEditStart: (id: string, title: string) => void;
  onEditSave: (id: string) => void;
  onEditTitleChange: (value: string) => void;
  onDeleteClick: (id: string) => void;
  onSelect: (project: Project) => void;
}

const ProjectCard = memo(function ProjectCard({
  project,
  isCurrentProject,
  isEditing,
  editTitle,
  isPending,
  onEditStart,
  onEditSave,
  onEditTitleChange,
  onDeleteClick,
  onSelect,
}: ProjectCardProps) {
  const formattedDate = useMemo(
    () => new Date(project.createdAt).toLocaleDateString("ar-SA"),
    [project.createdAt]
  );

  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-black/18 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4">
        {isEditing ? (
          <Input
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="flex-1"
            dir="rtl"
            data-testid="input-edit-project-title"
          />
        ) : (
          <div className="flex-1 text-right">
            <h3 className="font-semibold text-white">{project.title}</h3>
            <p className="text-sm text-white/52">{formattedDate}</p>
          </div>
        )}

        <div className="flex gap-2">
          {isEditing ? (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEditSave(project.id)}
              disabled={isPending}
              data-testid="button-save-edit"
            >
              <Check className="w-4 h-4" />
            </Button>
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEditStart(project.id, project.title)}
                data-testid={`button-edit-${project.id}`}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onDeleteClick(project.id)}
                data-testid={`button-delete-${project.id}`}
              >
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
              {!isCurrentProject ? (
                <Button
                  variant="outline"
                  onClick={() => onSelect(project)}
                  data-testid={`button-select-${project.id}`}
                >
                  اختيار
                </Button>
              ) : (
                <Button
                  variant="default"
                  disabled
                  data-testid="button-current-project"
                >
                  المشروع الحالي
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </CardSpotlight>
  );
});

export default function ProjectManager() {
  const { data: projects, isLoading } = useProjects();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const { toast } = useToast();
  const {
    project: currentProject,
    setProject,
    clearProject,
  } = useCurrentProject();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  const handleSelectProject = useCallback(
    (project: Project) => {
      setProject({
        ...project,
        scriptContent: project.scriptContent ?? null,
      });
    },
    [setProject]
  );

  const handleStartEdit = useCallback((id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  }, []);

  const handleEditTitleChange = useCallback((value: string) => {
    setEditTitle(value);
  }, []);

  const handleSaveEdit = useCallback(
    async (id: string) => {
      try {
        await updateProject.mutateAsync({ id, data: { title: editTitle } });
        setEditingId(null);
        toast(MESSAGES.updateSuccess);
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : MESSAGES.updateError.defaultDescription;
        toast({
          title: MESSAGES.updateError.title,
          description: message,
          variant: "destructive",
        });
      }
    },
    [editTitle, updateProject, toast]
  );

  const handleDeleteClick = useCallback((id: string) => {
    setProjectToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!projectToDelete) return;

    try {
      await deleteProject.mutateAsync(projectToDelete);

      if (currentProject?.id === projectToDelete) {
        clearProject();
      }

      toast(MESSAGES.deleteSuccess);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : MESSAGES.deleteError.defaultDescription;
      toast({
        title: MESSAGES.deleteError.title,
        description: message,
        variant: "destructive",
      });
    }
  }, [projectToDelete, deleteProject, currentProject, toast]);

  const projectsList = Array.isArray(projects) ? projects : [];

  if (isLoading) {
    return (
      <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-black/18 p-4 backdrop-blur-xl">
        <div className="h-10 w-48 animate-pulse rounded-xl bg-white/8" />
      </CardSpotlight>
    );
  }

  if (!projectsList.length) {
    return null;
  }

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" data-testid="button-manage-projects">
            <FolderOpen className="w-4 h-4 ml-2" />
            إدارة المشاريع ({projectsList.length})
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-w-2xl bg-[rgba(12,16,24,0.94)] border-white/10"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-right text-white">
              المشاريع المتاحة
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {projectsList.map((project: Project) => (
              <ProjectCard
                key={project.id}
                project={project}
                isCurrentProject={
                  currentProject !== null && currentProject.id === project.id
                }
                isEditing={editingId === project.id}
                editTitle={editTitle}
                isPending={updateProject.isPending}
                onEditStart={handleStartEdit}
                onEditSave={handleSaveEdit}
                onEditTitleChange={handleEditTitleChange}
                onDeleteClick={handleDeleteClick}
                onSelect={handleSelectProject}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف هذا المشروع؟ سيتم حذف جميع المشاهد والشخصيات
              واللقطات المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              حذف
            </AlertDialogAction>
            <AlertDialogCancel data-testid="button-cancel-delete">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

/**
 * الصفحة: directors-studio / SceneCard
 * الهوية: بطاقة مشهد داخلية بطابع إخراجي زجاجي موحد
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات PageLayout المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { useState, memo, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Clock,
  Users,
  MoreVertical,
  Camera,
  Trash2,
  Edit2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useDeleteScene } from "@/hooks/useProject";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

type SceneStatus = "planned" | "in-progress" | "completed";

interface SceneCardProps {
  id: string;
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  shotCount?: number;
  status?: SceneStatus;
  description?: string | null;
  onEdit?: () => void;
}

const STATUS_COLORS: Record<SceneStatus, string> = {
  planned: "bg-white/8 text-white/70",
  "in-progress": "bg-[var(--page-accent)]/15 text-white",
  completed: "bg-emerald-500/15 text-emerald-300",
} as const;

const STATUS_LABELS: Record<SceneStatus, string> = {
  planned: "مخطط",
  "in-progress": "قيد التنفيذ",
  completed: "مكتمل",
} as const;

const SceneCard = memo(function SceneCard({
  id,
  sceneNumber,
  title,
  location,
  timeOfDay,
  characters,
  shotCount = 0,
  status = "planned",
  onEdit,
}: SceneCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteScene = useDeleteScene();
  const { toast } = useToast();

  const handleDelete = useCallback(async () => {
    try {
      await deleteScene.mutateAsync(id);
      toast({
        title: "تم الحذف",
        description: "تم حذف المشهد بنجاح",
      });
      setDeleteDialogOpen(false);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "فشل حذف المشهد";
      toast({
        title: "حدث خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [id, deleteScene, toast]);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const statusColor = useMemo(() => STATUS_COLORS[status], [status]);
  const statusLabel = useMemo(() => STATUS_LABELS[status], [status]);

  return (
    <>
      <CardSpotlight
        className="overflow-hidden rounded-[26px] border border-white/8 bg-black/20 p-5 backdrop-blur-xl"
        data-testid={`card-scene-${sceneNumber}`}
      >
        <div className="space-y-4">
          <div className="flex flex-row items-center justify-between gap-2 space-y-0 pb-1">
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid="button-scene-menu"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem asChild>
                    <Link href="/shots">تخطيط اللقطات</Link>
                  </DropdownMenuItem>
                  {onEdit ? (
                    <DropdownMenuItem
                      onClick={onEdit}
                      data-testid="button-edit-scene"
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      تعديل المشهد
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDeleteClick}
                    data-testid="button-delete-scene"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    حذف المشهد
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Badge className={statusColor}>{statusLabel}</Badge>
            </div>

            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <Badge
                variant="outline"
                className="text-base px-3 border-white/10 bg-white/5 text-white/85"
              >
                المشهد {sceneNumber}
              </Badge>
            </div>
          </div>

          <div className="flex items-center justify-end gap-6 text-sm text-white/55 flex-wrap">
            <div className="flex items-center gap-2">
              <span>{location}</span>
              <MapPin className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2">
              <span>{timeOfDay}</span>
              <Clock className="w-4 h-4" />
            </div>

            <div className="flex items-center gap-2">
              <span>{characters.length} شخصيات</span>
              <Users className="w-4 h-4" />
            </div>

            {shotCount > 0 ? (
              <div className="flex items-center gap-2">
                <span>{shotCount} لقطات</span>
                <Camera className="w-4 h-4" />
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            {characters.map((character, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-xs bg-white/8 text-white/85"
              >
                {character}
              </Badge>
            ))}
          </div>
        </div>
      </CardSpotlight>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              تأكيد الحذف
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              هل أنت متأكد من حذف &quot;{title}&quot;؟ سيتم حذف جميع اللقطات
              المرتبطة به. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete-scene"
            >
              حذف
            </AlertDialogAction>
            <AlertDialogCancel data-testid="button-cancel-delete-scene">
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
});

export default SceneCard;

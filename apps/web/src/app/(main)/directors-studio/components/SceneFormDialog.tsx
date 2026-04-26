/**
 * @fileoverview مكوّن حوار نموذج المشهد
 *
 * السبب في وجود هذا المكوّن: توفير واجهة موحدة
 * لإنشاء وتعديل المشاهد مع التحقق من صحة البيانات.
 *
 * يدعم:
 * - إنشاء مشهد جديد
 * - تعديل مشهد موجود
 * - التحقق من صحة الحقول المطلوبة
 */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateScene, useUpdateScene } from "@/hooks/useProject";

import type { Scene } from "@/types/api";

/**
 * واجهة خصائص مكوّن حوار نموذج المشهد
 */
interface SceneFormDialogProps {
  /** حالة فتح/إغلاق الحوار */
  open: boolean;
  /** دالة تغيير حالة الحوار */
  onOpenChange: (open: boolean) => void;
  /** معرف المشروع */
  projectId: string;
  /** بيانات المشهد للتعديل (اختياري) */
  scene?: Scene;
  /** أقصى رقم مشهد حالي */
  maxSceneNumber?: number;
}

/**
 * واجهة بيانات النموذج
 */
interface SceneFormData {
  sceneNumber: number;
  title: string;
  location: string;
  timeOfDay: string;
  description: string;
  characters: string[];
  status: string;
}

/**
 * رسائل الإشعارات
 */
const MESSAGES = {
  validation: {
    title: "خطأ",
    description: "الرجاء ملء جميع الحقول المطلوبة",
  },
  createSuccess: {
    title: "تم الإنشاء",
    description: "تم إنشاء المشهد بنجاح",
  },
  updateSuccess: {
    title: "تم التحديث",
    description: "تم تحديث المشهد بنجاح",
  },
  error: {
    title: "حدث خطأ",
    createDescription: "فشل إنشاء المشهد",
    updateDescription: "فشل تحديث المشهد",
  },
} as const;

/**
 * القيم الافتراضية للنموذج
 */
const getDefaultFormData = (maxSceneNumber: number): SceneFormData => ({
  sceneNumber: maxSceneNumber + 1,
  title: "",
  location: "",
  timeOfDay: "نهار",
  description: "",
  characters: [],
  status: "planned",
});

/**
 * تحويل بيانات المشهد لبيانات النموذج
 */
const sceneToFormData = (scene: Scene): SceneFormData => ({
  sceneNumber: scene.sceneNumber,
  title: scene.title,
  location: scene.location,
  timeOfDay: scene.timeOfDay,
  description: scene.description ?? "",
  characters: scene.characters || [],
  status: scene.status,
});

/**
 * مكوّن حوار نموذج المشهد
 *
 * السبب في التصميم: توفير واجهة موحدة لإدارة المشاهد
 * مع دعم التحقق من الصحة وعرض رسائل الخطأ.
 *
 * @param props - خصائص المكوّن
 * @returns عنصر React يعرض حوار النموذج
 */
export default function SceneFormDialog({
  open,
  onOpenChange,
  projectId,
  scene,
  maxSceneNumber = 0,
}: SceneFormDialogProps) {
  const { toast } = useToast();
  const createScene = useCreateScene();
  const updateScene = useUpdateScene();

  const [formData, setFormData] = useState<SceneFormData>(() =>
    scene ? sceneToFormData(scene) : getDefaultFormData(maxSceneNumber)
  );

  /**
   * إعادة تعيين النموذج عند فتح/إغلاق الحوار أو تغيير المشهد
   */
  useEffect(() => {
    if (scene) {
      setFormData(sceneToFormData(scene));
    } else {
      setFormData(getDefaultFormData(maxSceneNumber));
    }
  }, [scene, maxSceneNumber, open]);

  /**
   * التحقق من صحة النموذج
   */
  const isValid = useMemo(
    () => formData.title.trim() !== "" && formData.location.trim() !== "",
    [formData.title, formData.location]
  );

  /**
   * حالة التحميل
   */
  const isPending = createScene.isPending || updateScene.isPending;

  /**
   * معالج تقديم النموذج
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!isValid) {
        toast({
          ...MESSAGES.validation,
          variant: "destructive",
        });
        return;
      }

      try {
        if (scene) {
          await updateScene.mutateAsync({
            id: scene.id,
            data: {
              ...formData,
            },
          });
          toast(MESSAGES.updateSuccess);
        } else {
          await createScene.mutateAsync({
            projectId,
            ...formData,
            shotCount: 0,
          });
          toast(MESSAGES.createSuccess);
        }

        onOpenChange(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : scene
              ? MESSAGES.error.updateDescription
              : MESSAGES.error.createDescription;
        toast({
          title: MESSAGES.error.title,
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
    [
      isValid,
      scene,
      formData,
      projectId,
      updateScene,
      createScene,
      onOpenChange,
      toast,
    ]
  );

  /**
   * معالج تغيير حقل الشخصيات
   */
  const handleCharacterInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const charactersArray = value
        .split(",")
        .map((c) => c.trim())
        .filter((c) => c);
      setFormData((prev) => ({ ...prev, characters: charactersArray }));
    },
    []
  );

  /**
   * معالج تغيير الحقول البسيطة
   */
  const handleFieldChange = useCallback(
    (field: keyof SceneFormData, value: string | number) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        data-testid="dialog-scene-form"
      >
        <DialogHeader>
          <DialogTitle className="text-right">
            {scene ? "تعديل المشهد" : "إضافة مشهد جديد"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sceneNumber" className="text-right block">
              رقم المشهد
            </Label>
            <Input
              id="sceneNumber"
              type="number"
              min="1"
              value={formData.sceneNumber}
              onChange={(e) =>
                handleFieldChange("sceneNumber", parseInt(e.target.value) || 1)
              }
              dir="ltr"
              data-testid="input-scene-number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-right block">
              عنوان المشهد *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFieldChange("title", e.target.value)}
              dir="rtl"
              placeholder="مثال: البطل يدخل المنزل"
              data-testid="input-scene-title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-right block">
              الموقع *
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleFieldChange("location", e.target.value)}
              dir="rtl"
              placeholder="مثال: منزل - غرفة المعيشة"
              data-testid="input-scene-location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeOfDay" className="text-right block">
              وقت اليوم
            </Label>
            <Select
              value={formData.timeOfDay}
              onValueChange={(value) => handleFieldChange("timeOfDay", value)}
            >
              <SelectTrigger id="timeOfDay" data-testid="select-scene-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="نهار">نهار</SelectItem>
                <SelectItem value="ليل">ليل</SelectItem>
                <SelectItem value="فجر">فجر</SelectItem>
                <SelectItem value="غروب">غروب</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="characters" className="text-right block">
              الشخصيات (مفصولة بفاصلة)
            </Label>
            <Input
              id="characters"
              value={
                Array.isArray(formData.characters)
                  ? formData.characters.join(", ")
                  : ""
              }
              onChange={handleCharacterInputChange}
              dir="rtl"
              placeholder="مثال: أحمد, فاطمة, محمد"
              data-testid="input-scene-characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-right block">
              الوصف
            </Label>
            <Textarea
              id="description"
              value={formData.description ?? ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              dir="rtl"
              placeholder="وصف تفصيلي للمشهد..."
              className="min-h-24"
              data-testid="textarea-scene-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status" className="text-right block">
              الحالة
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleFieldChange("status", value)}
            >
              <SelectTrigger id="status" data-testid="select-scene-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">مخطط</SelectItem>
                <SelectItem value="in-progress">قيد التنفيذ</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-submit-scene"
            >
              {isPending ? "جاري الحفظ..." : scene ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

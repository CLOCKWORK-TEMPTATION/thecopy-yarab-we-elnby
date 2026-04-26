/**
 * @fileoverview مكوّن حوار نموذج الشخصية
 *
 * السبب في وجود هذا المكوّن: توفير واجهة موحدة
 * لإنشاء وتعديل الشخصيات مع التحقق من صحة البيانات.
 *
 * يدعم:
 * - إنشاء شخصية جديدة
 * - تعديل شخصية موجودة
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
import { useCreateCharacter, useUpdateCharacter } from "@/hooks/useProject";

import type {
  Character,
  CreateCharacterRequest,
} from "@/types/api";

/**
 * واجهة خصائص مكوّن حوار نموذج الشخصية
 */
interface CharacterFormDialogProps {
  /** حالة فتح/إغلاق الحوار */
  open: boolean;
  /** دالة تغيير حالة الحوار */
  onOpenChange: (open: boolean) => void;
  /** معرف المشروع */
  projectId: string;
  /** بيانات الشخصية للتعديل (اختياري) */
  character?: Character;
}

/**
 * واجهة بيانات نموذج الشخصية
 */
interface CharacterFormState {
  name: string;
  appearances: number;
  consistencyStatus: string;
  lastSeen: string | null;
  notes: string | null;
}

/**
 * رسائل الإشعارات
 */
const MESSAGES = {
  validation: {
    title: "خطأ",
    description: "الرجاء إدخال اسم الشخصية",
  },
  createSuccess: {
    title: "تم الإنشاء",
    description: "تم إنشاء الشخصية بنجاح",
  },
  updateSuccess: {
    title: "تم التحديث",
    description: "تم تحديث الشخصية بنجاح",
  },
  error: {
    title: "حدث خطأ",
    createDescription: "فشل إنشاء الشخصية",
    updateDescription: "فشل تحديث الشخصية",
  },
} as const;

/**
 * تحويل بيانات الشخصية لبيانات النموذج
 *
 * السبب في فصل هذه الدالة: إعادة الاستخدام وتوحيد المنطق
 *
 * @param value - بيانات الشخصية (اختياري)
 * @returns بيانات النموذج
 */
const mapCharacterToFormData = (value?: Character): CharacterFormState => ({
  name: value?.name ?? "",
  appearances: value?.appearances ?? 0,
  consistencyStatus: value?.consistencyStatus ?? "good",
  lastSeen: value?.lastSeen ?? null,
  notes: value?.notes ?? null,
});

/**
 * مكوّن حوار نموذج الشخصية
 *
 * السبب في التصميم: توفير واجهة موحدة لإدارة الشخصيات
 * مع دعم التحقق من الصحة وعرض رسائل الخطأ.
 *
 * @param props - خصائص المكوّن
 * @returns عنصر React يعرض حوار النموذج
 */
export default function CharacterFormDialog({
  open,
  onOpenChange,
  projectId,
  character,
}: CharacterFormDialogProps) {
  const { toast } = useToast();
  const createCharacter = useCreateCharacter();
  const updateCharacter = useUpdateCharacter();

  const [formData, setFormData] = useState<CharacterFormState>(() =>
    mapCharacterToFormData(character)
  );

  /**
   * إعادة تعيين النموذج عند تغيير الشخصية أو فتح الحوار
   */
  useEffect(() => {
    setFormData(mapCharacterToFormData(character));
  }, [character, open]);

  /**
   * التحقق من صحة النموذج
   */
  const isValid = useMemo(() => formData.name.trim() !== "", [formData.name]);

  /**
   * حالة التحميل
   */
  const isPending = createCharacter.isPending || updateCharacter.isPending;

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

      const isEditing = Boolean(character);
      const payload: Omit<Character, "id" | "projectId"> = {
        name: formData.name,
        appearances: formData.appearances,
        consistencyStatus: formData.consistencyStatus,
        ...(formData.lastSeen && { lastSeen: formData.lastSeen }),
        ...(formData.notes && { notes: formData.notes }),
      };

      try {
        if (isEditing && character) {
          await updateCharacter.mutateAsync({
            id: character.id,
            data: payload,
          });
          toast(MESSAGES.updateSuccess);
        } else {
          await createCharacter.mutateAsync({
            ...(payload as CreateCharacterRequest),
            projectId,
          });
          toast(MESSAGES.createSuccess);
        }

        onOpenChange(false);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : isEditing
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
      character,
      formData,
      projectId,
      updateCharacter,
      createCharacter,
      onOpenChange,
      toast,
    ]
  );

  /**
   * معالج تغيير الحقول
   */
  const handleFieldChange = useCallback(
    (field: keyof CharacterFormState, value: string | number | null) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="dialog-character-form">
        <DialogHeader>
          <DialogTitle className="text-right">
            {character ? "تعديل الشخصية" : "إضافة شخصية جديدة"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-right block">
              اسم الشخصية *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              dir="rtl"
              placeholder="مثال: أحمد محمود"
              data-testid="input-character-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appearances" className="text-right block">
              عدد الظهور
            </Label>
            <Input
              id="appearances"
              type="number"
              min="0"
              value={formData.appearances}
              onChange={(e) =>
                handleFieldChange("appearances", parseInt(e.target.value) || 0)
              }
              dir="ltr"
              data-testid="input-character-appearances"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="consistencyStatus" className="text-right block">
              حالة الثبات
            </Label>
            <Select
              value={formData.consistencyStatus}
              onValueChange={(value) =>
                handleFieldChange("consistencyStatus", value)
              }
            >
              <SelectTrigger
                id="consistencyStatus"
                data-testid="select-character-consistency"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">جيد</SelectItem>
                <SelectItem value="warning">تحذير</SelectItem>
                <SelectItem value="issue">مشكلة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastSeen" className="text-right block">
              آخر ظهور
            </Label>
            <Input
              id="lastSeen"
              value={formData.lastSeen ?? ""}
              onChange={(e) =>
                handleFieldChange("lastSeen", e.target.value || null)
              }
              dir="rtl"
              placeholder="مثال: المشهد 5"
              data-testid="input-character-lastseen"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-right block">
              ملاحظات
            </Label>
            <Textarea
              id="notes"
              value={formData.notes ?? ""}
              onChange={(e) =>
                handleFieldChange("notes", e.target.value || null)
              }
              dir="rtl"
              placeholder="ملاحظات حول الشخصية..."
              className="min-h-24"
              data-testid="textarea-character-notes"
            />
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
              data-testid="button-submit-character"
            >
              {isPending ? "جاري الحفظ..." : character ? "تحديث" : "إضافة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

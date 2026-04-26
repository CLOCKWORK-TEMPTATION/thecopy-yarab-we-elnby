import { motion } from "framer-motion";
import { X, Calendar, User, Tag, Link as LinkIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

interface InspectorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  sceneData?: {
    id: string;
    title: string;
    description?: string;
    beats?: string[];
    duration?: string;
    characters?: string[];
    linksIn?: string[] | number | undefined;
    linksOut?: string[] | number | undefined;
    status?: "draft" | "final" | "alt" | "flagged" | undefined;
    branch?: "A" | "B" | "C" | undefined;
    act?: number | undefined;
    beat?: string | undefined;
  };
  onUpdate?: (data: any) => void;
}

export function InspectorPanel({
  isOpen,
  onClose,
  sceneData,
  onUpdate,
}: InspectorPanelProps) {
  if (!isOpen || !sceneData) return null;

  return (
    <motion.div
      className="fixed top-0 left-0 h-screen w-[400px] bg-[var(--color-panel)] border-l border-[var(--color-surface)] shadow-2xl z-40 overflow-y-auto"
      initial={{ x: -400 }}
      animate={{ x: 0 }}
      exit={{ x: -400 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      <div className="sticky top-0 bg-[var(--color-panel)] border-b border-[var(--color-surface)] p-4 flex items-center justify-between z-10">
        <h2 className="text-[var(--color-text)]" dir="rtl">
          معاين المشهد
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <Label
            htmlFor="scene-title"
            className="text-[var(--color-text)]"
            dir="rtl"
          >
            عنوان المشهد
          </Label>
          <Input
            id="scene-title"
            defaultValue={sceneData.title}
            className="bg-[var(--color-surface)] border-[var(--color-surface)] text-[var(--color-text)]"
            dir="rtl"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label
            htmlFor="scene-description"
            className="text-[var(--color-text)]"
            dir="rtl"
          >
            الوصف
          </Label>
          <Textarea
            id="scene-description"
            defaultValue={sceneData.description}
            rows={4}
            className="bg-[var(--color-surface)] border-[var(--color-surface)] text-[var(--color-text)] resize-none"
            dir="rtl"
          />
        </div>

        <Separator className="bg-[var(--color-surface)]" />

        {/* Duration */}
        <div className="space-y-2">
          <Label
            htmlFor="scene-duration"
            className="text-[var(--color-text)] flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            المدة الزمنية
          </Label>
          <Input
            id="scene-duration"
            defaultValue={sceneData.duration}
            placeholder="مثال: 5 دقائق"
            className="bg-[var(--color-surface)] border-[var(--color-surface)] text-[var(--color-text)]"
            dir="rtl"
          />
        </div>

        <Separator className="bg-[var(--color-surface)]" />

        {/* Beats */}
        <div className="space-y-2">
          <Label className="text-[var(--color-text)] flex items-center gap-2">
            <Tag className="w-4 h-4" />
            إيقاعات القصة
          </Label>
          <div className="flex flex-wrap gap-2" dir="rtl">
            {sceneData.beats?.map((beat, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-[var(--color-surface)] text-[var(--color-text)]"
              >
                {beat}
              </Badge>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-dashed border-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            >
              + إضافة
            </Button>
          </div>
        </div>

        <Separator className="bg-[var(--color-surface)]" />

        {/* Characters */}
        <div className="space-y-2">
          <Label className="text-[var(--color-text)] flex items-center gap-2">
            <User className="w-4 h-4" />
            الشخصيات
          </Label>
          <div className="flex flex-wrap gap-2" dir="rtl">
            {sceneData.characters?.map((character, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="bg-[var(--color-surface)] text-[var(--color-text)]"
              >
                {character}
              </Badge>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-7 border-dashed border-[var(--color-surface)] text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
            >
              + إضافة
            </Button>
          </div>
        </div>

        <Separator className="bg-[var(--color-surface)]" />

        {/* Links */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[var(--color-text)] flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              الروابط الواردة
            </Label>
            <div className="text-[var(--color-muted)]" dir="rtl">
              {typeof sceneData.linksIn === "number"
                ? sceneData.linksIn
                : sceneData.linksIn?.length ?? 0}{" "}
              مشهد
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[var(--color-text)] flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              الروابط الصادرة
            </Label>
            <div className="text-[var(--color-muted)]" dir="rtl">
              {typeof sceneData.linksOut === "number"
                ? sceneData.linksOut
                : sceneData.linksOut?.length ?? 0}{" "}
              مشهد
            </div>
          </div>
        </div>

        <Separator className="bg-[var(--color-surface)]" />

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="default"
            className="flex-1 bg-[var(--color-accent)] hover:bg-[var(--color-accent)]/90 text-[var(--color-bg)]"
            onClick={() => onUpdate?.(sceneData)}
          >
            حفظ التغييرات
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface)]"
            onClick={onClose}
          >
            إلغاء
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

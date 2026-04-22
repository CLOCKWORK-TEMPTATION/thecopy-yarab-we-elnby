/**
 * @fileoverview مكوّن بطاقة تخطيط اللقطة
 *
 * السبب في وجود هذا المكوّن: توفير واجهة تفاعلية
 * لتخطيط اللقطات السينمائية مع دعم اقتراحات الذكاء الاصطناعي.
 *
 * يدعم:
 * - اختيار نوع اللقطة وزاوية الكاميرا والحركة والإضاءة
 * - الحصول على اقتراحات من الذكاء الاصطناعي
 * - حفظ وحذف وإعادة تعيين اللقطة
 */
"use client";

import { useState, useEffect, memo, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Video,
  Move,
  Maximize2,
  Sun,
  Loader2,
  Sparkles,
  Trash2,
  Camera,
  RotateCcw,
  Save,
  Eye,
  Film,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetShotSuggestion } from "@/hooks/useAI";
import { useToast } from "@/hooks/use-toast";
import type { Shot } from "@shared/schema";

/**
 * واجهة خصائص مكوّن بطاقة تخطيط اللقطة
 */
interface ShotPlanningCardProps {
  /** بيانات اللقطة الحالية (اختياري) */
  shot?: Partial<Shot>;
  /** رقم اللقطة */
  shotNumber: number;
  /** رقم المشهد */
  sceneNumber: number;
  /** وصف المشهد (اختياري) */
  sceneDescription?: string;
  /** معرف المشروع (اختياري) */
  projectId?: string;
  /** معرف المشهد (اختياري) */
  sceneId?: string;
  /** دالة استدعاء للحفظ */
  onSave?: (shotData: Partial<Shot>) => void;
  /** دالة استدعاء للحذف */
  onDelete?: () => void;
}

/**
 * واجهة اقتراح الذكاء الاصطناعي
 */
interface AISuggestion {
  suggestion: string;
  reasoning: string;
}

/**
 * خريطة أيقونات وأوصاف أنواع اللقطات
 * السبب: توفير معلومات بصرية لمساعدة المخرج في الاختيار
 */
const SHOT_TYPE_ICONS: Record<string, { icon: string; description: string }> = {
  "extreme-wide": { icon: "🏔️", description: "تظهر البيئة الكاملة" },
  wide: { icon: "🌄", description: "تظهر الموقع والشخصيات" },
  medium: { icon: "👤", description: "من الخصر للأعلى" },
  "close-up": { icon: "👁️", description: "الوجه والتعبيرات" },
  "extreme-close-up": { icon: "🔍", description: "تفاصيل دقيقة" },
} as const;

/**
 * القيم الافتراضية للقطة
 */
const DEFAULT_VALUES = {
  shotType: "medium",
  cameraAngle: "eye-level",
  cameraMovement: "static",
  lighting: "natural",
} as const;

/**
 * مكوّن بطاقة تخطيط اللقطة
 *
 * السبب في التصميم: توفير واجهة شاملة لتخطيط اللقطات
 * مع دعم الذكاء الاصطناعي لتحسين جودة الإنتاج.
 *
 * السبب في استخدام memo: بطاقات اللقطات تُعرض في قوائم
 * ونريد تجنب إعادة العرض غير الضرورية.
 */
const ShotPlanningCard = memo(function ShotPlanningCard({
  shot,
  shotNumber,
  sceneNumber,
  sceneDescription = "",
  onSave,
  onDelete,
}: ShotPlanningCardProps) {
  const [shotType, setShotType] = useState(
    shot?.shotType || DEFAULT_VALUES.shotType
  );
  const [cameraAngle, setCameraAngle] = useState(
    shot?.cameraAngle || DEFAULT_VALUES.cameraAngle
  );
  const [cameraMovement, setCameraMovement] = useState(
    shot?.cameraMovement || DEFAULT_VALUES.cameraMovement
  );
  const [lighting, setLighting] = useState(
    shot?.lighting || DEFAULT_VALUES.lighting
  );
  const [aiSuggestion, setAiSuggestion] = useState<AISuggestion | null>(null);

  const getSuggestionMutation = useGetShotSuggestion();
  const { toast } = useToast();

  /**
   * تحميل اقتراح AI المحفوظ عند تحميل اللقطة
   */
  useEffect(() => {
    if (shot) {
      setShotType(shot.shotType || DEFAULT_VALUES.shotType);
      setCameraAngle(shot.cameraAngle || DEFAULT_VALUES.cameraAngle);
      setCameraMovement(shot.cameraMovement || DEFAULT_VALUES.cameraMovement);
      setLighting(shot.lighting || DEFAULT_VALUES.lighting);
      if (shot.aiSuggestion) {
        try {
          setAiSuggestion(JSON.parse(shot.aiSuggestion));
        } catch {
          setAiSuggestion(null);
        }
      }
    }
  }, [shot]);

  /**
   * معالج الحصول على اقتراح من AI
   *
   * السبب في useCallback: تجنب إنشاء دالة جديدة في كل render
   */
  const handleGetSuggestion = useCallback(async () => {
    if (!sceneDescription.trim()) {
      toast({
        title: "خطأ",
        description: "يجب توفير وصف المشهد أولاً",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await getSuggestionMutation.mutateAsync({
        sceneDescription,
        shotType,
      });

      if (typeof result === "string" && result.trim()) {
        setAiSuggestion({
          suggestion: result,
          reasoning: "",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "فشل الحصول على الاقتراح";
      toast({
        title: "حدث خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [sceneDescription, shotType, getSuggestionMutation, toast]);

  /**
   * معالج إعادة تعيين اللقطة للقيم الافتراضية
   */
  const handleReset = useCallback(() => {
    setShotType(DEFAULT_VALUES.shotType);
    setCameraAngle(DEFAULT_VALUES.cameraAngle);
    setCameraMovement(DEFAULT_VALUES.cameraMovement);
    setLighting(DEFAULT_VALUES.lighting);
    setAiSuggestion(null);
  }, []);

  /**
   * معالج حفظ اللقطة
   */
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave({
        shotType,
        cameraAngle,
        cameraMovement,
        lighting,
        aiSuggestion: aiSuggestion ? JSON.stringify(aiSuggestion) : null,
      });
    }
  }, [onSave, shotType, cameraAngle, cameraMovement, lighting, aiSuggestion]);

  /**
   * الحصول على معلومات نوع اللقطة
   */
  const shotTypeInfo = useMemo(
    () => SHOT_TYPE_ICONS[shotType] || { icon: "📷", description: "" },
    [shotType]
  );

  return (
    <Card
      data-testid={`card-shot-${shotNumber}`}
      className="card-interactive group overflow-hidden border-[var(--app-border)] bg-[var(--app-surface)]"
    >
      {/* رأس البطاقة مع تدرج */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--app-accent)]/10 to-[var(--app-accent)]/5" />
        <CardHeader className="relative">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className="bg-background/50 backdrop-blur-sm"
            >
              <Film className="h-3 w-3 ml-1" />
              المشهد {sceneNumber}
            </Badge>
            <div className="flex items-center gap-2">
              <div className="text-2xl">{shotTypeInfo.icon}</div>
              <div className="text-left">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-4 w-4 text-[var(--app-accent)]" />
                  اللقطة {shotNumber}
                </CardTitle>
                <p className="text-xs text-[var(--app-text-muted)]">
                  {shotTypeInfo.description}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
      </div>

      <CardContent className="space-y-6 pt-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* نوع اللقطة */}
          <div className="space-y-2 text-right">
            <label className="text-sm font-medium flex items-center justify-end gap-2">
              <Video className="w-4 h-4" />
              نوع اللقطة
            </label>
            <Select value={shotType} onValueChange={setShotType}>
              <SelectTrigger data-testid="select-shot-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="extreme-wide">لقطة عريضة جداً</SelectItem>
                <SelectItem value="wide">لقطة عريضة</SelectItem>
                <SelectItem value="medium">لقطة متوسطة</SelectItem>
                <SelectItem value="close-up">لقطة قريبة</SelectItem>
                <SelectItem value="extreme-close-up">
                  لقطة قريبة جداً
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* زاوية الكاميرا */}
          <div className="space-y-2 text-right">
            <label className="text-sm font-medium flex items-center justify-end gap-2">
              <Maximize2 className="w-4 h-4" />
              زاوية الكاميرا
            </label>
            <Select value={cameraAngle} onValueChange={setCameraAngle}>
              <SelectTrigger data-testid="select-camera-angle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">عالية</SelectItem>
                <SelectItem value="eye-level">مستوى العين</SelectItem>
                <SelectItem value="low">منخفضة</SelectItem>
                <SelectItem value="birds-eye">عين الطائر</SelectItem>
                <SelectItem value="dutch">مائلة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* حركة الكاميرا */}
          <div className="space-y-2 text-right">
            <label className="text-sm font-medium flex items-center justify-end gap-2">
              <Move className="w-4 h-4" />
              حركة الكاميرا
            </label>
            <Select value={cameraMovement} onValueChange={setCameraMovement}>
              <SelectTrigger data-testid="select-camera-movement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="static">ثابتة</SelectItem>
                <SelectItem value="pan">حركة أفقية</SelectItem>
                <SelectItem value="tilt">حركة عمودية</SelectItem>
                <SelectItem value="dolly">تتبع</SelectItem>
                <SelectItem value="crane">كرين</SelectItem>
                <SelectItem value="handheld">محمولة</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* الإضاءة */}
          <div className="space-y-2 text-right">
            <label className="text-sm font-medium flex items-center justify-end gap-2">
              <Sun className="w-4 h-4" />
              الإضاءة
            </label>
            <Select value={lighting} onValueChange={setLighting}>
              <SelectTrigger data-testid="select-lighting">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="natural">طبيعية</SelectItem>
                <SelectItem value="three-point">ثلاثية النقاط</SelectItem>
                <SelectItem value="low-key">إضاءة منخفضة</SelectItem>
                <SelectItem value="high-key">إضاءة عالية</SelectItem>
                <SelectItem value="dramatic">درامية</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* زر الحصول على اقتراح AI */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGetSuggestion}
          disabled={getSuggestionMutation.isPending}
          data-testid="button-get-ai-suggestion"
        >
          {getSuggestionMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              جاري الحصول على الاقتراح...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 ml-2" />
              احصل على اقتراح AI
            </>
          )}
        </Button>

        {/* عرض اقتراح AI */}
        {aiSuggestion && (
          <div className="relative p-4 rounded-lg bg-gradient-to-br from-[var(--app-accent)]/5 to-[var(--app-accent)]/5 border border-[var(--app-accent)]/20 overflow-hidden">
            <div className="absolute top-0 left-0 w-20 h-20 bg-[var(--app-accent)]/10 rounded-full blur-2xl" />

            <div className="relative flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[var(--app-accent)]/10">
                <Sparkles className="w-5 h-5 text-[var(--app-accent)]" />
              </div>
              <div className="flex-1 text-right space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    <Eye className="h-3 w-3 ml-1" />
                    اقتراح ذكي
                  </Badge>
                  <p className="text-sm font-medium text-[var(--app-accent)]">
                    اقتراح AI
                  </p>
                </div>
                <p className="text-sm text-[var(--app-text-muted)] leading-relaxed">
                  {aiSuggestion.suggestion}
                </p>
                {aiSuggestion.reasoning && (
                  <div className="text-xs text-[var(--app-text-muted)] mt-2 pt-2 border-t border-[var(--app-border)]/50">
                    <span className="font-medium text-foreground">السبب:</span>{" "}
                    {aiSuggestion.reasoning}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="flex gap-2 justify-end flex-wrap pt-4 border-t">
          {onDelete && shot && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              data-testid="button-delete-shot"
            >
              <Trash2 className="w-4 h-4 ml-2" />
              حذف
            </Button>
          )}
          <div className="flex gap-2 mr-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              data-testid="button-reset-shot"
            >
              <RotateCcw className="w-4 h-4 ml-1" />
              إعادة تعيين
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              data-testid="button-save-shot"
              className="bg-[var(--app-accent)] hover:bg-[var(--app-accent)]/90 text-white"
            >
              <Save className="w-4 h-4 ml-2" />
              حفظ اللقطة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default ShotPlanningCard;

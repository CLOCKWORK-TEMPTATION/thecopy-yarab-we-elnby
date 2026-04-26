"use client";

/**
 * الصفحة: art-director / Inspiration
 * الهوية: مساحة إلهام بصري داخلية بنبرة سينمائية درامية متسقة مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { Palette, Sparkles, Image, Wand2 } from "lucide-react";
import { useState, useCallback, useMemo } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { useArtDirectorPersistence } from "../hooks/useArtDirectorPersistence";
import { fetchArtDirectorJson } from "../lib/api-client";

import type { ColorPaletteInspiration, MoodBoard, ApiResponse } from "../types";



interface AnalysisApiResponse extends ApiResponse<MoodBoard> {
  data?: MoodBoard;
}

interface PaletteApiResponse extends ApiResponse<{
  palettes: ColorPaletteInspiration[];
}> {
  data?: { palettes: ColorPaletteInspiration[] };
}

interface ColorSwatchProps {
  color: string;
}

function ColorSwatch({ color }: ColorSwatchProps) {
  return (
    <div
      className="art-color-swatch"
      style={{ background: color }}
      title={color}
      role="presentation"
    />
  );
}

interface ColorRowProps {
  colors: string[];
}

function ColorRow({ colors }: ColorRowProps) {
  return (
    <div className="art-color-row">
      {colors.map((color, index) => (
        <ColorSwatch key={index} color={color} />
      ))}
    </div>
  );
}

interface PaletteCardProps {
  palette: ColorPaletteInspiration;
}

function PaletteCard({ palette }: PaletteCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <h4 style={{ marginBottom: "4px" }}>{palette.nameAr}</h4>
      <p
        style={{
          color: "var(--art-text-muted)",
          fontSize: "12px",
          marginBottom: "12px",
        }}
      >
        {palette.name}
      </p>
      <ColorRow colors={palette.colors} />
    </CardSpotlight>
  );
}

interface AnalysisResultProps {
  result: MoodBoard;
}

function AnalysisResult({ result }: AnalysisResultProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
          }}
        >
          <Image size={20} aria-hidden="true" /> نتائج التحليل
        </h3>

        <div style={{ marginBottom: "16px" }}>
          <span style={{ color: "var(--art-text-muted)" }}>الموضوع: </span>
          <span style={{ fontWeight: 600 }}>{result.themeAr}</span>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <span
            style={{
              color: "var(--art-text-muted)",
              display: "block",
              marginBottom: "8px",
            }}
          >
            الكلمات المفتاحية:
          </span>
          <div>
            {result.keywords.map((keyword, index) => (
              <span key={index} className="art-keyword-tag">
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {result.suggestedPalette ? (
          <div>
            <span
              style={{
                color: "var(--art-text-muted)",
                display: "block",
                marginBottom: "8px",
              }}
            >
              الباليت المقترح: {result.suggestedPalette.nameAr}
            </span>
            <ColorRow colors={result.suggestedPalette.colors} />
          </div>
        ) : null}
      </div>
    </CardSpotlight>
  );
}

interface PalettesGridProps {
  palettes: ColorPaletteInspiration[];
}

function PalettesGrid({ palettes }: PalettesGridProps) {
  if (palettes.length === 0) return null;

  return (
    <div
      className="art-grid-3"
      style={{ animation: "fadeIn 0.3s ease-in-out" }}
    >
      {palettes.map((palette, index) => (
        <PaletteCard key={index} palette={palette} />
      ))}
    </div>
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function isPalette(value: unknown): value is ColorPaletteInspiration {
  return (
    isRecord(value) &&
    typeof value["name"] === "string" &&
    typeof value["nameAr"] === "string" &&
    isStringArray(value["colors"])
  );
}

function isMoodBoard(value: unknown): value is MoodBoard {
  return (
    isRecord(value) &&
    typeof value["theme"] === "string" &&
    typeof value["themeAr"] === "string" &&
    isStringArray(value["keywords"]) &&
    (value["suggestedPalette"] === undefined ||
      isPalette(value["suggestedPalette"]))
  );
}

export default function Inspiration() {
  const { state, updateInspirationState } = useArtDirectorPersistence();
  const { sceneDescription, mood, era } = state.inspiration;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const result = useMemo(
    () =>
      isMoodBoard(state.inspiration.result) ? state.inspiration.result : null,
    [state.inspiration.result]
  );
  const palettes = useMemo<ColorPaletteInspiration[]>(
    () => state.inspiration.palettes.filter(isPalette),
    [state.inspiration.palettes]
  );

  const handleAnalyze = useCallback(async () => {
    if (!sceneDescription.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchArtDirectorJson<AnalysisApiResponse>(
        "/inspiration/analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sceneDescription,
            mood: mood || undefined,
            era: era || undefined,
          }),
        }
      );

      if (data.success && data.data) {
        updateInspirationState({ result: data.data });
      } else {
        setError(data.error ?? "فشل في تحليل المشهد");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [era, mood, sceneDescription, updateInspirationState]);

  const handleGeneratePalette = useCallback(async () => {
    if (!mood) return;

    setLoading(true);
    setError(null);

    try {
      const data = await fetchArtDirectorJson<PaletteApiResponse>(
        "/inspiration/palette",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood, count: 3 }),
        }
      );

      if (data.success && data.data?.palettes) {
        updateInspirationState({ palettes: data.data.palettes });
      } else {
        setError(data.error ?? "فشل في توليد الباليتات");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [mood, updateInspirationState]);

  return (
    <div className="art-director-page">
      <header className="art-page-header">
        <Palette size={32} className="header-icon" aria-hidden="true" />
        <div>
          <h1>الإلهام البصري</h1>
          <p>إنشاء لوحات مزاجية وباليتات ألوان للمشاهد</p>
        </div>
      </header>

      <div className="art-grid-2" style={{ gap: "24px" }}>
        <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
          <section>
            <h2
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <Wand2 size={20} aria-hidden="true" /> تحليل المشهد
            </h2>

            <div className="art-form-group">
              <label htmlFor="scene-description">وصف المشهد</label>
              <textarea
                id="scene-description"
                className="art-input"
                placeholder="صف المشهد بالتفصيل... مثال: مشهد رومانسي في مقهى قديم بباريس في الثلاثينيات"
                value={sceneDescription}
                onChange={(e) =>
                  updateInspirationState({
                    sceneDescription: e.target.value,
                  })
                }
                rows={4}
                style={{ resize: "none" }}
              />
            </div>

            <div className="art-form-grid">
              <div className="art-form-group">
                <label htmlFor="mood-select">المزاج العام</label>
                <select
                  id="mood-select"
                  className="art-input"
                  value={mood}
                  onChange={(e) =>
                    updateInspirationState({ mood: e.target.value })
                  }
                >
                  <option value="">اختر المزاج</option>
                  <option value="romantic">رومانسي</option>
                  <option value="dramatic">درامي</option>
                  <option value="mysterious">غامض</option>
                  <option value="cheerful">مرح</option>
                  <option value="melancholic">حزين</option>
                  <option value="tense">متوتر</option>
                </select>
              </div>

              <div className="art-form-group">
                <label htmlFor="era-select">الحقبة الزمنية</label>
                <select
                  id="era-select"
                  className="art-input"
                  value={era}
                  onChange={(e) =>
                    updateInspirationState({ era: e.target.value })
                  }
                >
                  <option value="">اختر الحقبة</option>
                  <option value="ancient">قديمة</option>
                  <option value="medieval">عصور وسطى</option>
                  <option value="victorian">فيكتورية</option>
                  <option value="1920s">العشرينيات</option>
                  <option value="1950s">الخمسينيات</option>
                  <option value="1980s">الثمانينيات</option>
                  <option value="modern">حديثة</option>
                  <option value="futuristic">مستقبلية</option>
                </select>
              </div>
            </div>

            {error ? (
              <div
                className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100"
                style={{ marginTop: "12px" }}
                role="alert"
              >
                {error}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
              <button
                className="art-btn"
                onClick={handleAnalyze}
                disabled={loading || !sceneDescription.trim()}
                type="button"
              >
                <Sparkles size={18} aria-hidden="true" />
                {loading ? "جاري التحليل..." : "تحليل المشهد"}
              </button>
              <button
                className="art-btn art-btn-secondary"
                onClick={handleGeneratePalette}
                disabled={loading || !mood}
                type="button"
              >
                <Palette size={18} aria-hidden="true" />
                اقتراح ألوان
              </button>
            </div>
          </section>
        </CardSpotlight>

        <section className="space-y-6">
          {result ? <AnalysisResult result={result} /> : null}
          <PalettesGrid palettes={palettes} />
        </section>
      </div>
    </div>
  );
}

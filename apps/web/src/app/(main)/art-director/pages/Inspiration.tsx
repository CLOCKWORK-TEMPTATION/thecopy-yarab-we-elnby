import { Palette, Sparkles, Image as ImageIcon, Wand2 } from "lucide-react";
import { useState } from "react";

import "./Inspiration.css";
import { artDirectorApiPath } from "../lib/api-client";

interface ColorPalette {
  name: string;
  nameAr: string;
  colors: string[];
}

interface MoodBoard {
  theme: string;
  themeAr: string;
  keywords: string[];
  suggestedPalette: ColorPalette;
}

interface InspirationFormProps {
  sceneDescription: string;
  mood: string;
  era: string;
  loading: boolean;
  onSceneDescriptionChange: (v: string) => void;
  onMoodChange: (v: string) => void;
  onEraChange: (v: string) => void;
  onAnalyze: () => void;
  onGeneratePalette: () => void;
}

function InspirationForm({
  sceneDescription,
  mood,
  era,
  loading,
  onSceneDescriptionChange,
  onMoodChange,
  onEraChange,
  onAnalyze,
  onGeneratePalette,
}: InspirationFormProps) {
  return (
    <section className="input-section card">
      <h2>
        <Wand2 size={20} /> تحليل المشهد
      </h2>

      <div className="form-group">
        <label htmlFor="field-inspiration-1">وصف المشهد</label>
        <textarea
          id="field-inspiration-1"
          className="input"
          placeholder="صف المشهد بالتفصيل... مثال: مشهد رومانسي في مقهى قديم بباريس في الثلاثينيات"
          value={sceneDescription}
          onChange={(e) => onSceneDescriptionChange(e.target.value)}
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="field-inspiration-2">المزاج العام</label>
          <select
            id="field-inspiration-2"
            className="input"
            value={mood}
            onChange={(e) => onMoodChange(e.target.value)}
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

        <div className="form-group">
          <label htmlFor="field-inspiration-3">الحقبة الزمنية</label>
          <select
            id="field-inspiration-3"
            className="input"
            value={era}
            onChange={(e) => onEraChange(e.target.value)}
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

      <div className="button-row">
        <button
          className="btn"
          onClick={onAnalyze}
          disabled={loading || !sceneDescription}
        >
          <Sparkles size={18} />
          {loading ? "جاري التحليل..." : "تحليل المشهد"}
        </button>
        <button
          className="btn btn-secondary"
          onClick={onGeneratePalette}
          disabled={loading || !mood}
        >
          <Palette size={18} />
          اقتراح ألوان
        </button>
      </div>
    </section>
  );
}

interface InspirationResultsProps {
  result: MoodBoard | null;
  palettes: ColorPalette[];
}

function InspirationResults({ result, palettes }: InspirationResultsProps) {
  return (
    <section className="results-section">
      {result && (
        <div className="result-card card fade-in">
          <h3>
            <ImageIcon size={20} aria-hidden="true" /> نتائج التحليل
          </h3>

          <div className="result-theme">
            <span className="theme-label">الموضوع:</span>
            <span className="theme-value">{result.themeAr}</span>
          </div>

          <div className="keywords-section">
            <span className="keywords-label">الكلمات المفتاحية:</span>
            <div className="keywords-list">
              {result.keywords.map((keyword, index) => (
                <span key={index} className="keyword-tag">
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          {result.suggestedPalette && (
            <div className="palette-section">
              <span className="palette-label">
                الباليت المقترح: {result.suggestedPalette.nameAr}
              </span>
              <div className="color-row">
                {result.suggestedPalette.colors.map((color, index) => (
                  <div
                    key={index}
                    className="color-swatch"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {palettes.length > 0 && (
        <div className="palettes-grid fade-in">
          {palettes.map((palette, index) => (
            <div key={index} className="palette-card card">
              <h4>{palette.nameAr}</h4>
              <p className="palette-name-en">{palette.name}</p>
              <div className="color-row">
                {palette.colors.map((color, colorIndex) => (
                  <div
                    key={colorIndex}
                    className="color-swatch"
                    style={{ background: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Inspiration() {
  const [sceneDescription, setSceneDescription] = useState("");
  const [mood, setMood] = useState("");
  const [era, setEra] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MoodBoard | null>(null);
  const [palettes, setPalettes] = useState<ColorPalette[]>([]);

  const handleAnalyze = async () => {
    if (!sceneDescription) return;
    setLoading(true);
    try {
      const response = await fetch(artDirectorApiPath("/inspiration/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneDescription,
          mood: mood || undefined,
          era: era || undefined,
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: MoodBoard;
      };
      if (data.success && data.data) {
        setResult(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleGeneratePalette = async () => {
    if (!mood) return;
    setLoading(true);
    try {
      const response = await fetch(artDirectorApiPath("/inspiration/palette"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, count: 3 }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: { palettes?: ColorPalette[] };
      };
      if (data.success && data.data?.palettes) {
        setPalettes(data.data.palettes);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  return (
    <div className="inspiration-page fade-in">
      <header className="page-header">
        <Palette size={32} className="header-icon" />
        <div>
          <h1>الإلهام البصري</h1>
          <p>إنشاء لوحات مزاجية وباليتات ألوان للمشاهد</p>
        </div>
      </header>

      <div className="inspiration-grid">
        <InspirationForm
          sceneDescription={sceneDescription}
          mood={mood}
          era={era}
          loading={loading}
          onSceneDescriptionChange={setSceneDescription}
          onMoodChange={setMood}
          onEraChange={setEra}
          onAnalyze={handleAnalyze}
          onGeneratePalette={handleGeneratePalette}
        />
        <InspirationResults result={result} palettes={palettes} />
      </div>
    </div>
  );
}

export default Inspiration;

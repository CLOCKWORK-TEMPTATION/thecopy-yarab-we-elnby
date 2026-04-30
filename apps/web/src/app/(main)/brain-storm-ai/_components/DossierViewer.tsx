"use client";

interface DossierSections {
  logline: string;
  premise: string;
  themes: string;
  characters: string;
  conflictMap: string;
  plotArc: string;
  audienceGenre: string;
  producibilityBrief: string;
  productionNotes: string;
}

interface DossierViewerProps {
  ideaStrId: string;
  headline: string;
  dossierMd?: string;
  dossierJson?: DossierSections;
  mode?: "full" | "compact";
}

const SECTION_ORDER: {
  key: keyof DossierSections;
  label: string;
  icon: string;
}[] = [
  { key: "logline", label: "Logline", icon: "💡" },
  { key: "premise", label: "الفكرة", icon: "📖" },
  { key: "themes", label: "الثيمات", icon: "🎭" },
  { key: "characters", label: "الشخصيات", icon: "👤" },
  { key: "conflictMap", label: "خريطة الصراعات", icon: "⚡" },
  { key: "plotArc", label: "قوس الحبكة", icon: "📈" },
  { key: "audienceGenre", label: "الجمهور والجنر", icon: "🎬" },
  { key: "producibilityBrief", label: "قابلية الإنتاج", icon: "🏭" },
  { key: "productionNotes", label: "ملاحظات الإنتاج", icon: "📝" },
];

export function DossierViewer({
  ideaStrId,
  headline,
  dossierMd,
  dossierJson,
  mode = "full",
}: DossierViewerProps) {
  if (mode === "full" && dossierMd) {
    return (
      <div
        dir="rtl"
        data-testid={`dossier-${ideaStrId}`}
        className="prose prose-invert prose-sm max-w-none space-y-4 leading-relaxed"
      >
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
          <span className="font-mono text-xs text-white/30">{ideaStrId}</span>
          <h2 className="text-lg font-bold text-white m-0">{headline}</h2>
        </div>
        <div className="whitespace-pre-wrap text-white/70 leading-relaxed">
          {dossierMd}
        </div>
      </div>
    );
  }

  if (dossierJson) {
    return (
      <div dir="rtl" data-testid={`dossier-${ideaStrId}`} className="space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <span className="font-mono text-xs text-white/30">{ideaStrId}</span>
          <h2 className="text-lg font-bold text-white">{headline}</h2>
        </div>
        {SECTION_ORDER.map(({ key, label, icon }) => {
          const content = dossierJson[key];
          if (!content) return null;
          return (
            <div key={key} className="space-y-2">
              <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
                <span>{icon}</span>
                <span>{label}</span>
              </h3>
              <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                {content}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      data-testid={`dossier-${ideaStrId}`}
      className="text-white/40 text-sm text-center py-8"
    >
      الـ dossier غير متاح بعد
    </div>
  );
}

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface DocumentationSummaryProps {
  productionBookTitleAr?: string;
  styleGuideNameAr?: string;
  decisionsCount: number;
}

export function DocumentationSummary({
  productionBookTitleAr,
  styleGuideNameAr,
  decisionsCount,
}: DocumentationSummaryProps) {
  return (
    <CardSpotlight
      className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl"
      style={{ marginBottom: "24px" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ color: "var(--art-text-muted)", fontSize: "13px" }}>
            آخر كتاب محفوظ
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>
            {productionBookTitleAr ?? "لا يوجد بعد"}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--art-text-muted)", fontSize: "13px" }}>
            آخر دليل أسلوب
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>
            {styleGuideNameAr ?? "لا يوجد بعد"}
          </div>
        </div>
        <div>
          <div style={{ color: "var(--art-text-muted)", fontSize: "13px" }}>
            القرارات الموثقة
          </div>
          <div style={{ fontSize: "18px", fontWeight: 700 }}>{decisionsCount}</div>
        </div>
      </div>
    </CardSpotlight>
  );
}

import { useMemo } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import type {
  ChartItem,
  PieItem,
} from "@/app/(main)/art-director/components/productivity/types";

interface ProgressBarProps {
  item: ChartItem;
  maxHours: number;
}

function ProgressBar({ item, maxHours }: ProgressBarProps) {
  const percentage = useMemo(
    () => (item.hours / maxHours) * 100,
    [item.hours, maxHours]
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <span style={{ width: "80px", fontSize: "14px" }}>{item.name}</span>
      <div
        style={{
          flex: 1,
          height: "24px",
          background: "rgba(255,255,255,0.1)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            background: item.color,
            borderRadius: "4px",
            transition: "width 0.3s ease",
          }}
          role="progressbar"
          aria-valuenow={item.hours}
          aria-valuemin={0}
          aria-valuemax={maxHours}
        />
      </div>
      <span style={{ width: "40px", fontSize: "14px", textAlign: "left" }}>
        {item.hours}h
      </span>
    </div>
  );
}

function PieChartItem({ item }: { item: PieItem }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          width: "80px",
          height: "80px",
          borderRadius: "50%",
          background: `conic-gradient(${item.color} 0% ${item.value}%, rgba(255,255,255,0.1) ${item.value}% 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "8px",
        }}
        role="img"
        aria-label={`${item.name}: ${item.value}%`}
      >
        <div
          style={{
            width: "60px",
            height: "60px",
            borderRadius: "50%",
            background: "var(--art-card)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
          }}
        >
          {item.value}%
        </div>
      </div>
      <span style={{ fontSize: "14px", color: item.color }}>{item.name}</span>
    </div>
  );
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: "24px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.05)",
        color: "var(--art-text-muted)",
        textAlign: "center",
      }}
    >
      {message}
    </div>
  );
}

interface ProductivityVisualsProps {
  chartData: ChartItem[];
  pieData: PieItem[];
  maxHours: number;
}

export function ProductivityVisuals({
  chartData,
  pieData,
  maxHours,
}: ProductivityVisualsProps) {
  return (
    <div className="art-grid-2" style={{ gap: "24px" }}>
      <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
        <h3 style={{ marginBottom: "20px" }}>توزيع ساعات العمل</h3>
        {chartData.length === 0 ? (
          <EmptyChartState message="لا توجد سجلات وقت بعد. أضف أول مهمة لبدء التحليل." />
        ) : (
          <div
            style={{ display: "flex", flexDirection: "column", gap: "12px" }}
          >
            {chartData.map((item) => (
              <ProgressBar key={item.name} item={item} maxHours={maxHours} />
            ))}
          </div>
        )}
      </CardSpotlight>

      <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
        <h3 style={{ marginBottom: "20px" }}>حالة المهام</h3>
        {pieData.length === 0 ? (
          <EmptyChartState message="ستظهر حالة المهام هنا بعد تسجيل الوقت أو التأخيرات." />
        ) : (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {pieData.map((item) => (
              <PieChartItem key={item.name} item={item} />
            ))}
          </div>
        )}
      </CardSpotlight>
    </div>
  );
}

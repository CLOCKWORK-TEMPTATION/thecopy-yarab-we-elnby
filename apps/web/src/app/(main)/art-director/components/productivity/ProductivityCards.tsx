import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import type { ComponentType } from "react";

interface RecommendationsListProps {
  recommendations: string[];
}

export function RecommendationsList({
  recommendations,
}: RecommendationsListProps) {
  if (recommendations.length === 0) {
    return null;
  }

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
          توصيات التحسين
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {recommendations.map((recommendation, index) => (
            <li
              key={index}
              style={{
                padding: "12px",
                background: "rgba(74, 222, 128, 0.1)",
                borderRadius: "8px",
                marginBottom: "8px",
              }}
            >
              {recommendation}
            </li>
          ))}
        </ul>
      </div>
    </CardSpotlight>
  );
}

interface MetricCardProps {
  color: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
  title: string;
  value: string;
}

export function MetricCard({
  color,
  icon: Icon,
  title,
  value,
}: MetricCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            background: `${color}20`,
            color,
            padding: "10px",
            borderRadius: "12px",
            display: "inline-flex",
          }}
        >
          <Icon size={20} aria-hidden={true} />
        </div>
        <div>
          <div style={{ color: "var(--art-text-muted)", fontSize: "13px" }}>
            {title}
          </div>
          <div style={{ fontSize: "24px", fontWeight: 700 }}>{value}</div>
        </div>
      </div>
    </CardSpotlight>
  );
}

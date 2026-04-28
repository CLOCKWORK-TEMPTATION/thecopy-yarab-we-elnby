"use client";

import { Gauge, ListChecks, CheckCircle2, AlertTriangle } from "lucide-react";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { isVisualAnalysisData } from "./resultUtils";
import type { VisualIssue, ExecutionResultProps } from "./types";

function SeverityBadge({ severity }: { severity: VisualIssue["severity"] }) {
  const label =
    severity === "high" ? "مرتفع" : severity === "medium" ? "متوسط" : "منخفض";

  return <span className={`art-severity-badge ${severity}`}>{label}</span>;
}

interface VisualConsistencyResultProps {
  data: {
    consistent: boolean;
    score: number;
    issues: VisualIssue[];
    suggestions: string[];
  };
}

function VisualConsistencyResult({ data }: VisualConsistencyResultProps) {
  return (
    <div className="art-visual-result">
      <div className="art-result-metrics">
        <div className="art-result-metric">
          <Gauge size={20} aria-hidden="true" />
          <span>درجة الاتساق</span>
          <strong>{data.score}%</strong>
        </div>
        <div className="art-result-metric">
          {data.consistent ? (
            <CheckCircle2 size={20} aria-hidden="true" />
          ) : (
            <AlertTriangle size={20} aria-hidden="true" />
          )}
          <span>حالة التناسق</span>
          <strong>{data.consistent ? "متسق" : "يحتاج مراجعة"}</strong>
        </div>
      </div>

      <section className="art-result-section">
        <h4>
          <ListChecks size={18} aria-hidden="true" />
          مشاكل مكتشفة
        </h4>
        {data.issues.length === 0 ? (
          <p className="art-result-empty">لم تظهر مشاكل مؤثرة في العينة.</p>
        ) : (
          <div className="art-result-issues">
            {data.issues.map((issue, index) => (
              <article key={`${issue.type}-${index}`} className="art-issue">
                <div className="art-issue-header">
                  <SeverityBadge severity={issue.severity} />
                  <span>{issue.location ?? "موضع غير محدد"}</span>
                </div>
                <p>{issue.descriptionAr ?? issue.description}</p>
                {issue.suggestion ? <small>{issue.suggestion}</small> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {data.suggestions.length > 0 ? (
        <section className="art-result-section">
          <h4>التوصيات</h4>
          <ul className="art-result-list">
            {data.suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function GenericResultData({ data }: { data?: Record<string, unknown> }) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <p className="art-result-empty">
        اكتمل التنفيذ دون بيانات إضافية من الخادم.
      </p>
    );
  }

  return (
    <details className="art-result-details" open>
      <summary>تفاصيل النتيجة</summary>
      <pre className="art-result-json">{JSON.stringify(data, null, 2)}</pre>
    </details>
  );
}

export function ExecutionResultDisplay({
  selectedTool,
  result,
}: ExecutionResultProps) {
  const data = result.data;
  const isVisualResult =
    selectedTool === "visual-analyzer" && isVisualAnalysisData(data);

  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div
        className="art-result-card"
        style={{ animation: "fadeIn 0.3s ease-in-out", marginTop: 0 }}
      >
        <h3>النتيجة</h3>
        <div
          className={`art-result-status ${result.success ? "success" : "error"}`}
        >
          {result.success ? "نجح التنفيذ" : "فشل التنفيذ"}
        </div>
        {!result.success && result.error ? (
          <p className="art-result-error">{result.error}</p>
        ) : null}
        {isVisualResult ? (
          <VisualConsistencyResult data={data} />
        ) : data === undefined ? (
          <GenericResultData />
        ) : (
          <GenericResultData data={data} />
        )}
      </div>
    </CardSpotlight>
  );
}

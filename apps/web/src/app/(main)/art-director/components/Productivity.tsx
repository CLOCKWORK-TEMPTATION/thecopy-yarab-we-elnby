"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  TimerReset,
  TrendingUp,
} from "lucide-react";

import {
  DelayForm,
  TimeForm,
} from "@/app/(main)/art-director/components/productivity/ProductivityForms";
import {
  MetricCard,
  RecommendationsList,
} from "@/app/(main)/art-director/components/productivity/ProductivityCards";
import { ProductivityVisuals } from "@/app/(main)/art-director/components/productivity/ProductivityVisuals";
import { useProductivityData } from "@/app/(main)/art-director/hooks/useProductivityData";

export default function Productivity() {
  const {
    analysis,
    chartData,
    delayForm,
    error,
    handleDelayFormChange,
    handleLogTime,
    handleReportDelay,
    handleTimeFormChange,
    loadRecommendations,
    maxHours,
    pieData,
    recommendations,
    setShowDelayForm,
    setShowTimeForm,
    showDelayForm,
    showTimeForm,
    timeForm,
  } = useProductivityData();

  return (
    <div className="art-director-page">
      <header className="art-page-header">
        <BarChart3 size={32} className="header-icon" aria-hidden="true" />
        <div>
          <h1>تحليل الإنتاجية</h1>
          <p>تتبع الوقت والأداء وتحليل التأخيرات</p>
        </div>
      </header>

      <div className="art-toolbar">
        <button
          className="art-btn"
          onClick={() => setShowTimeForm(true)}
          type="button"
        >
          <Clock size={18} aria-hidden="true" />
          تسجيل وقت
        </button>
        <button
          className="art-btn art-btn-secondary"
          onClick={() => setShowDelayForm(true)}
          type="button"
        >
          <AlertTriangle size={18} aria-hidden="true" />
          الإبلاغ عن تأخير
        </button>
        <button
          className="art-btn art-btn-secondary"
          onClick={loadRecommendations}
          type="button"
        >
          <TrendingUp size={18} aria-hidden="true" />
          توصيات التحسين
        </button>
      </div>

      {error ? (
        <div
          className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100"
          style={{ marginBottom: "24px" }}
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="art-grid-4" style={{ gap: "16px", marginBottom: "24px" }}>
        <MetricCard
          title="إجمالي الساعات"
          value={`${analysis.totalHours} ساعة`}
          icon={Clock}
          color="#60a5fa"
        />
        <MetricCard
          title="المهام المكتملة"
          value={`${analysis.taskCount}`}
          icon={CheckCircle2}
          color="#4ade80"
        />
        <MetricCard
          title="الساعات المهدرة"
          value={`${analysis.delayHours} ساعة`}
          icon={TimerReset}
          color="#f97316"
        />
        <MetricCard
          title="معدل الإنجاز"
          value={`${analysis.completionRate}%`}
          icon={TrendingUp}
          color="#a78bfa"
        />
      </div>

      {showTimeForm ? (
        <TimeForm
          formData={timeForm}
          onFormChange={handleTimeFormChange}
          onSubmit={handleLogTime}
          onCancel={() => setShowTimeForm(false)}
        />
      ) : null}

      {showDelayForm ? (
        <DelayForm
          formData={delayForm}
          onFormChange={handleDelayFormChange}
          onSubmit={handleReportDelay}
          onCancel={() => setShowDelayForm(false)}
        />
      ) : null}

      <RecommendationsList recommendations={recommendations} />
      <ProductivityVisuals
        chartData={chartData}
        pieData={pieData}
        maxHours={maxHours}
      />
    </div>
  );
}

"use client";

/**
 * الصفحة: art-director / Productivity
 * الهوية: تحليل إنتاجية داخلي بطابع تشغيلي/بياني متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  BarChart3,
  Clock,
  AlertTriangle,
  TrendingUp,
  Plus,
  CheckCircle2,
  TimerReset,
} from "lucide-react";
import type { ApiResponse } from "../types";
import { fetchArtDirectorJson } from "../lib/api-client";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface TimeFormData {
  task: string;
  hours: string;
  category: string;
}

interface DelayFormData {
  reason: string;
  impact: string;
  hoursLost: string;
}

interface ChartItem {
  name: string;
  hours: number;
  color: string;
}

interface PieItem {
  name: string;
  value: number;
  color: string;
}

interface ProductivityAnalysis {
  period: string;
  department: string;
  totalHours: number;
  taskCount: number;
  delayHours: number;
  completionRate: number;
}

interface ProductivitySummaryResponse {
  chartData: ChartItem[];
  pieData: PieItem[];
}

const DEFAULT_TIME_FORM: TimeFormData = {
  task: "",
  hours: "",
  category: "design",
};

const DEFAULT_DELAY_FORM: DelayFormData = {
  reason: "",
  impact: "low",
  hoursLost: "",
};

const EMPTY_ANALYSIS: ProductivityAnalysis = {
  period: "weekly",
  department: "all",
  totalHours: 0,
  taskCount: 0,
  delayHours: 0,
  completionRate: 0,
};

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

interface PieChartItemProps {
  item: PieItem;
}

function PieChartItem({ item }: PieChartItemProps) {
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

interface TimeFormProps {
  formData: TimeFormData;
  onFormChange: (data: Partial<TimeFormData>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function TimeForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
}: TimeFormProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <Clock size={20} aria-hidden="true" /> تسجيل وقت العمل
        </h3>
        <div className="art-form-grid">
          <div className="art-form-group">
            <label htmlFor="time-task">المهمة</label>
            <input
              id="time-task"
              type="text"
              className="art-input"
              placeholder="وصف المهمة"
              value={formData.task}
              onChange={(e) => onFormChange({ task: e.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="time-hours">الساعات</label>
            <input
              id="time-hours"
              type="number"
              className="art-input"
              placeholder="عدد الساعات"
              value={formData.hours}
              onChange={(e) => onFormChange({ hours: e.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="time-category">الفئة</label>
            <select
              id="time-category"
              className="art-input"
              value={formData.category}
              onChange={(e) => onFormChange({ category: e.target.value })}
            >
              <option value="design">تصميم</option>
              <option value="construction">بناء</option>
              <option value="painting">طلاء</option>
              <option value="lighting">إضاءة</option>
              <option value="meetings">اجتماعات</option>
            </select>
          </div>
        </div>
        <div className="art-form-actions">
          <button className="art-btn" onClick={onSubmit} type="button">
            <Plus size={18} aria-hidden="true" /> تسجيل
          </button>
          <button
            className="art-btn art-btn-secondary"
            onClick={onCancel}
            type="button"
          >
            إلغاء
          </button>
        </div>
      </div>
    </CardSpotlight>
  );
}

interface DelayFormProps {
  formData: DelayFormData;
  onFormChange: (data: Partial<DelayFormData>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function DelayForm({
  formData,
  onFormChange,
  onSubmit,
  onCancel,
}: DelayFormProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
        <h3
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "20px",
          }}
        >
          <AlertTriangle size={20} aria-hidden="true" /> الإبلاغ عن تأخير
        </h3>
        <div className="art-form-grid">
          <div className="art-form-group full-width">
            <label htmlFor="delay-reason">سبب التأخير</label>
            <textarea
              id="delay-reason"
              className="art-input"
              placeholder="وصف سبب التأخير"
              value={formData.reason}
              onChange={(e) => onFormChange({ reason: e.target.value })}
              rows={3}
              style={{ resize: "none" }}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="delay-impact">مستوى التأثير</label>
            <select
              id="delay-impact"
              className="art-input"
              value={formData.impact}
              onChange={(e) => onFormChange({ impact: e.target.value })}
            >
              <option value="low">منخفض</option>
              <option value="medium">متوسط</option>
              <option value="high">مرتفع</option>
              <option value="critical">حرج</option>
            </select>
          </div>
          <div className="art-form-group">
            <label htmlFor="delay-hours">الساعات المفقودة</label>
            <input
              id="delay-hours"
              type="number"
              className="art-input"
              placeholder="عدد الساعات"
              value={formData.hoursLost}
              onChange={(e) => onFormChange({ hoursLost: e.target.value })}
            />
          </div>
        </div>
        <div className="art-form-actions">
          <button className="art-btn" onClick={onSubmit} type="button">
            <AlertTriangle size={18} aria-hidden="true" /> إبلاغ
          </button>
          <button
            className="art-btn art-btn-secondary"
            onClick={onCancel}
            type="button"
          >
            إلغاء
          </button>
        </div>
      </div>
    </CardSpotlight>
  );
}

interface RecommendationsListProps {
  recommendations: string[];
}

function RecommendationsList({ recommendations }: RecommendationsListProps) {
  if (recommendations.length === 0) return null;

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
          <TrendingUp size={20} aria-hidden="true" /> توصيات التحسين
        </h3>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} role="list">
          {recommendations.map((rec, index) => (
            <li
              key={index}
              style={{
                padding: "12px",
                background: "rgba(74, 222, 128, 0.1)",
                borderRadius: "8px",
                marginBottom: "8px",
              }}
            >
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </CardSpotlight>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  icon: typeof Clock;
  color: string;
}

function MetricCard({ title, value, icon: Icon, color }: MetricCardProps) {
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
          <Icon size={20} aria-hidden="true" />
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

interface EmptyChartStateProps {
  message: string;
}

function EmptyChartState({ message }: EmptyChartStateProps) {
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

function parseValidNumber(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function Productivity() {
  const [showTimeForm, setShowTimeForm] = useState(false);
  const [showDelayForm, setShowDelayForm] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [chartData, setChartData] = useState<ChartItem[]>([]);
  const [pieData, setPieData] = useState<PieItem[]>([]);
  const [analysis, setAnalysis] =
    useState<ProductivityAnalysis>(EMPTY_ANALYSIS);
  const [timeForm, setTimeForm] = useState<TimeFormData>(DEFAULT_TIME_FORM);
  const [delayForm, setDelayForm] = useState<DelayFormData>(DEFAULT_DELAY_FORM);
  const [error, setError] = useState<string | null>(null);

  const maxHours = useMemo(
    () => Math.max(...chartData.map((item) => item.hours), 1),
    [chartData]
  );

  const loadSummary = useCallback(async () => {
    const summary = await fetchArtDirectorJson<
      ApiResponse<ProductivitySummaryResponse>
    >("/productivity/summary");

    if (!summary.success || !summary.data) {
      throw new Error(summary.error ?? "فشل في تحميل ملخص الإنتاجية");
    }

    setChartData(summary.data.chartData);
    setPieData(summary.data.pieData);
  }, []);

  const loadAnalysis = useCallback(async () => {
    const summary = await fetchArtDirectorJson<
      ApiResponse<ProductivityAnalysis>
    >("/analyze/productivity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!summary.success || !summary.data) {
      throw new Error(summary.error ?? "فشل في تحميل مؤشرات الإنتاجية");
    }

    setAnalysis(summary.data);
  }, []);

  const refreshProductivity = useCallback(async () => {
    setError(null);

    try {
      await Promise.all([loadSummary(), loadAnalysis()]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء تحديث البيانات";
      setError(errorMessage);
    }
  }, [loadAnalysis, loadSummary]);

  const handleLogTime = useCallback(async () => {
    setError(null);

    const hours = parseValidNumber(timeForm.hours);
    if (hours === null || hours <= 0) {
      setError("يرجى إدخال عدد ساعات صحيح");
      return;
    }

    if (!timeForm.task.trim()) {
      setError("يرجى إدخال وصف المهمة");
      return;
    }

    try {
      const data = await fetchArtDirectorJson<ApiResponse>(
        "/productivity/log-time",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: timeForm.task,
            hours,
            category: timeForm.category,
          }),
        }
      );

      if (data.success) {
        setShowTimeForm(false);
        setTimeForm(DEFAULT_TIME_FORM);
        await refreshProductivity();
      } else {
        setError(data.error ?? "فشل في تسجيل الوقت");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء التسجيل";
      setError(errorMessage);
    }
  }, [refreshProductivity, timeForm]);

  const handleReportDelay = useCallback(async () => {
    setError(null);

    const hoursLost = parseValidNumber(delayForm.hoursLost);
    if (hoursLost === null || hoursLost <= 0) {
      setError("يرجى إدخال عدد الساعات المفقودة");
      return;
    }

    if (!delayForm.reason.trim()) {
      setError("يرجى إدخال سبب التأخير");
      return;
    }

    try {
      const data = await fetchArtDirectorJson<ApiResponse>(
        "/productivity/report-delay",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reason: delayForm.reason,
            impact: delayForm.impact,
            hoursLost,
          }),
        }
      );

      if (data.success) {
        setShowDelayForm(false);
        setDelayForm(DEFAULT_DELAY_FORM);
        await refreshProductivity();
      } else {
        setError(data.error ?? "فشل في الإبلاغ عن التأخير");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء الإبلاغ";
      setError(errorMessage);
    }
  }, [delayForm, refreshProductivity]);

  const loadRecommendations = useCallback(async () => {
    setError(null);

    try {
      const data = await fetchArtDirectorJson<
        ApiResponse<{ recommendations: string[] }>
      >("/productivity/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (data.success && data.data?.recommendations) {
        setRecommendations(data.data.recommendations);
      } else {
        setError(data.error ?? "فشل في تحميل التوصيات");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء التحميل";
      setError(errorMessage);
    }
  }, []);

  const handleTimeFormChange = useCallback((data: Partial<TimeFormData>) => {
    setTimeForm((prev) => ({ ...prev, ...data }));
  }, []);

  const handleDelayFormChange = useCallback((data: Partial<DelayFormData>) => {
    setDelayForm((prev) => ({ ...prev, ...data }));
  }, []);

  useEffect(() => {
    void refreshProductivity();
  }, [refreshProductivity]);

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
    </div>
  );
}

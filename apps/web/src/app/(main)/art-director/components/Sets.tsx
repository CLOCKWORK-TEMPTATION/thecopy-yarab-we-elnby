"use client";

/**
 * الصفحة: art-director / Sets
 * الهوية: إدارة ديكورات داخلية بطابع سينمائي تشغيلي متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import { Boxes, Recycle, Leaf, Plus } from "lucide-react";
import type { SetPiece, SustainabilityReport, ApiResponse } from "../types";
import { fetchArtDirectorJson } from "../lib/api-client";
import { useArtDirectorPersistence } from "../hooks/useArtDirectorPersistence";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface SetPieceFormData {
  name: string;
  nameAr: string;
  category: string;
  condition: string;
  dimensions: string;
}

const DEFAULT_FORM_DATA: SetPieceFormData = {
  name: "",
  nameAr: "",
  category: "أثاث",
  condition: "excellent",
  dimensions: "",
};

const CONDITION_MAP: Record<string, { color: string; label: string }> = {
  excellent: { color: "#4ade80", label: "ممتاز" },
  good: { color: "#fbbf24", label: "جيد" },
  fair: { color: "#f97316", label: "مقبول" },
  poor: { color: "#ef4444", label: "سيء" },
};

function getConditionInfo(condition: string) {
  return CONDITION_MAP[condition] ?? { color: "#a0a0a0", label: condition };
}

interface SetPieceCardProps {
  piece: SetPiece;
}

function SetPieceCard({ piece }: SetPieceCardProps) {
  const { color, label } = getConditionInfo(piece.condition);

  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div
        style={{
          display: "inline-block",
          background: "var(--art-primary)",
          color: "white",
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          marginBottom: "12px",
        }}
      >
        {piece.category}
      </div>
      <h4 style={{ marginBottom: "4px" }}>{piece.nameAr}</h4>
      <p
        style={{
          color: "var(--art-text-muted)",
          fontSize: "12px",
          marginBottom: "12px",
        }}
      >
        {piece.name}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span
          className="art-condition-badge"
          style={{ background: `${color}20`, color }}
        >
          {label}
        </span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            fontSize: "12px",
          }}
        >
          <Recycle size={14} aria-hidden="true" />
          {piece.reusabilityScore}%
        </span>
      </div>
    </CardSpotlight>
  );
}

function EmptyState() {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-8 text-center backdrop-blur-xl">
      <div className="art-empty-state" style={{ padding: 0 }}>
        <Boxes size={48} aria-hidden="true" />
        <h3>لا توجد قطع</h3>
        <p>ابدأ بإضافة قطع ديكور جديدة</p>
      </div>
    </CardSpotlight>
  );
}

interface SustainabilityReportCardProps {
  report: SustainabilityReport;
}

function SustainabilityReportCard({ report }: SustainabilityReportCardProps) {
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
          <Leaf size={20} aria-hidden="true" /> تقرير الاستدامة
        </h3>
        <div className="art-grid-3" style={{ marginBottom: "20px" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: 700 }}>
              {report.totalPieces}
            </div>
            <div style={{ color: "var(--art-text-muted)", fontSize: "14px" }}>
              إجمالي القطع
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "28px", fontWeight: 700, color: "#4ade80" }}
            >
              {report.reusablePercentage}%
            </div>
            <div style={{ color: "var(--art-text-muted)", fontSize: "14px" }}>
              قابل لإعادة الاستخدام
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{ fontSize: "28px", fontWeight: 700, color: "#fbbf24" }}
            >
              ${report.estimatedSavings}
            </div>
            <div style={{ color: "var(--art-text-muted)", fontSize: "14px" }}>
              توفير متوقع
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px",
            background: "rgba(74, 222, 128, 0.1)",
            borderRadius: "10px",
          }}
        >
          <Recycle size={18} style={{ color: "#4ade80" }} aria-hidden="true" />
          <span>{report.environmentalImpact}</span>
        </div>
      </div>
    </CardSpotlight>
  );
}

interface AddPieceFormProps {
  formData: SetPieceFormData;
  loading: boolean;
  onFormChange: (data: Partial<SetPieceFormData>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

function AddPieceForm({
  formData,
  loading,
  onFormChange,
  onSubmit,
  onCancel,
}: AddPieceFormProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
        <h3 style={{ marginBottom: "20px" }}>إضافة قطعة ديكور</h3>
        <div className="art-form-grid">
          <div className="art-form-group">
            <label htmlFor="piece-name-ar">الاسم (عربي)</label>
            <input
              id="piece-name-ar"
              type="text"
              className="art-input"
              placeholder="مثال: كنبة كلاسيكية"
              value={formData.nameAr}
              onChange={(e) => onFormChange({ nameAr: e.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="piece-name-en">الاسم (إنجليزي)</label>
            <input
              id="piece-name-en"
              type="text"
              className="art-input"
              placeholder="Example: Classic Sofa"
              value={formData.name}
              onChange={(e) => onFormChange({ name: e.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="piece-category">الفئة</label>
            <select
              id="piece-category"
              className="art-input"
              value={formData.category}
              onChange={(e) => onFormChange({ category: e.target.value })}
            >
              <option value="أثاث">أثاث</option>
              <option value="إكسسوارات">إكسسوارات</option>
              <option value="إضاءة">إضاءة</option>
              <option value="أقمشة">أقمشة</option>
              <option value="هياكل">هياكل</option>
            </select>
          </div>
          <div className="art-form-group">
            <label htmlFor="piece-condition">الحالة</label>
            <select
              id="piece-condition"
              className="art-input"
              value={formData.condition}
              onChange={(e) => onFormChange({ condition: e.target.value })}
            >
              <option value="excellent">ممتاز</option>
              <option value="good">جيد</option>
              <option value="fair">مقبول</option>
              <option value="poor">سيء</option>
            </select>
          </div>
          <div className="art-form-group full-width">
            <label htmlFor="piece-dimensions">الأبعاد</label>
            <input
              id="piece-dimensions"
              type="text"
              className="art-input"
              placeholder="مثال: 200×80×90 سم"
              value={formData.dimensions}
              onChange={(e) => onFormChange({ dimensions: e.target.value })}
            />
          </div>
        </div>
        <div className="art-form-actions">
          <button
            className="art-btn"
            onClick={onSubmit}
            disabled={loading}
            type="button"
          >
            <Plus size={18} aria-hidden="true" />
            {loading ? "جاري الإضافة..." : "إضافة"}
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

export default function Sets() {
  const { state, updateSetsState } = useArtDirectorPersistence();
  const [pieces, setPieces] = useState<SetPiece[]>([]);
  const [report, setReport] = useState<SustainabilityReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showAddForm, formData } = state.sets;

  const handleAddPiece = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchArtDirectorJson<ApiResponse>("/sets/add-piece", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (data.success) {
        updateSetsState({
          showAddForm: false,
          formData: DEFAULT_FORM_DATA,
        });
        await loadInventory();
        await loadSustainabilityReport();
      } else {
        setError(data.error ?? "فشل في إضافة القطعة");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء الإضافة";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [formData, updateSetsState]);

  const loadInventory = useCallback(async () => {
    setError(null);

    try {
      const data = await fetchArtDirectorJson<
        ApiResponse<{ pieces: SetPiece[] }>
      >("/sets/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (data.success && data.data?.pieces) {
        setPieces(data.data.pieces);
      } else {
        if (data.error) setError(data.error);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل المخزون";
      setError(errorMessage);
    }
  }, []);

  const loadSustainabilityReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchArtDirectorJson<
        ApiResponse<SustainabilityReport>
      >("/sets/sustainability-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (data.success && data.data) {
        setReport(data.data);
      } else {
        setError(data.error ?? "فشل في تحميل التقرير");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "حدث خطأ أثناء تحميل التقرير";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleFormChange = useCallback(
    (data: Partial<SetPieceFormData>) => {
      updateSetsState({
        formData: {
          ...formData,
          ...data,
        },
      });
    },
    [formData, updateSetsState]
  );

  const handleCancelForm = useCallback(() => {
    updateSetsState({
      showAddForm: false,
      formData: DEFAULT_FORM_DATA,
    });
  }, [updateSetsState]);

  const piecesContent = useMemo(() => {
    if (pieces.length === 0) {
      return <EmptyState />;
    }

    return pieces.map((piece) => <SetPieceCard key={piece.id} piece={piece} />);
  }, [pieces]);

  useEffect(() => {
    void loadInventory();
    void loadSustainabilityReport();
  }, [loadInventory, loadSustainabilityReport]);

  return (
    <div className="art-director-page">
      <header className="art-page-header">
        <Boxes size={32} className="header-icon" aria-hidden="true" />
        <div>
          <h1>إدارة الديكورات</h1>
          <p>تتبع قطع الديكور وتحليل إعادة الاستخدام</p>
        </div>
      </header>

      <div className="art-toolbar">
        <button
          className="art-btn"
          onClick={() => updateSetsState({ showAddForm: true })}
          type="button"
        >
          <Plus size={18} aria-hidden="true" />
          إضافة قطعة
        </button>
        <button
          className="art-btn art-btn-secondary"
          onClick={loadInventory}
          type="button"
        >
          <Boxes size={18} aria-hidden="true" />
          عرض المخزون
        </button>
        <button
          className="art-btn art-btn-secondary"
          onClick={loadSustainabilityReport}
          disabled={loading}
          type="button"
        >
          <Leaf size={18} aria-hidden="true" />
          {loading ? "جاري التحميل..." : "تقرير الاستدامة"}
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

      {showAddForm ? (
        <AddPieceForm
          formData={formData}
          loading={loading}
          onFormChange={handleFormChange}
          onSubmit={handleAddPiece}
          onCancel={handleCancelForm}
        />
      ) : null}

      {report ? <SustainabilityReportCard report={report} /> : null}

      <div className="art-grid-4">{piecesContent}</div>
    </div>
  );
}

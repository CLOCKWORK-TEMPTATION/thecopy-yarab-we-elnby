import { Boxes, Recycle, Leaf, Plus } from "lucide-react";
import { useState } from "react";

import "./Sets.css";
import { artDirectorApiPath } from "../lib/api-client";

interface SetPiece {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  condition: string;
  reusabilityScore: number;
}

interface SustainabilityReport {
  totalPieces: number;
  reusablePercentage: number;
  estimatedSavings: number;
  environmentalImpact: string;
}

function Sets() {
  const [pieces, setPieces] = useState<SetPiece[]>([]);
  const [report, setReport] = useState<SustainabilityReport | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    category: "furniture",
    condition: "excellent",
    dimensions: "",
  });

  const handleAddPiece = async () => {
    setLoading(true);
    try {
      const response = await fetch(artDirectorApiPath("/sets/add-piece"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = (await response.json()) as { success?: boolean };
      if (data.success) {
        setShowAddForm(false);
        setFormData({
          name: "",
          nameAr: "",
          category: "furniture",
          condition: "excellent",
          dimensions: "",
        });
        await loadInventory();
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const loadInventory = async () => {
    try {
      const response = await fetch(artDirectorApiPath("/sets/inventory"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json()) as {
        success?: boolean;
        data?: { pieces?: SetPiece[] };
      };
      if (data.success && data.data?.pieces) {
        setPieces(data.data.pieces);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const loadSustainabilityReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        artDirectorApiPath("/sets/sustainability-report"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = (await response.json()) as {
        success?: boolean;
        data?: SustainabilityReport;
      };
      if (data.success && data.data) {
        setReport(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "excellent":
        return "#4ade80";
      case "good":
        return "#fbbf24";
      case "fair":
        return "#f97316";
      default:
        return "#ef4444";
    }
  };

  const getConditionLabel = (condition: string) => {
    switch (condition) {
      case "excellent":
        return "ممتاز";
      case "good":
        return "جيد";
      case "fair":
        return "مقبول";
      default:
        return "سيء";
    }
  };

  return (
    <div className="sets-page fade-in">
      <header className="page-header">
        <Boxes size={32} className="header-icon" />
        <div>
          <h1>إدارة الديكورات</h1>
          <p>تتبع قطع الديكور وتحليل إعادة الاستخدام</p>
        </div>
      </header>

      <div className="sets-toolbar">
        <button className="btn" onClick={() => setShowAddForm(true)}>
          <Plus size={18} />
          إضافة قطعة
        </button>
        <button className="btn btn-secondary" onClick={loadInventory}>
          <Boxes size={18} />
          عرض المخزون
        </button>
        <button
          className="btn btn-secondary"
          onClick={loadSustainabilityReport}
        >
          <Leaf size={18} />
          تقرير الاستدامة
        </button>
      </div>

      {showAddForm && (
        <div className="add-form card fade-in">
          <h3>إضافة قطعة ديكور</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>الاسم (عربي)</label>
              <input
                type="text"
                className="input"
                placeholder="مثال: كنبة كلاسيكية"
                value={formData.nameAr}
                onChange={(e) =>
                  setFormData({ ...formData, nameAr: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>الاسم (إنجليزي)</label>
              <input
                type="text"
                className="input"
                placeholder="Example: Classic Sofa"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>الفئة</label>
              <select
                className="input"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              >
                <option value="furniture">أثاث</option>
                <option value="props">إكسسوارات</option>
                <option value="lighting">إضاءة</option>
                <option value="textiles">أقمشة</option>
                <option value="structural">هياكل</option>
              </select>
            </div>
            <div className="form-group">
              <label>الحالة</label>
              <select
                className="input"
                value={formData.condition}
                onChange={(e) =>
                  setFormData({ ...formData, condition: e.target.value })
                }
              >
                <option value="excellent">ممتاز</option>
                <option value="good">جيد</option>
                <option value="fair">مقبول</option>
                <option value="poor">سيء</option>
              </select>
            </div>
            <div className="form-group full-width">
              <label>الأبعاد</label>
              <input
                type="text"
                className="input"
                placeholder="مثال: 200×80×90 سم"
                value={formData.dimensions}
                onChange={(e) =>
                  setFormData({ ...formData, dimensions: e.target.value })
                }
              />
            </div>
          </div>
          <div className="form-actions">
            <button className="btn" onClick={handleAddPiece} disabled={loading}>
              <Plus size={18} />
              {loading ? "جاري الإضافة..." : "إضافة"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowAddForm(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {report && (
        <div className="sustainability-report card fade-in">
          <h3>
            <Leaf size={20} /> تقرير الاستدامة
          </h3>
          <div className="report-stats">
            <div className="report-stat">
              <span className="stat-value">{report.totalPieces}</span>
              <span className="stat-label">إجمالي القطع</span>
            </div>
            <div className="report-stat">
              <span className="stat-value" style={{ color: "#4ade80" }}>
                {report.reusablePercentage}%
              </span>
              <span className="stat-label">قابل لإعادة الاستخدام</span>
            </div>
            <div className="report-stat">
              <span className="stat-value" style={{ color: "#fbbf24" }}>
                ${report.estimatedSavings}
              </span>
              <span className="stat-label">توفير متوقع</span>
            </div>
          </div>
          <div className="environmental-impact">
            <Recycle size={18} />
            <span>{report.environmentalImpact}</span>
          </div>
        </div>
      )}

      <div className="pieces-grid grid grid-4">
        {pieces.length === 0 ? (
          <div className="empty-state card">
            <Boxes size={48} />
            <h3>لا توجد قطع</h3>
            <p>ابدأ بإضافة قطع ديكور جديدة</p>
          </div>
        ) : (
          pieces.map((piece) => (
            <div key={piece.id} className="piece-card card">
              <div className="piece-category">{piece.category}</div>
              <h4>{piece.nameAr}</h4>
              <p className="piece-name-en">{piece.name}</p>
              <div className="piece-footer">
                <span
                  className="condition-badge"
                  style={{
                    background: `${getConditionColor(piece.condition)}20`,
                    color: getConditionColor(piece.condition),
                  }}
                >
                  {getConditionLabel(piece.condition)}
                </span>
                <span className="reusability-score">
                  <Recycle size={14} />
                  {piece.reusabilityScore}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sets;

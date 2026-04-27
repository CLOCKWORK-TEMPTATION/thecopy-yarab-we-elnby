import { PenTool, Plus } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import type { DecisionFormData } from "./types";

interface DecisionFormProps {
  formData: DecisionFormData;
  loading: boolean;
  onFormChange: (data: Partial<DecisionFormData>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function DecisionForm({
  formData,
  loading,
  onFormChange,
  onSubmit,
  onCancel,
}: DecisionFormProps) {
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
          <PenTool size={20} aria-hidden="true" /> توثيق قرار إبداعي
        </h3>
        <div className="art-form-grid">
          <div className="art-form-group full-width">
            <label htmlFor="decision-title">عنوان القرار</label>
            <input
              id="decision-title"
              type="text"
              className="art-input"
              placeholder="مثال: اختيار اللون الرئيسي للديكور"
              value={formData.title}
              onChange={(event) => onFormChange({ title: event.target.value })}
            />
          </div>
          <div className="art-form-group full-width">
            <label htmlFor="decision-description">الوصف</label>
            <textarea
              id="decision-description"
              className="art-input"
              placeholder="وصف تفصيلي للقرار"
              value={formData.description}
              onChange={(event) => onFormChange({ description: event.target.value })}
              rows={3}
              style={{ resize: "none" }}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="decision-category">الفئة</label>
            <select
              id="decision-category"
              className="art-input"
              value={formData.category}
              onChange={(event) => onFormChange({ category: event.target.value })}
            >
              <option value="color">الألوان</option>
              <option value="lighting">الإضاءة</option>
              <option value="props">الإكسسوارات</option>
              <option value="furniture">الأثاث</option>
              <option value="texture">الخامات</option>
            </select>
          </div>
          <div className="art-form-group">
            <label htmlFor="decision-rationale">المبرر</label>
            <input
              id="decision-rationale"
              type="text"
              className="art-input"
              placeholder="سبب اتخاذ هذا القرار"
              value={formData.rationale}
              onChange={(event) => onFormChange({ rationale: event.target.value })}
            />
          </div>
        </div>
        <div className="art-form-actions">
          <button className="art-btn" onClick={onSubmit} disabled={loading} type="button">
            <Plus size={18} aria-hidden="true" />
            توثيق
          </button>
          <button className="art-btn art-btn-secondary" onClick={onCancel} type="button">
            إلغاء
          </button>
        </div>
      </div>
    </CardSpotlight>
  );
}

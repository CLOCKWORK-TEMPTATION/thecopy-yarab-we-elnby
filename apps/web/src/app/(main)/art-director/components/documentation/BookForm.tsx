import { Book } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import type { BookFormData } from "./types";

interface BookFormProps {
  formData: BookFormData;
  loading: boolean;
  onFormChange: (data: Partial<BookFormData>) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function BookForm({
  formData,
  loading,
  onFormChange,
  onSubmit,
  onCancel,
}: BookFormProps) {
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
          <Book size={20} aria-hidden="true" /> إنشاء كتاب الإنتاج
        </h3>
        <div className="art-form-grid">
          <div className="art-form-group">
            <label htmlFor="book-name-ar">اسم المشروع (عربي)</label>
            <input
              id="book-name-ar"
              type="text"
              className="art-input"
              placeholder="مثال: رحلة إلى المجهول"
              value={formData.projectNameAr}
              onChange={(event) => onFormChange({ projectNameAr: event.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="book-name-en">اسم المشروع (إنجليزي)</label>
            <input
              id="book-name-en"
              type="text"
              className="art-input"
              placeholder="Example: Journey to the Unknown"
              value={formData.projectName}
              onChange={(event) => onFormChange({ projectName: event.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="book-director">المخرج</label>
            <input
              id="book-director"
              type="text"
              className="art-input"
              placeholder="اسم المخرج"
              value={formData.director}
              onChange={(event) => onFormChange({ director: event.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="book-company">شركة الإنتاج</label>
            <input
              id="book-company"
              type="text"
              className="art-input"
              placeholder="اسم الشركة"
              value={formData.productionCompany}
              onChange={(event) => onFormChange({ productionCompany: event.target.value })}
            />
          </div>
        </div>
        <div className="art-form-actions">
          <button className="art-btn" onClick={onSubmit} disabled={loading} type="button">
            <Book size={18} aria-hidden="true" />
            {loading ? "جاري الإنشاء..." : "إنشاء"}
          </button>
          <button className="art-btn art-btn-secondary" onClick={onCancel} type="button">
            إلغاء
          </button>
        </div>
      </div>
    </CardSpotlight>
  );
}

import { AlertTriangle, Clock, Plus } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import type {
  DelayFormData,
  TimeFormData,
} from "@/app/(main)/art-director/components/productivity/types";

interface TimeFormProps {
  formData: TimeFormData;
  onCancel: () => void;
  onFormChange: (data: Partial<TimeFormData>) => void;
  onSubmit: () => void;
}

export function TimeForm({
  formData,
  onCancel,
  onFormChange,
  onSubmit,
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
              onChange={(event) => onFormChange({ task: event.target.value })}
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
              onChange={(event) => onFormChange({ hours: event.target.value })}
            />
          </div>
          <div className="art-form-group">
            <label htmlFor="time-category">الفئة</label>
            <select
              id="time-category"
              className="art-input"
              value={formData.category}
              onChange={(event) =>
                onFormChange({ category: event.target.value })
              }
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
  onCancel: () => void;
  onFormChange: (data: Partial<DelayFormData>) => void;
  onSubmit: () => void;
}

export function DelayForm({
  formData,
  onCancel,
  onFormChange,
  onSubmit,
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
              onChange={(event) => onFormChange({ reason: event.target.value })}
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
              onChange={(event) => onFormChange({ impact: event.target.value })}
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
              onChange={(event) =>
                onFormChange({ hoursLost: event.target.value })
              }
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

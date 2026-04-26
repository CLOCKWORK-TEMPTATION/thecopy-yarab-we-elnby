import { FileText, Book, PenTool, Download, Plus } from "lucide-react";
import { useState } from "react";

import "./Documentation.css";
import { artDirectorApiPath } from "../lib/api-client";

interface ProductionBook {
  title: string;
  titleAr: string;
  sections: string[];
  createdAt: string;
}

interface StyleGuide {
  name: string;
  nameAr: string;
  elements: string[];
}

function Documentation() {
  const [showBookForm, setShowBookForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [productionBook, setProductionBook] = useState<ProductionBook | null>(
    null
  );
  const [styleGuide, setStyleGuide] = useState<StyleGuide | null>(null);
  const [loading, setLoading] = useState(false);

  const [bookForm, setBookForm] = useState({
    projectName: "",
    projectNameAr: "",
    director: "",
    productionCompany: "",
  });

  const [decisionForm, setDecisionForm] = useState({
    title: "",
    description: "",
    category: "color",
    rationale: "",
  });

  const handleGenerateBook = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        artDirectorApiPath("/documentation/generate"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookForm),
        }
      );
      const data = await response.json();
      if (data.success && data.data) {
        setProductionBook(data.data);
        setShowBookForm(false);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleGenerateStyleGuide = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        artDirectorApiPath("/documentation/style-guide"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName: bookForm.projectName || "مشروع جديد",
          }),
        }
      );
      const data = await response.json();
      if (data.success && data.data) {
        setStyleGuide(data.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleLogDecision = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        artDirectorApiPath("/documentation/log-decision"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(decisionForm),
        }
      );
      const data = await response.json();
      if (data.success) {
        setShowDecisionForm(false);
        setDecisionForm({
          title: "",
          description: "",
          category: "color",
          rationale: "",
        });
      }
    } catch (error) {
      console.error("Error:", error);
    }
    setLoading(false);
  };

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(
        artDirectorApiPath("/documentation/export"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format }),
        }
      );
      const data = await response.json();
      if (data.success) {
        alert(`تم تصدير التوثيق بصيغة ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  return (
    <div className="documentation-page fade-in">
      <header className="page-header">
        <FileText size={32} className="header-icon" />
        <div>
          <h1>التوثيق التلقائي</h1>
          <p>إنشاء كتب الإنتاج وأدلة الأسلوب</p>
        </div>
      </header>

      <div className="documentation-toolbar">
        <button className="btn" onClick={() => setShowBookForm(true)}>
          <Book size={18} />
          إنشاء كتاب إنتاج
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleGenerateStyleGuide}
          disabled={loading}
        >
          <PenTool size={18} />
          دليل الأسلوب
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowDecisionForm(true)}
        >
          <Plus size={18} />
          توثيق قرار
        </button>
      </div>

      {showBookForm && (
        <div className="form-modal card fade-in">
          <h3>
            <Book size={20} /> إنشاء كتاب الإنتاج
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label>اسم المشروع (عربي)</label>
              <input
                type="text"
                className="input"
                placeholder="مثال: رحلة إلى المجهول"
                value={bookForm.projectNameAr}
                onChange={(e) =>
                  setBookForm({ ...bookForm, projectNameAr: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>اسم المشروع (إنجليزي)</label>
              <input
                type="text"
                className="input"
                placeholder="Example: Journey to the Unknown"
                value={bookForm.projectName}
                onChange={(e) =>
                  setBookForm({ ...bookForm, projectName: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>المخرج</label>
              <input
                type="text"
                className="input"
                placeholder="اسم المخرج"
                value={bookForm.director}
                onChange={(e) =>
                  setBookForm({ ...bookForm, director: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>شركة الإنتاج</label>
              <input
                type="text"
                className="input"
                placeholder="اسم الشركة"
                value={bookForm.productionCompany}
                onChange={(e) =>
                  setBookForm({
                    ...bookForm,
                    productionCompany: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn"
              onClick={handleGenerateBook}
              disabled={loading}
            >
              <Book size={18} />
              {loading ? "جاري الإنشاء..." : "إنشاء"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowBookForm(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {showDecisionForm && (
        <div className="form-modal card fade-in">
          <h3>
            <PenTool size={20} /> توثيق قرار إبداعي
          </h3>
          <div className="form-grid">
            <div className="form-group full-width">
              <label>عنوان القرار</label>
              <input
                type="text"
                className="input"
                placeholder="مثال: اختيار اللون الرئيسي للديكور"
                value={decisionForm.title}
                onChange={(e) =>
                  setDecisionForm({ ...decisionForm, title: e.target.value })
                }
              />
            </div>
            <div className="form-group full-width">
              <label>الوصف</label>
              <textarea
                className="input"
                placeholder="وصف تفصيلي للقرار"
                value={decisionForm.description}
                onChange={(e) =>
                  setDecisionForm({
                    ...decisionForm,
                    description: e.target.value,
                  })
                }
              />
            </div>
            <div className="form-group">
              <label>الفئة</label>
              <select
                className="input"
                value={decisionForm.category}
                onChange={(e) =>
                  setDecisionForm({ ...decisionForm, category: e.target.value })
                }
              >
                <option value="color">الألوان</option>
                <option value="lighting">الإضاءة</option>
                <option value="props">الإكسسوارات</option>
                <option value="furniture">الأثاث</option>
                <option value="texture">الخامات</option>
              </select>
            </div>
            <div className="form-group">
              <label>المبرر</label>
              <input
                type="text"
                className="input"
                placeholder="سبب اتخاذ هذا القرار"
                value={decisionForm.rationale}
                onChange={(e) =>
                  setDecisionForm({
                    ...decisionForm,
                    rationale: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="btn"
              onClick={handleLogDecision}
              disabled={loading}
            >
              <Plus size={18} />
              {loading ? "جاري التوثيق..." : "توثيق"}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setShowDecisionForm(false)}
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="documentation-grid">
        {productionBook && (
          <div className="doc-card card fade-in">
            <div className="doc-header">
              <Book size={24} />
              <div>
                <h3>{productionBook.titleAr}</h3>
                <p>{productionBook.title}</p>
              </div>
            </div>
            <div className="doc-sections">
              <h4>الأقسام:</h4>
              <ul>
                {productionBook.sections.map((section, index) => (
                  <li key={index}>{section}</li>
                ))}
              </ul>
            </div>
            <div className="doc-meta">
              تاريخ الإنشاء:{" "}
              {new Date(productionBook.createdAt).toLocaleDateString("ar-EG")}
            </div>
            <div className="export-buttons">
              <button
                className="btn btn-secondary"
                onClick={() => handleExport("pdf")}
              >
                <Download size={16} /> PDF
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => handleExport("docx")}
              >
                <Download size={16} /> Word
              </button>
            </div>
          </div>
        )}

        {styleGuide && (
          <div className="doc-card card fade-in">
            <div className="doc-header">
              <PenTool size={24} />
              <div>
                <h3>{styleGuide.nameAr}</h3>
                <p>{styleGuide.name}</p>
              </div>
            </div>
            <div className="doc-sections">
              <h4>العناصر:</h4>
              <div className="elements-grid">
                {styleGuide.elements.map((element, index) => (
                  <span key={index} className="element-tag">
                    {element}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Documentation;

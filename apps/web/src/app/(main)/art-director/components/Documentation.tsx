"use client";

/**
 * الصفحة: art-director / Documentation
 * الهوية: توثيق تلقائي داخلي بطابع تنفيذي/أرشيفي متسق مع shell مدير الفن
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات art-director.css المحقونة من الطبقة الأعلى
 */

import { FileText } from "lucide-react";

import { BookForm } from "./documentation/BookForm";
import { DecisionForm } from "./documentation/DecisionForm";
import { DocumentationSummary } from "./documentation/DocumentationSummary";
import { DocumentationToolbar } from "./documentation/DocumentationToolbar";
import { ProductionBookCard } from "./documentation/ProductionBookCard";
import { StatusAlert } from "./documentation/StatusAlert";
import { StyleGuideCard } from "./documentation/StyleGuideCard";
import { useDocumentationController } from "./documentation/useDocumentationController";

export default function Documentation() {
  const { state, actions } = useDocumentationController();

  return (
    <div className="art-director-page">
      <header className="art-page-header">
        <FileText size={32} className="header-icon" aria-hidden="true" />
        <div>
          <h1>التوثيق التلقائي</h1>
          <p>إنشاء كتب الإنتاج وأدلة الأسلوب</p>
        </div>
      </header>

      <DocumentationToolbar
        loading={state.loading}
        onCreateBook={() => actions.setShowBookForm(true)}
        onGenerateStyleGuide={actions.handleGenerateStyleGuide}
        onLogDecision={() => actions.setShowDecisionForm(true)}
      />

      {state.error ? <StatusAlert tone="error" message={state.error} /> : null}
      {state.successMessage ? (
        <StatusAlert tone="success" message={state.successMessage} />
      ) : null}

      <DocumentationSummary
        productionBookTitleAr={state.productionBook?.titleAr}
        styleGuideNameAr={state.styleGuide?.nameAr}
        decisionsCount={state.decisionsCount}
      />

      {state.showBookForm ? (
        <BookForm
          formData={state.bookForm}
          loading={state.loading}
          onFormChange={actions.handleBookFormChange}
          onSubmit={actions.handleGenerateBook}
          onCancel={() => actions.setShowBookForm(false)}
        />
      ) : null}

      {state.showDecisionForm ? (
        <DecisionForm
          formData={state.decisionForm}
          loading={state.loading}
          onFormChange={actions.handleDecisionFormChange}
          onSubmit={actions.handleLogDecision}
          onCancel={() => actions.setShowDecisionForm(false)}
        />
      ) : null}

      <div className="art-grid-2" style={{ gap: "24px" }}>
        {state.productionBook ? (
          <ProductionBookCard
            book={state.productionBook}
            onExport={actions.handleExport}
          />
        ) : null}
        {state.styleGuide ? <StyleGuideCard guide={state.styleGuide} /> : null}
      </div>
    </div>
  );
}

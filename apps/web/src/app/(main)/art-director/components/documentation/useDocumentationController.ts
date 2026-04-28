import { useCallback, useEffect, useState } from "react";

import { fetchArtDirectorJson } from "../../lib/api-client";

import { DEFAULT_BOOK_FORM, DEFAULT_DECISION_FORM } from "./constants";

import type {
  BookFormData,
  DecisionFormData,
  DocumentationExportPayload,
  DocumentationStatePayload,
  ProductionBookState,
  StyleGuideState,
} from "./types";
import type { ApiResponse } from "../../types";

const triggerDownload = (payload: DocumentationExportPayload): void => {
  const blob = new Blob([payload.content], { type: payload.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = payload.filename;
  link.click();
  URL.revokeObjectURL(url);
};

export function useDocumentationController() {
  const [showBookForm, setShowBookForm] = useState(false);
  const [showDecisionForm, setShowDecisionForm] = useState(false);
  const [productionBook, setProductionBook] =
    useState<ProductionBookState | null>(null);
  const [styleGuide, setStyleGuide] = useState<StyleGuideState | null>(null);
  const [decisionsCount, setDecisionsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [bookForm, setBookForm] = useState<BookFormData>(DEFAULT_BOOK_FORM);
  const [decisionForm, setDecisionForm] = useState<DecisionFormData>(
    DEFAULT_DECISION_FORM
  );

  const loadState = useCallback(async () => {
    setError(null);

    try {
      const response = await fetchArtDirectorJson<
        ApiResponse<DocumentationStatePayload>
      >("/documentation/state");
      if (response.success && response.data) {
        setProductionBook(response.data.productionBook);
        setStyleGuide(response.data.styleGuide);
        setDecisionsCount(response.data.decisionsCount);
        return;
      }
      setError(response.error ?? "تعذر تحميل حالة التوثيق الحالية");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "تعذر تحميل حالة التوثيق الحالية";
      setError(message);
    }
  }, []);

  const handleGenerateBook = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetchArtDirectorJson<
        ApiResponse<ProductionBookState>
      >("/documentation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookForm),
      });

      if (response.success && response.data) {
        await loadState();
        setShowBookForm(false);
        setBookForm(DEFAULT_BOOK_FORM);
        setSuccessMessage("تم إنشاء كتاب الإنتاج وتحديث الحالة المخزنة");
      } else {
        setError(response.error ?? "فشل في إنشاء الكتاب");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ أثناء الإنشاء";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [bookForm, loadState]);

  const handleGenerateStyleGuide = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetchArtDirectorJson<ApiResponse<StyleGuideState>>(
        "/documentation/style-guide",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectName:
              productionBook?.title ?? (bookForm.projectName || "مشروع جديد"),
          }),
        }
      );

      if (response.success && response.data) {
        await loadState();
        setSuccessMessage("تم إنشاء دليل الأسلوب وحفظه");
      } else {
        setError(response.error ?? "فشل في إنشاء دليل الأسلوب");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ أثناء الإنشاء";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [bookForm.projectName, loadState, productionBook?.title]);

  const handleLogDecision = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetchArtDirectorJson<ApiResponse>(
        "/documentation/log-decision",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...decisionForm,
            projectName:
              productionBook?.title ??
              (bookForm.projectName ||
                bookForm.projectNameAr ||
                "art-director-default"),
          }),
        }
      );

      if (response.success) {
        setShowDecisionForm(false);
        setDecisionForm(DEFAULT_DECISION_FORM);
        await loadState();
        setSuccessMessage("تم توثيق القرار الإبداعي");
      } else {
        setError(response.error ?? "فشل في توثيق القرار");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "حدث خطأ أثناء التوثيق";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [
    bookForm.projectName,
    bookForm.projectNameAr,
    decisionForm,
    loadState,
    productionBook?.title,
  ]);

  const handleExport = useCallback(
    async (format: "markdown" | "json") => {
      setError(null);
      setSuccessMessage(null);

      try {
        const response = await fetchArtDirectorJson<
          ApiResponse<DocumentationExportPayload>
        >("/documentation/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ format, bookId: productionBook?.id }),
        });

        if (response.success && response.data) {
          triggerDownload(response.data);
          setSuccessMessage(
            `تم تنزيل ملف التوثيق بصيغة ${response.data.format}`
          );
        } else {
          setError(response.error ?? "فشل في التصدير");
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "حدث خطأ أثناء التصدير";
        setError(message);
      }
    },
    [productionBook?.id]
  );

  const handleBookFormChange = useCallback((data: Partial<BookFormData>) => {
    setBookForm((previous) => ({ ...previous, ...data }));
  }, []);

  const handleDecisionFormChange = useCallback(
    (data: Partial<DecisionFormData>) => {
      setDecisionForm((previous) => ({ ...previous, ...data }));
    },
    []
  );

  useEffect(() => {
    void loadState();
  }, [loadState]);

  return {
    state: {
      showBookForm,
      showDecisionForm,
      productionBook,
      styleGuide,
      decisionsCount,
      loading,
      error,
      successMessage,
      bookForm,
      decisionForm,
    },
    actions: {
      setShowBookForm,
      setShowDecisionForm,
      handleGenerateBook,
      handleGenerateStyleGuide,
      handleLogDecision,
      handleExport,
      handleBookFormChange,
      handleDecisionFormChange,
    },
  };
}

/**
 * Encrypted Screenplay Editor
 * محرر السيناريو المشفر
 *
 * يدمج التشفير Zero-Knowledge مع محرر السيناريو
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  saveEncryptedDocument,
  loadEncryptedDocument,
  listEncryptedDocuments,
  deleteEncryptedDocument,
  getKeyManager,
} from "@/lib/crypto";

interface EncryptedEditorProps {
  userId: string;
  docId?: string;
  onSave?: (docId: string) => void;
  onLoad?: (content: string) => void;
  children: (props: EditorChildProps) => React.ReactNode;
}

interface EditorChildProps {
  content: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  onContentChange: (newContent: string) => void;
  onSave: () => Promise<void>;
  onLoad: (docId: string) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
  documents: DocumentMetadata[];
}

interface DocumentMetadata {
  id: string;
  version: number;
  ciphertextSize: number;
  createdAt: string;
  lastModified: string;
}

export function EncryptedScreenplayEditor({
  userId,
  docId,
  onSave,
  onLoad,
  children,
}: EncryptedEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [currentDocId, setCurrentDocId] = useState(docId);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);

  // التحقق من وجود KEK
  useEffect(() => {
    const keyManager = getKeyManager();
    if (!keyManager.hasKEK()) {
      router.push("/login?redirect=editor");
    }
  }, [router]);

  // تحميل المستند عند التهيئة
  useEffect(() => {
    if (currentDocId) {
      handleLoad(currentDocId);
    }
  }, [currentDocId]);

  // تحميل قائمة المستندات
  useEffect(() => {
    loadDocumentsList();
  }, []);

  const loadDocumentsList = async () => {
    const result = await listEncryptedDocuments();
    if (result.success && result.documents) {
      setDocuments(result.documents);
    }
  };

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setError(null);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const result = await saveEncryptedDocument({
        content,
        userId,
        ...(currentDocId ? { docId: currentDocId } : {}),
      });

      if (result.success) {
        if (!currentDocId && result.docId) {
          setCurrentDocId(result.docId);
        }
        await loadDocumentsList();
        onSave?.(result.docId || currentDocId || "");
      } else {
        setError(result.error || "فشل الحفظ");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الحفظ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLoad = async (docIdToLoad: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadEncryptedDocument({
        docId: docIdToLoad,
        userId,
      });

      if (result.success && result.content) {
        setContent(result.content);
        setCurrentDocId(docIdToLoad);
        onLoad?.(result.content);
      } else {
        setError(result.error || "فشل التحميل");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في التحميل");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (docIdToDelete: string) => {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء."
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await deleteEncryptedDocument(docIdToDelete);

      if (result.success) {
        if (currentDocId === docIdToDelete) {
          setContent("");
          setCurrentDocId(undefined);
        }
        await loadDocumentsList();
      } else {
        setError(result.error || "فشل الحذف");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في الحذف");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {children({
        content,
        isLoading,
        isSaving,
        error,
        onContentChange: handleContentChange,
        onSave: handleSave,
        onLoad: handleLoad,
        onDelete: handleDelete,
        documents,
      })}
    </>
  );
}

/**
 * مكون عرض الأخطاء
 */
export function EncryptionError({ error }: { error: string }) {
  return (
    <div
      className="fixed top-4 right-4 bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded shadow-lg z-50"
      role="alert"
      dir="rtl"
    >
      <div className="flex items-center">
        <svg className="w-5 h-5 ml-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-sm font-medium">{error}</p>
      </div>
    </div>
  );
}

/**
 * مكون حالة التشفير/الحفظ
 */
export function EncryptionStatus({
  isLoading,
  isSaving,
}: {
  isLoading: boolean;
  isSaving: boolean;
}) {
  if (!isLoading && !isSaving) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-50 border border-blue-300 text-blue-700 px-4 py-3 rounded shadow-lg z-50 flex items-center">
      <svg
        className="animate-spin h-5 w-5 ml-2"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="text-sm font-medium">
        {isLoading ? "جارٍ فك التشفير..." : "جارٍ الحفظ والتشفير..."}
      </span>
    </div>
  );
}

import { Book, PenTool, Plus } from "lucide-react";

interface DocumentationToolbarProps {
  loading: boolean;
  onCreateBook: () => void;
  onGenerateStyleGuide: () => void;
  onLogDecision: () => void;
}

export function DocumentationToolbar({
  loading,
  onCreateBook,
  onGenerateStyleGuide,
  onLogDecision,
}: DocumentationToolbarProps) {
  return (
    <div className="art-toolbar">
      <button className="art-btn" onClick={onCreateBook} type="button">
        <Book size={18} aria-hidden="true" />
        إنشاء كتاب إنتاج
      </button>
      <button
        className="art-btn art-btn-secondary"
        onClick={onGenerateStyleGuide}
        disabled={loading}
        type="button"
      >
        <PenTool size={18} aria-hidden="true" />
        دليل الأسلوب
      </button>
      <button className="art-btn art-btn-secondary" onClick={onLogDecision} type="button">
        <Plus size={18} aria-hidden="true" />
        توثيق قرار
      </button>
    </div>
  );
}

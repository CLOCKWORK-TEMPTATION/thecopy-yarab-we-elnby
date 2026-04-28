import { Book, Download } from "lucide-react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import type { ProductionBookState } from "./types";

interface ProductionBookCardProps {
  book: ProductionBookState;
  onExport: (format: "markdown" | "json") => void;
}

export function ProductionBookCard({
  book,
  onExport,
}: ProductionBookCardProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
      <div style={{ animation: "fadeIn 0.3s ease-in-out" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <Book
            size={24}
            style={{ color: "var(--art-primary)" }}
            aria-hidden="true"
          />
          <div>
            <h3 style={{ margin: 0 }}>{book.titleAr}</h3>
            <p
              style={{
                color: "var(--art-text-muted)",
                margin: 0,
                fontSize: "14px",
              }}
            >
              {book.title}
            </p>
          </div>
        </div>
        <div style={{ marginBottom: "16px" }}>
          <h4 style={{ marginBottom: "12px" }}>الأقسام:</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {book.sections.map((section, index) => (
              <li
                key={index}
                style={{
                  padding: "8px 12px",
                  background: "rgba(255,255,255,0.05)",
                  borderRadius: "6px",
                  marginBottom: "6px",
                  fontSize: "14px",
                }}
              >
                {section}
              </li>
            ))}
          </ul>
        </div>
        <div
          style={{
            color: "var(--art-text-muted)",
            fontSize: "12px",
            marginBottom: "16px",
          }}
        >
          تاريخ الإنشاء: {new Date(book.createdAt).toLocaleDateString("ar-EG")}
        </div>
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            className="art-btn art-btn-secondary"
            onClick={() => onExport("markdown")}
            aria-label="تصدير بصيغة Markdown"
            type="button"
          >
            <Download size={16} aria-hidden="true" /> Markdown
          </button>
          <button
            className="art-btn art-btn-secondary"
            onClick={() => onExport("json")}
            aria-label="تصدير بصيغة JSON"
            type="button"
          >
            <Download size={16} aria-hidden="true" /> JSON
          </button>
        </div>
      </div>
    </CardSpotlight>
  );
}

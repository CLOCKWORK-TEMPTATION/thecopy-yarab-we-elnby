import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

const shortcuts = [
  {
    category: "التنقل",
    items: [
      { key: "G", description: "العودة للصفحة الرئيسية (Universe Map)" },
      { key: "E", description: "فتح محرر المشاهد" },
      { key: "A", description: "فتح التحليل السباعي" },
      { key: "D", description: "فتح ورشة التطوير" },
      { key: "B", description: "فتح العصف الذهني" },
      { key: "F", description: "فتح مكتبة الأصول" },
    ],
  },
  {
    category: "الأوامر",
    items: [
      { key: "Space", description: "فتح/إغلاق لوحة الأوامر" },
      { key: "Ctrl/Cmd + K", description: "فتح البحث في لوحة الأوامر" },
      { key: "ESC", description: "إغلاق اللوحات المنبثقة" },
    ],
  },
  {
    category: "عام",
    items: [
      { key: "Ctrl/Cmd + S", description: "حفظ المشروع" },
      { key: "Ctrl/Cmd + E", description: "تصدير المشروع" },
      { key: "?", description: "إظهار الاختصارات" },
    ],
  },
];

export function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-3xl max-h-[80vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-[var(--color-panel)] border-[var(--color-surface)]">
              <div className="flex items-center justify-between p-6 border-b border-[var(--color-surface)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--color-surface)] flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-[var(--color-accent)]" />
                  </div>
                  <h2 className="text-[var(--color-text)]" dir="rtl">
                    اختصارات لوحة المفاتيح
                  </h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="text-[var(--color-muted)] hover:bg-[var(--color-surface)]"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6 space-y-8">
                {shortcuts.map((section, idx) => (
                  <div key={idx}>
                    <h3 className="text-[var(--color-text)] mb-4" dir="rtl">
                      {section.category}
                    </h3>
                    <div className="space-y-3">
                      {section.items.map((item, itemIdx) => (
                        <motion.div
                          key={itemIdx}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg hover:bg-[var(--color-surface)] transition-colors"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            delay:
                              (idx * section.items.length + itemIdx) * 0.02,
                          }}
                        >
                          <span
                            className="text-[var(--color-text)] flex-1"
                            dir="rtl"
                          >
                            {item.description}
                          </span>
                          <kbd className="px-3 py-1.5 rounded bg-[var(--color-surface)] border border-[var(--color-muted)]/30 text-[var(--color-text)] min-w-[60px] text-center">
                            {item.key}
                          </kbd>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-[var(--color-surface)] bg-[var(--color-surface)]/50">
                <p className="text-[var(--color-muted)] text-center" dir="rtl">
                  اضغط{" "}
                  <kbd className="px-2 py-1 rounded bg-[var(--color-panel)] border border-[var(--color-muted)]/30 text-[var(--color-text)]">
                    ?
                  </kbd>{" "}
                  في أي وقت لإظهار هذه القائمة
                </p>
              </div>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

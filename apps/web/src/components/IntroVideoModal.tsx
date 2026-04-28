"use client";

import { useEffect, useRef, useCallback } from "react";

interface IntroVideoModalProps {
  open: boolean;
  onClose: () => void;
  videoSrc: string;
  title?: string;
}

export const IntroVideoModal = ({
  open,
  onClose,
  videoSrc,
  title = "فيديو تعريفي",
}: IntroVideoModalProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const handleEscKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleEscKey);
      closeButtonRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscKey);
      document.body.style.overflow = "";
    };
  }, [open, handleEscKey]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="intro-video-title"
    >
      {/* Dark backdrop */}
      <button
        type="button"
        aria-label="إغلاق الفيديو"
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        className="relative z-10 w-[90vw] max-w-4xl bg-black/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
        dir="rtl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2
            id="intro-video-title"
            className="text-lg font-bold text-white/90"
          >
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 active:bg-white/20 transition-colors text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/60"
            aria-label="إغلاق"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Video container */}
        <div className="relative w-full aspect-video bg-black">
          <video
            src={videoSrc}
            controls
            autoPlay
            className="w-full h-full object-contain"
            playsInline
          >
            <track kind="captions" />
            متصفحك لا يدعم تشغيل الفيديو
          </video>
        </div>

        {/* Footer hint */}
        <div className="px-6 py-3 text-center border-t border-white/10">
          <p className="text-xs text-white/50">
            اضغط ESC أو خارج الصندوق للإغلاق
          </p>
        </div>
      </div>
    </div>
  );
};

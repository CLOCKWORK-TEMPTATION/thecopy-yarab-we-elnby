"use client";

import { forwardRef } from "react";

import { logger } from "@/lib/ai/utils/logger";

interface VideoTextMaskProps {
  videoSrc: string;
  text: string;
  className?: string;
}

export const VideoTextMask = forwardRef<HTMLDivElement, VideoTextMaskProps>(
  ({ videoSrc, text, className = "" }, ref) => {
    return (
      <div className={`relative ${className}`}>
        {/* Wrapper للفيديو والماسك معاً - هذا الـ ref للتحريك */}
        <div ref={ref} className="absolute inset-0 w-full h-full">
          {/* الفيديو في الخلف */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 1 }}
            src={videoSrc}
            onError={(e) => {
              logger.error("Video failed to load:", e);
              // Fallback to a solid color background
              e.currentTarget.style.display = "none";
            }}
          />

          {/* Canvas للنص مع تأثير القناع */}
          <canvas
            className="absolute inset-0 w-full h-full"
            style={{ zIndex: 2 }}
            ref={(canvas) => {
              if (!canvas) return;

              const ctx = canvas.getContext("2d");
              if (!ctx) return;

              const updateCanvas = () => {
                const rect = canvas.getBoundingClientRect();
                canvas.width = rect.width;
                canvas.height = rect.height;

                // Fill with white background
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Set text properties
                const fontSize = Math.min(
                  canvas.width * 0.28,
                  canvas.height * 0.4
                );
                ctx.font = `900 ${fontSize}px 'Tajawal', 'Cairo', 'Noto Kufi Arabic', system-ui, sans-serif`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                // Create text mask (black text cuts through white)
                ctx.globalCompositeOperation = "destination-out";
                ctx.fillStyle = "black";
                ctx.fillText(text, canvas.width / 2, canvas.height / 2);
              };

              updateCanvas();
              window.addEventListener("resize", updateCanvas);

              return () => {
                window.removeEventListener("resize", updateCanvas);
              };
            }}
          />
        </div>

        {/* خلفية سوداء احتياطية */}
        <div className="absolute inset-0 -z-10 bg-black" />

        {/* Fallback text if video fails */}
        <div
          className="absolute inset-0 flex items-center justify-center text-white"
          style={{ zIndex: 0 }}
        >
          <h1
            className="text-center m-0 p-0 leading-none opacity-20"
            style={{
              fontSize: "clamp(8rem, 28vw, 40rem)",
              fontWeight: 900,
              fontFamily:
                "'Tajawal', 'Cairo', 'Noto Kufi Arabic', 'system-ui', sans-serif",
              letterSpacing: "-0.08em",
            }}
          >
            {text}
          </h1>
        </div>
      </div>
    );
  }
);

VideoTextMask.displayName = "VideoTextMask";

"use client";

import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";

import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import { useHeroAnimation } from "@/hooks/use-hero-animation";
import images from "@/lib/images";

import { IntroVideoModal } from "./IntroVideoModal";
import { VideoTextMask } from "./VideoTextMask";

import type { ResponsiveConfig } from "@/lib/hero-config";

type HeroCardPosition = ResponsiveConfig["cardPositions"][number];

interface HeroAnimationProps {
  onContinue?: () => void;
}

const HERO_CARD_IMAGE_STYLES: Record<string, CSSProperties> = {
  "/assets/v-shape/V-Shape-3.jpeg": {
    objectFit: "contain",
    backgroundColor: "rgba(5, 5, 5, 0.9)",
  },
};

export const HeroAnimation = ({
  onContinue: _onContinue,
}: HeroAnimationProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [introOpen, setIntroOpen] = useState(false);

  const { responsiveValues } = useHeroAnimation(containerRef, triggerRef);

  if (!responsiveValues) return <div className="min-h-screen bg-black" />;

  const getImage = (index: number) => {
    if (!images || images.length === 0) return "/placeholder.svg";
    return images[index % images.length] ?? "/placeholder.svg";
  };

  return (
    <div
      ref={containerRef}
      className="hero-animation-root bg-black text-white relative overflow-hidden"
      dir="rtl"
    >
      {/* HEADER: STRICTLY "النسخة" CENTERED ONLY - INITIALLY HIDDEN */}
      <div className="fixed top-0 left-0 right-0 z-[9998] h-24 flex justify-center items-center pointer-events-none shadow-[0_4px_20px_rgba(0,0,0,0.9)] bg-black/95 backdrop-blur-md border-b border-white/5 opacity-0 fixed-header">
        <span className="font-bold tracking-[0.25em] text-[22px] text-white/90 font-sans uppercase">
          النسخة
        </span>
      </div>

      <div className="scene-container fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
        {/* Original Unified Entity - Clickable Portal to /ui */}
        <div className="frozen-container relative w-full h-full flex items-center justify-center origin-center pointer-events-none">
          <div
            id="center-unified-entity"
            className="unified-entity relative w-full h-full flex items-center justify-center pointer-events-none"
          >
            {/* V-Shape Container */}
            <div className="v-shape-container absolute top-0 left-0 w-full h-full m-0 p-0">
              <div className="v-shape-cards-layer absolute inset-0">
                {responsiveValues.cardPositions.map((_pos: HeroCardPosition, i: number) => {
                  const centerIndex = Math.floor(
                    responsiveValues.cardPositions.length / 2
                  );
                  const distanceFromCenter = Math.abs(i - centerIndex);
                  const zIndex = 10010 - distanceFromCenter;

                  return (
                    <Link
                      href="/ui"
                      key={`v-card-${i}`}
                      className="phase-3-img hero-vcard absolute origin-center pointer-events-auto cursor-pointer"
                      style={{
                        width: `${responsiveValues.cardWidth}px`,
                        height: `${responsiveValues.cardHeight}px`,
                        zIndex,
                      }}
                    >
                      <div className="card-elite w-full h-full overflow-hidden relative">
                        {(() => {
                          const imageSrc = getImage(i);
                          const imageStyle = HERO_CARD_IMAGE_STYLES[imageSrc];
                          return (
                            <ImageWithFallback
                              src={imageSrc}
                              alt={`Scene ${i}`}
                              className="w-full h-full object-cover"
                              style={imageStyle}
                            />
                          );
                        })()}
                        <div className="hero-card-sheen absolute inset-0 pointer-events-none" />
                      </div>
                    </Link>
                  );
                })}
              </div>

              <div className="main-content-wrapper relative flex flex-col items-center justify-center text-center w-full h-full">
                {/* Main Title: "النسخة" - الكبير دايماً */}
                <div className="text-content-wrapper flex flex-col items-center justify-center w-auto z-30 -ml-0.5 opacity-0">
                  <h1 className="text-main hero-main-title-fixed font-black tracking-tighter leading-tight text-center drop-shadow-2xl">
                    النسخة
                  </h1>
                </div>

                {/* Secondary texts container - Dedication then Slogan */}
                <div className="text-overlay-container absolute inset-0 z-[54] flex flex-col items-center justify-center pointer-events-none">
                  {/* Dedication Text: "اهداء ليسري نصر الله" */}
                  <div className="dedication-wrapper absolute pt-40 mr-32 opacity-0">
                    <p className="unified-text-style">اهداء ليسري نصر الله</p>
                  </div>

                  {/* Phase 5 Text: "بس اصلي" - السلوغن الثانوي بعد الإهداء */}
                  <div className="phase-5-wrapper absolute pt-40 mr-32 opacity-0">
                    <p className="unified-text-style">بس اصلي</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA / UX Hint */}
      <div className="hero-cta fixed bottom-6 left-0 right-0 z-[10020] flex flex-col items-center gap-3 opacity-0 pointer-events-none">
        <button
          onClick={() => setIntroOpen(true)}
          className="pointer-events-auto inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold bg-white/10 hover:bg-white/15 active:bg-white/20 border border-white/15 backdrop-blur-md cursor-pointer transition-colors"
          aria-label="شاهد الفيديو التعريفي"
        >
          اضغط على الفيديو
        </button>
        <div className="text-sm text-white/60 tracking-wider">
          اضغط على الكروت لفتح الأدوات
        </div>
      </div>

      <div
        ref={triggerRef}
        className="h-screen w-full flex flex-col items-center justify-center"
      >
        {/* =========================================
            LAYER 1: INTRO (Video)
           ========================================= */}
        <div className="video-mask-wrapper absolute inset-0 z-[60] bg-white pointer-events-none">
          <VideoTextMask
            videoSrc="https://cdn.pixabay.com/video/2025/11/09/314880.mp4"
            text="النسخة"
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Intro Video Modal */}
      <IntroVideoModal
        open={introOpen}
        onClose={() => setIntroOpen(false)}
        videoSrc="https://cdn.pixabay.com/video/2025/11/09/314880.mp4"
        title="فيديو تعريفي عن النسخة"
      />
    </div>
  );
};

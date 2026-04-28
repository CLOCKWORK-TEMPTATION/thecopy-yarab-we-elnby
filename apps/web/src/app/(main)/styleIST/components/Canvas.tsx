"use client";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import React from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";

import { RotateCcwIcon, ChevronLeftIcon } from "./icons";
import Spinner from "./Spinner";
import { Compare } from "./ui/compare";

interface CanvasProps {
  displayImageUrl: string | null;
  videoUrl?: string | null;
  compareImages?: { left: string; right: string } | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
}

const Canvas: React.FC<CanvasProps> = ({
  displayImageUrl,
  videoUrl,
  compareImages,
  onStartOver,
  isLoading,
  loadingMessage,
}) => {
  // 1. حالة العرض: فيديو (اختبار ضغط)
  if (videoUrl) {
    return (
      <CardSpotlight className="overflow-hidden rounded-[22px] w-full h-full flex items-center justify-center p-4 relative animate-zoom-in bg-black/8">
        <button
          onClick={onStartOver}
          className="absolute top-4 left-4 z-30 flex items-center justify-center text-center bg-white/[0.04] text-white font-bold py-2 px-4 rounded-full text-xs backdrop-blur-xl hover:bg-white/8"
        >
          <ChevronLeftIcon className="w-4 h-4 mr-2" />
          Back to Image
        </button>
        <video
          src={videoUrl}
          controls
          autoPlay
          loop
          className="max-w-full max-h-full rounded-[16px] shadow-2xl border border-white/8"
        >
          <track kind="captions" />
        </video>
      </CardSpotlight>
    );
  }

  // 2. حالة العرض: مقارنة (A/B Testing)
  if (compareImages) {
    return (
      <CardSpotlight className="overflow-hidden rounded-[22px] w-full h-full flex flex-col items-center justify-center p-4 relative animate-fade-in">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/14 text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest z-30 shadow-lg border border-white/8">
          A/B Comparison Mode
        </div>
        <Compare
          firstImage={compareImages.left}
          secondImage={compareImages.right}
          className="w-full h-full max-w-3xl max-h-[80vh] rounded-[16px] shadow-2xl border border-white/8"
          slideMode="drag"
        />
        <div className="mt-4 flex gap-8 text-xs font-bold uppercase tracking-widest text-white/45">
          <span>Left: Previous Design</span>
          <span>Right: Current Simulation</span>
        </div>
      </CardSpotlight>
    );
  }

  // 3. حالة العرض: صورة عادية (Standard Fit)
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] w-full h-full flex items-center justify-center p-4 relative animate-zoom-in group bg-black/8">
      {/* CSS Animation for Scanning Effect defined inline for scope */}
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      {/* Start Over Button */}
      <button
        onClick={onStartOver}
        className="absolute top-4 left-4 z-30 flex items-center justify-center text-center bg-white/[0.04] border border-white/8 text-white font-semibold py-2 px-4 rounded-full transition-all duration-200 ease-in-out hover:bg-white/8 hover:border-white/12 active:scale-95 text-sm backdrop-blur-xl"
      >
        <RotateCcwIcon className="w-4 h-4 mr-2" />
        Start Over
      </button>

      {/* Image Display or Placeholder */}
      <div className="relative w-full h-full flex items-center justify-center">
        {displayImageUrl ? (
          <Image
            key={displayImageUrl} // Use key to force re-render
            src={displayImageUrl}
            alt="Virtual try-on model"
            fill
            sizes="100vw"
            unoptimized
            className="object-contain transition-opacity duration-500 animate-fade-in rounded-lg shadow-md"
          />
        ) : (
          <div className="w-[400px] h-[600px] bg-white/6 border border-white/8 rounded-[16px] flex flex-col items-center justify-center">
            <Spinner />
            <p className="text-md font-serif text-white/68 mt-4">
              Initializing Reality Engine...
            </p>
          </div>
        )}

        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-xl flex flex-col items-center justify-center z-20 rounded-[16px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Spinner />
              {loadingMessage && (
                <p className="text-lg font-serif text-white/85 mt-4 text-center px-4 animate-pulse">
                  {loadingMessage}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Basic Pose Controls (Visual only for now) */}
      {displayImageUrl && !isLoading && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="flex items-center justify-center gap-2 bg-white/[0.04] backdrop-blur-xl rounded-full p-2 border border-white/8 shadow-sm">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/55 px-2">
              Static View
            </span>
          </div>
        </div>
      )}
    </CardSpotlight>
  );
};

export default Canvas;

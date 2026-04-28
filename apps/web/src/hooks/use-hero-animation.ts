"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useState, useLayoutEffect, type RefObject } from "react";

import { heroConfig, type ResponsiveConfig } from "../lib/hero-config";

gsap.registerPlugin(ScrollTrigger);

// Default width used for SSR-safe initial responsive values (desktop breakpoint)
const DEFAULT_DESKTOP_WIDTH = 1280;

export const useHeroAnimation = (
  containerRef: RefObject<HTMLDivElement | null>,
  triggerRef: RefObject<HTMLDivElement | null>
) => {
  // Start with a desktop-default config so the page renders immediately on
  // first paint rather than showing a blank black screen until useEffect fires.
  const [responsiveValues] = useState<ResponsiveConfig>(() =>
    heroConfig.getResponsiveValues(DEFAULT_DESKTOP_WIDTH)
  );

  // Fixed baseline constants for symmetric spacing (unused but kept for future reference)
  // const HEADER_H = 96
  // const SAFE_BOTTOM = 80
  // const SAFE_TOP = HEADER_H + 24

  useLayoutEffect(() => {
    if (!responsiveValues || !containerRef.current || !triggerRef.current)
      return;

    const phase3Images = gsap.utils.toArray<HTMLElement>(".phase-3-img");

    const ctx = gsap.context(() => {
      // Performance optimization: reduce distance and improve scrub for smoothness
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: "+=5200", // reduced - Phase 7 removed, only need through Phase 5
          scrub: 1.2, // improved from 2.5 for faster response
          pin: true,
          anticipatePin: 1,
          id: "hero-scroll",
          invalidateOnRefresh: true, // performance improvement on resize
        },
      });

      // Phase 1: Reveal Video + Show Header - performance optimized
      tl.to(".video-mask-wrapper", {
        scale: 5,
        y: -600,
        opacity: 0,
        duration: 3,
        ease: "power2.inOut",
        pointerEvents: "none",
        // performance optimization: add will-change for animated elements
        willChange: "transform, opacity",
      });

      tl.to(
        ".fixed-header",
        {
          opacity: 1,
          duration: 1.5,
          ease: "power2.inOut",
        },
        "-=2.5"
      );

      // Phase 2: Title + Dedication (CRITICAL FIX: Set initial positions)
      tl.fromTo(
        ".text-content-wrapper",
        { opacity: 0, y: 300, scale: 0.9 },
        {
          opacity: 1,
          y: -240,
          scale: 1,
          duration: 2,
          ease: "power2.out",
          zIndex: 10050,
        },
        "-=1.5"
      );

      tl.fromTo(
        ".dedication-wrapper",
        { opacity: 0, y: 300, scale: 0.95 },
        {
          opacity: 1,
          y: -240,
          scale: 1,
          duration: 2,
          ease: "power2.out",
          zIndex: 10049,
        },
        "-=1.45"
      );

      // CRITICAL FIX: Position .phase-5-wrapper at exact same coordinates as .dedication-wrapper
      tl.set(
        ".phase-5-wrapper",
        {
          y: -240,
          scale: 1,
          opacity: 0,
          zIndex: 10048,
        },
        "<"
      );

      tl.to(
        [".text-content-wrapper", ".dedication-wrapper"],
        {
          y: -240,
          duration: 1,
          ease: "none",
        },
        0.5
      );

      // Phase 3: Card Animation Setup - performance optimized
      // Split into two groups: right group (4 cards) from bottom-right, left group (3 cards) from top-left
      // phase3Images defined in outer scope

      // performance optimization: add will-change for cards
      phase3Images.forEach((img) => {
        gsap.set(img, { willChange: "transform, opacity" });
      });

      // Group A: indices 3-6 (center + right side) — enter from bottom-right
      const rightGroup = phase3Images.slice(3, 7);
      // Group B: indices 0-2 (left side) — enter from top-left
      const leftGroup = phase3Images.slice(0, 3);

      // Right group (4 cards): enter from bottom-right, sweep upward to upper-right area
      rightGroup.forEach((img, i) => {
        const staggerDelay = i * 0.12;

        tl.fromTo(
          img,
          { top: "130%", left: "75%", x: 0, y: 0, rotation: 0, opacity: 0 },
          {
            top: "20%",
            left: "90%",
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            force3D: true,
          },
          2.5 + staggerDelay
        );
      });

      // Left group (3 cards): enter from top-left, sweep downward to lower-left area — same start time
      leftGroup.forEach((img, i) => {
        const staggerDelay = i * 0.12;

        tl.fromTo(
          img,
          { top: "-40%", left: "20%", x: 0, y: 0, rotation: 0, opacity: 0 },
          {
            top: "80%",
            left: "10%",
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            force3D: true,
          },
          2.5 + staggerDelay
        );
      });

      tl.to(
        ".phase-3-img",
        {
          x: 0,
          y: 0,
          top: (i) =>
            i < responsiveValues.cardPositions.length
              ? (responsiveValues.cardPositions[i]?.top ?? "50%")
              : "100vh",
          left: (i) =>
            i < responsiveValues.cardPositions.length
              ? (responsiveValues.cardPositions[i]?.left ?? "50%")
              : "50%",

          // استخدام الدوران من الكونفيج بدلاً من 0
          rotation: (i) =>
            i < responsiveValues.cardPositions.length
              ? (responsiveValues.cardPositions[i]?.rotation ?? 0)
              : 0,

          scale: responsiveValues.scale,
          opacity: (i) => (i < responsiveValues.cardPositions.length ? 1 : 0),

          // طبقات تراكب مقصودة: الأقرب للمركز + الأسفل (top أكبر) يكون في المقدمة
          zIndex: (i) => {
            const pos = responsiveValues.cardPositions[i];
            if (!pos) return 0;
            const l = Number.parseFloat(String(pos.left).replace("%", ""));
            const t = Number.parseFloat(String(pos.top).replace("%", ""));
            const dist = Math.abs(l - 50); // قربه من المنتصف
            return Math.round((100 - dist) * 10 + t); // قيمة كبيرة = أمام
          },

          duration: 3.3,
          ease: "power3.inOut",
        },
        3.5
      );

      // Phase 5: Crossfade from dedication to slogan "بس اصلي"
      // H1 "النسخة" stays visible throughout - only the secondary text changes
      // Hide dedication text
      tl.to(
        ".dedication-wrapper",
        {
          opacity: 0,
          duration: 0.4,
          ease: "power2.inOut",
        },
        "+=0.4"
      );

      // Show "بس اصلي" slogan immediately after dedication fades
      tl.to(
        ".phase-5-wrapper",
        {
          opacity: 1,
          duration: 0.4,
          ease: "power2.inOut",
        },
        "<+=0.05" // Start almost immediately after dedication starts fading
      );

      // Show CTA after cards are positioned and slogan appears (Portal-ready state)
      tl.to(
        ".hero-cta",
        {
          opacity: 1,
          duration: 0.8,
          ease: "power2.out",
          pointerEvents: "auto",
        },
        "+=0.3" // After Phase 5 transition completes
      );

      // Animation ends here - no Phase 7 Grid transformation
      // User clicks on the V-shape portal to navigate to /ui
    }, containerRef);

    return () => {
      // تحسين تنظيف الذاكرة: إزالة will-change قبل التنظيف
      phase3Images?.forEach((img) => {
        gsap.set(img, { willChange: "auto" });
      });
      gsap.set(".video-mask-wrapper", { willChange: "auto" });

      ctx.revert();
      ScrollTrigger.getById("hero-scroll")?.kill();
      ScrollTrigger.refresh(); // تحديث ScrollTrigger بعد التنظيف
    };
  }, [responsiveValues, containerRef, triggerRef]);

  return { responsiveValues };
};

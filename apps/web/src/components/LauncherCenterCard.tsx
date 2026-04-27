"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ImageWithFallback } from "@/components/figma/ImageWithFallback";
import images from "@/lib/images";

/**
 * Layout normalized حول مركز الكارت:
 * x,y كنسبة من عرض/ارتفاع المشهد (0 = المركز)
 * s = scale multiplier لحجم الكارت
 * r = rotation ش
 * z = zIndex
 */
const CARD_SCALE = 0.82;
const V_LAYOUT = [
  { x: -0.19, y: -0.01, s: CARD_SCALE, r: -7, z: 1 }, // أعلى يسار
  { x: -0.11, y: 0.07, s: CARD_SCALE, r: -4, z: 2 }, // وسط يسار
  { x: -0.03, y: 0.15, s: CARD_SCALE, r: -1, z: 3 }, // أسفل يسار
  { x: 0.05, y: 0.23, s: CARD_SCALE, r: 0, z: 6 }, // المركز
  { x: 0.13, y: 0.15, s: CARD_SCALE, r: 1, z: 3 }, // أسفل يمين
  { x: 0.21, y: 0.07, s: CARD_SCALE, r: 4, z: 2 }, // وسط يمين
  { x: 0.28, y: -0.01, s: CARD_SCALE, r: 7, z: 1 }, // أعلى يمين
];

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const el = ref.current;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    });

    ro.observe(el);
    // init
    const rect = el.getBoundingClientRect();
    setSize({ w: rect.width, h: rect.height });

    return () => ro.disconnect();
  }, []);

  return { ref, size };
}

export default function LauncherCenterCard({
  className,
}: {
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const { ref: sceneRef, size } = useElementSize<HTMLDivElement>();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const router = useRouter();

  const heroImages = useMemo(() => {
    const arr = Array.isArray(images) ? images : [];
    return arr.slice(0, 7);
  }, []);

  const goEditor = () => router.push("/editor");

  // قاعدة حجم الكارت (يتناسب مع مساحة الكارت نفسها)
  const baseW = useMemo(() => {
    const w = size.w || 0;
    const h = size.h || 0;
    if (!w || !h) return 120; // fallback
    // اختر حجمًا مريحًا: نسبة من أصغر بعد
    const m = Math.min(w, h);
    // اجعل القاعدة كبيرة بما يكفي لإظهار الـ V-Shape
    return Math.max(110, Math.min(170, m * 0.22));
  }, [size]);

  // aspect 3/4 => height = width * 4/3
  const aspectH = (w: number) => w * (4 / 3);

  return (
    <button
      type="button"
      onClick={goEditor}
      aria-label="افتح المحرر"
      className={[
        "relative w-full h-full overflow-hidden rounded-2xl",
        "border border-white/15 bg-black",
        "outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        "transition-all duration-300 hover:scale-[1.01] hover:border-[#FFD700]/40",
        "cursor-pointer",
        className ?? "",
      ].join(" ")}
    >
      {/* خلفية Vignette مثل الهيرو */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.08),rgba(0,0,0,0.92)_62%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90" />

      {/* مشهد السبع كروت: طبقة خلفية كاملة */}
      <div ref={sceneRef} className="absolute inset-0 pointer-events-none">
        {/* طبقة لمعة خفيفة */}
        <div className="absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_50%_45%,rgba(255,215,0,0.08),transparent_55%)]" />
        {mounted &&
          heroImages.map((src, i) => {
            const p = V_LAYOUT[i];
            if (!p) return null;

            const w = baseW * p.s;
            const h = aspectH(w);

            const left = `calc(50% + ${p.x * 100}%)`;
            const top = `calc(58% + ${p.y * 100}%)`;

            return (
              <div
                key={`vcard-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left,
                  top,
                  width: w,
                  height: h,
                  transform: `translate(-50%, -50%) rotate(${p.r}deg)`,
                  zIndex: p.z,
                }}
              >
                <div className="relative w-full h-full overflow-hidden rounded-xl">
                  {/* Glow ذهبي */}
                  <div className="absolute inset-0 rounded-xl ring-2 ring-[#FFD700]/55 shadow-[0_0_20px_rgba(255,215,0,0.25)]" />
                  <ImageWithFallback
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                </div>
              </div>
            );
          })}
      </div>

      {/* نصوص مثل “الصورة الثانية” */}
      <div className="relative z-10 h-full w-full">
        {mounted && (
          <div className="absolute top-[clamp(18px,9%,54px)] left-1/2 -translate-x-1/2 text-center px-4">
            <div className="text-[clamp(34px,6vw,92px)] font-black tracking-tighter text-white drop-shadow-[0_12px_30px_rgba(0,0,0,0.75)] leading-none">
              النسخة
            </div>
            <div className="mt-2 md:mt-3 text-[clamp(12px,1.6vw,18px)] text-white/55 font-medium">
              بس اصلي
            </div>
          </div>
        )}

        {/* CTA داخل الكارت */}
        {mounted && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-[#FFD700]/45 bg-white/10 px-6 py-3 text-sm md:text-base font-semibold text-white shadow-[0_10px_25px_rgba(0,0,0,0.55)]">
              افتح المحرر
            </span>
            <div className="mt-2 text-[11px] md:text-xs text-white/45">
              اضغط للدخول مباشرة
            </div>
          </div>
        )}
      </div>
    </button>
  );
}

import React, { useRef, useEffect } from "react";

export interface WaveformDisplayProps {
  data: number[];
  isActive: boolean;
}

export const WaveformDisplay: React.FC<WaveformDisplayProps> = ({
  data,
  isActive,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // مسح الشاشة
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(0, 0, width, height);

    if (!isActive || data.length === 0) {
      // رسم خط مستقيم عند عدم النشاط
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      return;
    }

    // رسم الموجة
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "#3b82f6");
    gradient.addColorStop(0.5, "#8b5cf6");
    gradient.addColorStop(1, "#ec4899");

    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = width / data.length;
    let x = 0;

    for (let i = 0; i < data.length; i++) {
      const dataPoint = data[i] ?? 0;
      const v = dataPoint * 2 + 0.5; // تطبيع البيانات
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // إضافة تأثير التوهج
    ctx.shadowColor = "#8b5cf6";
    ctx.shadowBlur = 10;
    ctx.stroke();
  }, [data, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={100}
      className="w-full rounded-lg border border-white/8"
    />
  );
};

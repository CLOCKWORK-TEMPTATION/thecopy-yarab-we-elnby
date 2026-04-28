import React, { useRef, useEffect } from "react";

export interface FrequencyDisplayProps {
  data: number[];
  isActive: boolean;
}

export const FrequencyDisplay: React.FC<FrequencyDisplayProps> = ({
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

    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, width, height);

    if (!isActive || data.length === 0) return;

    const barWidth = (width / data.length) * 2.5;
    let barHeight;
    let x = 0;

    for (const dataPoint of data) {
      barHeight = dataPoint * height;

      const gradient = ctx.createLinearGradient(
        0,
        height,
        0,
        height - barHeight
      );
      gradient.addColorStop(0, "#3b82f6");
      gradient.addColorStop(1, "#ec4899");

      ctx.fillStyle = gradient;
      ctx.fillRect(x, height - barHeight, barWidth, barHeight);

      x += barWidth + 1;
    }
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

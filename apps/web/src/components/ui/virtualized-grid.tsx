"use client";

import React, { useRef, useEffect, useState } from "react";

interface VirtualizedGridProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  columnCount?: number;
  itemHeight?: number;
  itemWidth?: number;
  gap?: number;
  className?: string;
  overscanRowCount?: number;
}

export function VirtualizedGrid<T>({
  items,
  renderItem,
  columnCount = 3,
  itemHeight = 400,
  itemWidth = 350,
  gap = 16,
  className = "",
  overscanRowCount: _overscanRowCount = 2,
}: VirtualizedGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: 1200,
    height: 800,
  });

  // Calculate responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Simple grid rendering (fallback without react-window for now)
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: dimensions.height }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columnCount}, ${itemWidth}px)`,
          gap: `${gap}px`,
          padding: `${gap}px`,
        }}
      >
        {items.map((item, index) => (
          <div key={index} style={{ height: itemHeight }}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

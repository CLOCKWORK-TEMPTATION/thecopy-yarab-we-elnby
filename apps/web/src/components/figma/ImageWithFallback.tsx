"use client";

import Image from "next/image";
import { useState } from "react";

import type React from "react";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg==";

export function ImageWithFallback(
  props: React.ImgHTMLAttributes<HTMLImageElement>
) {
  const [didError, setDidError] = useState(false);

  const handleError = () => {
    setDidError(true);
  };

  const { src, alt = "", style, className, width, height, onLoad } = props;
  const imageWidth = typeof width === "number" ? width : 88;
  const imageHeight = typeof height === "number" ? height : 88;

  if (didError) {
    return (
      <div
        className={`inline-block bg-muted text-center align-middle ${className ?? ""}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          <Image
            src={ERROR_IMG_SRC}
            alt=""
            width={imageWidth}
            height={imageHeight}
            unoptimized
            data-original-url={src}
          />
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src ?? "/placeholder.svg"}
      alt={alt}
      width={imageWidth}
      height={imageHeight}
      unoptimized
      className={className}
      style={style}
      onError={handleError}
      onLoad={onLoad}
    />
  );
}

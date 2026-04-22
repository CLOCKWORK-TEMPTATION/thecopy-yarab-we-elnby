"use client";

import React, { useState, useCallback } from "react";
import Image, { ImageProps } from "next/image";

export interface ImageWithFallbackProps extends Omit<ImageProps, "src"> {
  src: string;
  fallbackSrc?: string;
  fallbackClassName?: string;
}

const ImageWithFallback = React.forwardRef<
  HTMLImageElement,
  ImageWithFallbackProps
>(
  (
    {
      src,
      fallbackSrc = "/images/fallback.jpg",
      fallbackClassName,
      onError,
      className,
      alt,
      ...props
    },
    ref
  ) => {
    const [currentSrc, setCurrentSrc] = useState(src);
    const [hasTriedFallback, setHasTriedFallback] = useState(false);
    const [isUsingFallback, setIsUsingFallback] = useState(false);
    const resolvedClassName = isUsingFallback
      ? [className, fallbackClassName].filter(Boolean).join(" ")
      : className;

    const handleError = useCallback(
      (error: React.SyntheticEvent<HTMLImageElement, Event>): void => {
        // إذا لم نكن قد جربنا fallback بعد، جربه
        if (!hasTriedFallback && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
          setHasTriedFallback(true);
          setIsUsingFallback(true);
        } else {
          // إذا فشل fallback أيضاً، استدعي onError الأصلي
          onError?.(error);
        }
      },
      [currentSrc, fallbackSrc, hasTriedFallback, onError]
    );

    const handleLoad = useCallback(
      (event: React.SyntheticEvent<HTMLImageElement, Event>): void => {
        // إذا تم تحميل الصورة بنجاح وأصبحنا نستخدم fallback، ذلك يعني أن fallback نجح
        if (isUsingFallback) {
          // سيتم التعامل مع هذا كما لو أن الصورة تحملت بنجاح
        }
        // استدعي onLoad الأصلي إذا كان موجوداً
        if (props.onLoad) {
          props.onLoad(event);
        }
      },
      [isUsingFallback, props.onLoad]
    );

    return (
      <Image
        ref={ref}
        src={currentSrc}
        alt={alt}
        className={resolvedClassName}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
    );
  }
);

ImageWithFallback.displayName = "ImageWithFallback";

export { ImageWithFallback };

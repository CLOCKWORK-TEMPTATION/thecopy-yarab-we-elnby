"use client";
import { motion } from "motion/react";
import React, { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Direction = "TOP" | "LEFT" | "BOTTOM" | "RIGHT";

type HoverBorderGradientProps = {
  as?: React.ElementType;
  children?: React.ReactNode;
  containerClassName?: string;
  className?: string;
  duration?: number;
  clockwise?: boolean;
} & Record<string, unknown>;

export function HoverBorderGradient({
  children,
  containerClassName,
  className,
  as,
  duration = 6,
  clockwise = true,
  ...props
}: HoverBorderGradientProps) {
  const Tag = as ?? "button";
  const tagProps = props as React.HTMLAttributes<HTMLElement>;
  const [hovered, setHovered] = useState<boolean>(false);
  const [direction, setDirection] = useState<Direction>("TOP");
  const handleMouseEnter = tagProps.onMouseEnter;
  const handleMouseLeave = tagProps.onMouseLeave;

  const rotateDirection = useCallback(
    (currentDirection: Direction): Direction => {
      const directions: Direction[] = ["TOP", "LEFT", "BOTTOM", "RIGHT"];
      const currentIndex = directions.indexOf(currentDirection);
      const nextIndex = clockwise
        ? (currentIndex - 1 + directions.length) % directions.length
        : (currentIndex + 1) % directions.length;
      return directions[nextIndex] ?? "TOP";
    },
    [clockwise]
  );

  const movingMap: Record<Direction, string> = {
    TOP: "radial-gradient(20.7% 50% at 50% 0%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%)",
    LEFT: "radial-gradient(16.6% 43.1% at 0% 50%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%)",
    BOTTOM:
      "radial-gradient(20.7% 50% at 50% 100%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%)",
    RIGHT:
      "radial-gradient(16.2% 41.199999999999996% at 100% 50%, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0) 100%)",
  };

  const highlight =
    "radial-gradient(75% 181.15942028985506% at 50% 50%, rgba(2, 151, 132, 0.72) 0%, rgba(255, 255, 255, 0) 100%)";

  useEffect(() => {
    if (hovered) return;

    const interval = window.setInterval(() => {
      setDirection((prevState) => rotateDirection(prevState));
    }, duration * 1000);

    return () => window.clearInterval(interval);
  }, [hovered, duration, rotateDirection]);

  const content = [
    <div
      key="hover-border-gradient-content"
      className={cn(
        "relative z-30 w-auto rounded-[inherit] bg-transparent text-current",
        className
      )}
    >
      {children}
    </div>,
    <motion.div
      key="hover-border-gradient-motion"
      className={cn(
        "pointer-events-none absolute inset-0 z-0 flex-none overflow-hidden rounded-[inherit]"
      )}
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        padding: "1px",
        WebkitMask:
          "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
      }}
      initial={{ background: movingMap[direction] }}
      animate={{
        background: hovered
          ? [movingMap[direction], highlight]
          : movingMap[direction],
      }}
      transition={{ ease: "linear", duration: duration ?? 1 }}
    />,
    <div
      key="hover-border-gradient-overlay"
      className="pointer-events-none absolute inset-[2px] z-10 flex-none rounded-[100px] bg-transparent"
    />,
  ];

  return React.createElement(
    Tag,
    {
      ...tagProps,
      onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
        setHovered(true);
        handleMouseEnter?.(event);
      },
      onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
        setHovered(false);
        handleMouseLeave?.(event);
      },
      className: cn(
        "relative flex h-min w-fit flex-col flex-nowrap content-center items-center justify-center gap-10 overflow-visible rounded-full border bg-transparent p-px decoration-clone transition duration-500",
        containerClassName
      ),
    },
    ...content
  );
}

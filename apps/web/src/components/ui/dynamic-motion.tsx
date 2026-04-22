"use client";

/**
 * Dynamic Framer Motion Components with Code Splitting
 *
 * This file provides lazy-loaded framer-motion components to reduce initial bundle size.
 * The framer-motion library (~200KB) is only loaded when animations are actually used.
 *
 * Features:
 * - Lazy loading with next/dynamic
 * - Type-safe exports
 * - Graceful fallback for loading state
 * - SSR support
 *
 * Usage:
 * ```tsx
 * import { DynamicMotionDiv, DynamicMotionSpan } from '@/components/ui/dynamic-motion';
 *
 * <DynamicMotionDiv
 *   initial={{ opacity: 0 }}
 *   animate={{ opacity: 1 }}
 * >
 *   Content
 * </DynamicMotionDiv>
 * ```
 */

import dynamic from "next/dynamic";
import type { HTMLMotionProps } from "framer-motion";
import type { ComponentType, ReactNode } from "react";

interface LoadingProps {
  children?: ReactNode;
  className?: string;
}

// Simple loading component that renders children immediately
const MotionLoading = ({ children, className }: LoadingProps) => (
  <div className={className}>{children}</div>
);

const SpanLoading = ({ children, className }: LoadingProps) => (
  <span className={className}>{children}</span>
);

// Dynamically import motion components
export const DynamicMotionDiv = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.div) as Promise<
      ComponentType<HTMLMotionProps<"div">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionSpan = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.span) as Promise<
      ComponentType<HTMLMotionProps<"span">>
    >,
  {
    loading: () => <SpanLoading />,
    ssr: true,
  }
);

export const DynamicMotionButton = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.button) as Promise<
      ComponentType<HTMLMotionProps<"button">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionSection = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.section) as Promise<
      ComponentType<HTMLMotionProps<"section">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionArticle = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.article) as Promise<
      ComponentType<HTMLMotionProps<"article">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionNav = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.nav) as Promise<
      ComponentType<HTMLMotionProps<"nav">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionHeader = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.header) as Promise<
      ComponentType<HTMLMotionProps<"header">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionFooter = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.footer) as Promise<
      ComponentType<HTMLMotionProps<"footer">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionLi = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.li) as Promise<
      ComponentType<HTMLMotionProps<"li">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionUl = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.ul) as Promise<
      ComponentType<HTMLMotionProps<"ul">>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionPath = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.path) as Promise<
      ComponentType<any>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

export const DynamicMotionSvg = dynamic(
  () =>
    import("framer-motion").then((mod) => mod.motion.svg) as Promise<
      ComponentType<any>
    >,
  {
    loading: () => <MotionLoading />,
    ssr: true,
  }
);

// Export AnimatePresence with dynamic import
export const DynamicAnimatePresence = dynamic(
  () =>
    import("framer-motion").then((mod) => ({ default: mod.AnimatePresence })),
  { ssr: true }
);

// Export useAnimation hook with dynamic import
export const useDynamicAnimation = () => {
  // This will be tree-shaken if not used
  return import("framer-motion").then((mod) => mod.useAnimation);
};

// Export other commonly used hooks
export const useDynamicScroll = () => {
  return import("framer-motion").then((mod) => mod.useScroll);
};

export const useDynamicTransform = () => {
  return import("framer-motion").then((mod) => mod.useTransform);
};

export const useDynamicSpring = () => {
  return import("framer-motion").then((mod) => mod.useSpring);
};

export const useDynamicInView = () => {
  return import("framer-motion").then((mod) => mod.useInView);
};

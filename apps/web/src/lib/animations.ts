import { logger } from "@/lib/ai/utils/logger";

/**
 * Animation Utilities
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Provides utilities for modern CSS animations including:
 * - Scroll-driven animations
 * - View transitions
 * - Micro-interactions
 * - Spring physics
 */

/**
 * Scroll-driven animation configuration
 */
export interface ScrollAnimationConfig {
  start?: string;
  end?: string;
  axis?: "block" | "inline" | "x" | "y";
}

/**
 * Creates a scroll-driven animation
 * Uses CSS scroll-driven animations API
 */
export function createScrollAnimation(
  element: HTMLElement,
  keyframes: Keyframe[],
  config: ScrollAnimationConfig = {}
): Animation | null {
  if (!element || typeof window === "undefined") return null;

  try {
    // Check if ScrollTimeline is available
    if (typeof (window as any).ScrollTimeline === "undefined") {
      logger.warn("Scroll-driven animations not supported");
      return null;
    }

    const ScrollTimelineConstructor = (window as any).ScrollTimeline;
    const animation = element.animate(keyframes, {
      timeline: new ScrollTimelineConstructor({
        source: document.documentElement,
        axis: config.axis ?? "block",
      }),
      fill: "both",
    });

    return animation;
  } catch (error) {
    // Fallback for browsers without scroll-driven animations
    logger.warn("Scroll-driven animations not supported", error);
    return null;
  }
}

/**
 * Fade in on scroll
 */
export function fadeInOnScroll(element: HTMLElement): Animation | null {
  return createScrollAnimation(element, [
    { opacity: 0, transform: "translateY(20px)" },
    { opacity: 1, transform: "translateY(0)" },
  ]);
}

/**
 * Scale on scroll
 */
export function scaleOnScroll(
  element: HTMLElement,
  from = 0.8,
  to = 1
): Animation | null {
  return createScrollAnimation(element, [
    { transform: `scale(${from})` },
    { transform: `scale(${to})` },
  ]);
}

/**
 * Parallax effect
 */
export function parallaxEffect(
  element: HTMLElement,
  speed = 0.5
): Animation | null {
  return createScrollAnimation(element, [
    { transform: `translateY(0)` },
    { transform: `translateY(${speed * 100}%)` },
  ]);
}

/**
 * Spring animation presets
 * For use with Framer Motion
 */
export const springPresets = {
  gentle: {
    type: "spring" as const,
    stiffness: 120,
    damping: 14,
  },
  wobbly: {
    type: "spring" as const,
    stiffness: 180,
    damping: 12,
  },
  stiff: {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
  },
  slow: {
    type: "spring" as const,
    stiffness: 80,
    damping: 20,
  },
  bouncy: {
    type: "spring" as const,
    stiffness: 300,
    damping: 10,
    mass: 0.8,
  },
};

/**
 * Easing functions
 */
export const easings = {
  default: [0.4, 0.0, 0.2, 1],
  spring: [0.175, 0.885, 0.32, 1.275],
  easeInOut: [0.65, 0, 0.35, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  sharp: [0.4, 0, 0.6, 1],
};

/**
 * Duration presets (in milliseconds)
 */
export const durations = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
};

/**
 * Stagger animation helper
 * For animating lists with delay
 */
export function staggerAnimation(
  delay = 0.1,
  staggerChildren = 0.05
) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        delay,
        staggerChildren,
      },
    },
  };
}

/**
 * Micro-interaction variants
 * Common animation patterns for UI elements
 */
export const microInteractions = {
  tap: {
    scale: 0.95,
    transition: { duration: 0.1 },
  },
  hover: {
    scale: 1.05,
    transition: { duration: 0.2 },
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  shake: {
    x: [-10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
  bounce: {
    y: [0, -10, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
  glow: {
    boxShadow: [
      "0 0 0 0 rgba(var(--primary-rgb), 0)",
      "0 0 0 10px rgba(var(--primary-rgb), 0.3)",
      "0 0 0 0 rgba(var(--primary-rgb), 0)",
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
    },
  },
};

/**
 * Page transition variants
 */
export const pageTransitions = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  },
  slideRight: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
  },
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.95, opacity: 0 },
  },
};

/**
 * Particle effect configuration
 */
export interface ParticleConfig {
  count: number;
  colors: string[];
  size: { min: number; max: number };
  speed: { min: number; max: number };
  lifetime: { min: number; max: number };
}

/**
 * Generate particle burst effect
 * Returns array of particle configurations
 */
export function generateParticleBurst(
  x: number,
  y: number,
  config: Partial<ParticleConfig> = {}
): {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifetime: number;
}[] {
  const {
    count = 20,
    colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A"],
    size = { min: 2, max: 6 },
    speed = { min: 1, max: 3 },
    lifetime = { min: 500, max: 1500 },
  } = config;

  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed.min + Math.random() * (speed.max - speed.min);
    const colorIndex = Math.floor(Math.random() * colors.length);
    const selectedColor = colors[colorIndex];

    return {
      x,
      y,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      color: selectedColor ?? "#FF6B6B",
      size: size.min + Math.random() * (size.max - size.min),
      lifetime: lifetime.min + Math.random() * (lifetime.max - lifetime.min),
    };
  });
}

/**
 * Intersection Observer hook helper
 * For triggering animations when elements enter viewport
 */
export function createIntersectionObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: IntersectionObserverInit = {}
): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      entries.forEach(callback);
    },
    {
      threshold: 0.1,
      ...options,
    }
  );
}

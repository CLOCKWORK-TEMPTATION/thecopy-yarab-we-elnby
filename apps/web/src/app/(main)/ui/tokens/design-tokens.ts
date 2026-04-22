/**
 * Design Tokens from Figma Design System
 *
 * This file contains all design tokens extracted from the Figma design system.
 * These tokens are used throughout the application to maintain visual consistency.
 *
 * Source: https://www.figma.com/design/tTX3qogmlIZrAwMKCsURlM/Design-System-Documentation
 */

export const designTokens = {
  /**
   * Colors - Dark theme (primary)
   */
  colors: {
    bg: "#0F1115",
    panel: "#171A20",
    surface: "#1E2230",
    text: "#E6EAF2",
    muted: "#98A2B3",
    accent: "#8A9BFF",
    accentWeak: "#C9D1FF",
  },

  /**
   * State colors
   */
  stateColors: {
    draft: "#6B7280",
    final: "#10B981",
    alt: "#F59E0B",
    flagged: "#EF4444",
  },

  /**
   * Typography
   */
  typography: {
    fontSize: {
      xs: "0.75rem", // 12px
      sm: "0.875rem", // 14px
      base: "1rem", // 16px
      lg: "1.125rem", // 18px
      xl: "1.25rem", // 20px
      "2xl": "1.5rem", // 24px
      "3xl": "1.875rem", // 30px
      "4xl": "2.25rem", // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },

  /**
   * Spacing scale (4px base)
   */
  spacing: {
    0: "0",
    1: "0.25rem", // 4px
    2: "0.5rem", // 8px
    3: "0.75rem", // 12px
    4: "1rem", // 16px
    5: "1.25rem", // 20px
    6: "1.5rem", // 24px
    8: "2rem", // 32px
    10: "2.5rem", // 40px
    12: "3rem", // 48px
    16: "4rem", // 64px
    20: "5rem", // 80px
    24: "6rem", // 96px
  },

  /**
   * Border Radius
   */
  borderRadius: {
    sm: "0.25rem", // 4px
    md: "0.5rem", // 8px
    lg: "0.75rem", // 12px
    xl: "1rem", // 16px
    "2xl": "1.25rem", // 20px
    full: "9999px",
  },

  /**
   * Elevation (Shadows)
   */
  elevation: {
    0: "none",
    1: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
    2: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
    3: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    4: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    5: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
  },

  /**
   * Animation
   */
  animation: {
    duration: {
      fast: "150ms",
      normal: "200ms",
      medium: "300ms",
      slow: "500ms",
    },
    easing: {
      easeIn: "cubic-bezier(0.4, 0, 1, 1)",
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
      easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },

  /**
   * Z-Index Scale
   */
  zIndex: {
    base: 1,
    header: 100,
    dropdown: 800,
    overlay: 900,
    modal: 1000,
  },

  /**
   * Breakpoints for responsive design
   */
  breakpoints: {
    mobile: "390px", // Mobile (iPhone standard)
    tablet: "1024px", // Tablet (iPad Pro portrait)
    desktop: "1280px", // Desktop (Secondary)
    desktopLg: "1440px", // Desktop (Primary)
  },
} as const;

/**
 * Type exports for TypeScript support
 */
export type DesignTokens = typeof designTokens;
export type ColorToken = keyof typeof designTokens.colors;
export type StateColorToken = keyof typeof designTokens.stateColors;
export type SpacingToken = keyof typeof designTokens.spacing;
export type BorderRadiusToken = keyof typeof designTokens.borderRadius;

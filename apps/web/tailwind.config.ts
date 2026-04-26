import tailwindAnimate from "tailwindcss-animate";

import type { Config } from "tailwindcss";

/**
 * UI Design System - December 2025
 * Based on UI_DESIGN_SUGGESTIONS.md
 * Features: OKLCH colors, modern animations, RTL support
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // === Font Families ===
      fontFamily: {
        // Cairo هو الخط الوحيد المستخدم في التطبيق
        // var(--font-cairo) is injected by next/font/google at build time
        sans: [
          "var(--font-cairo)",
          "Cairo",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        cairo: [
          "var(--font-cairo)",
          "Cairo",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["IBM Plex Mono", "Courier New", "monospace"],
      },
      // === Font Sizes (1.25 ratio scale) ===
      fontSize: {
        "2xs": ["var(--text-xs)", { lineHeight: "1.4" }],
        xs: ["var(--text-sm)", { lineHeight: "1.4" }],
        sm: ["var(--text-base)", { lineHeight: "1.5" }],
        base: ["var(--text-lg)", { lineHeight: "1.6" }],
        lg: ["var(--text-xl)", { lineHeight: "1.5" }],
        xl: ["var(--text-2xl)", { lineHeight: "1.4" }],
        "2xl": ["var(--text-3xl)", { lineHeight: "1.3" }],
        "3xl": ["var(--text-4xl)", { lineHeight: "1.2" }],
      },
      // === Colors (OKLCH via CSS Variables) ===
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
          creative: "var(--accent-creative)",
          technical: "var(--accent-technical)",
          success: "var(--accent-success)",
          warning: "var(--accent-warning)",
          error: "var(--accent-error)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        brand: {
          DEFAULT: "var(--brand)",
          foreground: "var(--brand-foreground)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
      },
      // === Spacing (8px base scale) ===
      spacing: {
        "4.5": "1.125rem", // 18px
        "5.5": "1.375rem", // 22px
        "18": "4.5rem", // 72px
        "22": "5.5rem", // 88px
      },
      // === Border Radius ===
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-lg)",
        "2xl": "var(--radius-xl)",
      },
      // === Box Shadow ===
      boxShadow: {
        glow: "0 0 20px var(--brand)",
        "glow-lg": "0 0 40px var(--brand)",
        elevated: "0 12px 40px -12px rgba(0, 0, 0, 0.2)",
        "card-hover": "0 20px 50px -15px rgba(0, 0, 0, 0.25)",
      },
      // === Backdrop Blur ===
      backdropBlur: {
        xs: "2px",
      },
      // === Keyframe Animations ===
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-out": {
          from: { opacity: "1" },
          to: { opacity: "0" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-up": {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-down": {
          from: { transform: "translateY(-20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.95)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        bounce: {
          "0%, 100%": {
            transform: "translateY(-5%)",
            animationTimingFunction: "cubic-bezier(0.8, 0, 1, 1)",
          },
          "50%": {
            transform: "translateY(0)",
            animationTimingFunction: "cubic-bezier(0, 0, 0.2, 1)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px var(--brand)" },
          "50%": { boxShadow: "0 0 40px var(--brand)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        wiggle: {
          "0%, 100%": { transform: "rotate(-3deg)" },
          "50%": { transform: "rotate(3deg)" },
        },
      },
      // === Animation Utilities ===
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in var(--duration-normal) var(--easing-default)",
        "fade-out": "fade-out var(--duration-normal) var(--easing-default)",
        "slide-in-right":
          "slide-in-right var(--duration-normal) var(--easing-default)",
        "slide-in-left":
          "slide-in-left var(--duration-normal) var(--easing-default)",
        "slide-in-up":
          "slide-in-up var(--duration-normal) var(--easing-default)",
        "slide-in-down":
          "slide-in-down var(--duration-normal) var(--easing-default)",
        "scale-in": "scale-in var(--duration-fast) var(--easing-spring)",
        "scale-out": "scale-out var(--duration-fast) var(--easing-default)",
        spin: "spin 1s linear infinite",
        pulse: "pulse 2s ease-in-out infinite",
        bounce: "bounce 1s infinite",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        wiggle: "wiggle 0.3s ease-in-out",
      },
      // === Transition Duration ===
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
      },
      // === Transition Timing Function ===
      transitionTimingFunction: {
        default: "var(--easing-default)",
        spring: "var(--easing-spring)",
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;

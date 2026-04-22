/**
 * Design Tokens from Figma Design System
 *
 * This file contains all design tokens extracted from the Figma design system.
 * These tokens are used throughout the application to maintain visual consistency.
 *
 * Source: https://www.figma.com/design/tTX3qogmlIZrAwMKCsURlM/Design-System-Documentation
 */
export declare const designTokens: {
    /**
     * Colors - Dark theme (primary)
     */
    readonly colors: {
        readonly bg: "#0F1115";
        readonly panel: "#171A20";
        readonly surface: "#1E2230";
        readonly text: "#E6EAF2";
        readonly muted: "#98A2B3";
        readonly accent: "#8A9BFF";
        readonly accentWeak: "#C9D1FF";
    };
    /**
     * State colors
     */
    readonly stateColors: {
        readonly draft: "#6B7280";
        readonly final: "#10B981";
        readonly alt: "#F59E0B";
        readonly flagged: "#EF4444";
    };
    /**
     * Typography
     */
    readonly typography: {
        readonly fontSize: {
            readonly xs: "0.75rem";
            readonly sm: "0.875rem";
            readonly base: "1rem";
            readonly lg: "1.125rem";
            readonly xl: "1.25rem";
            readonly "2xl": "1.5rem";
            readonly "3xl": "1.875rem";
            readonly "4xl": "2.25rem";
        };
        readonly fontWeight: {
            readonly normal: 400;
            readonly medium: 500;
            readonly semibold: 600;
            readonly bold: 700;
        };
        readonly lineHeight: {
            readonly tight: 1.25;
            readonly normal: 1.5;
            readonly relaxed: 1.75;
        };
    };
    /**
     * Spacing scale (4px base)
     */
    readonly spacing: {
        readonly 0: "0";
        readonly 1: "0.25rem";
        readonly 2: "0.5rem";
        readonly 3: "0.75rem";
        readonly 4: "1rem";
        readonly 5: "1.25rem";
        readonly 6: "1.5rem";
        readonly 8: "2rem";
        readonly 10: "2.5rem";
        readonly 12: "3rem";
        readonly 16: "4rem";
        readonly 20: "5rem";
        readonly 24: "6rem";
    };
    /**
     * Border Radius
     */
    readonly borderRadius: {
        readonly sm: "0.25rem";
        readonly md: "0.5rem";
        readonly lg: "0.75rem";
        readonly xl: "1rem";
        readonly "2xl": "1.25rem";
        readonly full: "9999px";
    };
    /**
     * Elevation (Shadows)
     */
    readonly elevation: {
        readonly 0: "none";
        readonly 1: "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
        readonly 2: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)";
        readonly 3: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
        readonly 4: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
        readonly 5: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)";
    };
    /**
     * Animation
     */
    readonly animation: {
        readonly duration: {
            readonly fast: "150ms";
            readonly normal: "200ms";
            readonly medium: "300ms";
            readonly slow: "500ms";
        };
        readonly easing: {
            readonly easeIn: "cubic-bezier(0.4, 0, 1, 1)";
            readonly easeOut: "cubic-bezier(0, 0, 0.2, 1)";
            readonly easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)";
        };
    };
    /**
     * Z-Index Scale
     */
    readonly zIndex: {
        readonly base: 1;
        readonly header: 100;
        readonly dropdown: 800;
        readonly overlay: 900;
        readonly modal: 1000;
    };
    /**
     * Breakpoints for responsive design
     */
    readonly breakpoints: {
        readonly mobile: "390px";
        readonly tablet: "1024px";
        readonly desktop: "1280px";
        readonly desktopLg: "1440px";
    };
};
/**
 * Type exports for TypeScript support
 */
export type DesignTokens = typeof designTokens;
export type ColorToken = keyof typeof designTokens.colors;
export type StateColorToken = keyof typeof designTokens.stateColors;
export type SpacingToken = keyof typeof designTokens.spacing;
export type BorderRadiusToken = keyof typeof designTokens.borderRadius;
//# sourceMappingURL=design-tokens.d.ts.map
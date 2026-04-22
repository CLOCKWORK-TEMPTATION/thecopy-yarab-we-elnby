/**
 * Figma Design System - Main Export
 *
 * This file exports all components, pages, and tokens from the Figma design system.
 *
 * Source: https://www.figma.com/design/tTX3qogmlIZrAwMKCsURlM/Design-System-Documentation
 * Repository: https://github.com/mohamedrano/Design-System-Documentation-2-
 */

// Components
export * from "./components";

// Pages
export * from "./pages";

// Design Tokens
export { designTokens } from "./tokens/design-tokens";
export type {
  DesignTokens,
  ColorToken,
  StateColorToken,
  SpacingToken,
  BorderRadiusToken,
} from "./tokens/design-tokens";

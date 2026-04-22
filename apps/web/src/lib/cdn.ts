/**
 * CDN Asset Helper Utilities
 * ===========================
 * Utilities for managing static assets with CDN support.
 *
 * أدوات مساعدة لإدارة الأصول الثابتة مع دعم CDN
 */

/**
 * Get the CDN URL from environment variables
 * الحصول على رابط CDN من متغيرات البيئة
 */
const CDN_URL = process.env["NEXT_PUBLIC_CDN_URL"] || "";
const ENABLE_CDN = process.env["NEXT_PUBLIC_ENABLE_CDN"] === "true";

/**
 * Get the full URL for a static asset
 * الحصول على الرابط الكامل لأصل ثابت
 *
 * @param path - The path to the asset (e.g., '/images/logo.png')
 * @returns The full URL with CDN prefix if enabled, or the original path
 *
 * @example
 * ```tsx
 * import { getAssetUrl } from '@/lib/cdn';
 *
 * // In a component
 * <img src={getAssetUrl('/images/logo.png')} alt="Logo" />
 * ```
 */
export function getAssetUrl(path: string): string {
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // If CDN is enabled and URL is configured, use CDN
  if (ENABLE_CDN && CDN_URL) {
    // Remove trailing slash from CDN URL if present
    const cdnBase = CDN_URL.endsWith("/") ? CDN_URL.slice(0, -1) : CDN_URL;
    return `${cdnBase}${normalizedPath}`;
  }

  // Otherwise, use local path
  return normalizedPath;
}

/**
 * Get the full URL for a font file
 * الحصول على الرابط الكامل لملف خط
 *
 * @param fontName - The font filename (e.g., 'amiri-400.woff2')
 * @returns The full URL to the font file
 *
 * @example
 * ```tsx
 * import { getFontUrl } from '@/lib/cdn';
 *
 * const fontUrl = getFontUrl('amiri-400.woff2');
 * ```
 */
export function getFontUrl(fontName: string): string {
  return getAssetUrl(`/fonts/${fontName}`);
}

/**
 * Get the full URL for an image file
 * الحصول على الرابط الكامل لملف صورة
 *
 * @param imagePath - The image path relative to /images (e.g., 'fallback.jpg')
 * @returns The full URL to the image file
 *
 * @example
 * ```tsx
 * import { getImageUrl } from '@/lib/cdn';
 *
 * <img src={getImageUrl('fallback.jpg')} alt="Fallback" />
 * ```
 */
export function getImageUrl(imagePath: string): string {
  // If path already starts with /images, use it as is
  if (imagePath.startsWith("/images/")) {
    return getAssetUrl(imagePath);
  }

  // Otherwise, prepend /images/
  return getAssetUrl(`/images/${imagePath}`);
}

/**
 * Get the full URL for a Directors Studio asset
 * الحصول على الرابط الكامل لأصل استوديو المخرجين
 *
 * @param fileName - The filename in /directors-studio directory
 * @returns The full URL to the asset
 *
 * @example
 * ```tsx
 * import { getDirectorsStudioUrl } from '@/lib/cdn';
 *
 * const heroImage = getDirectorsStudioUrl('Film_production_hero_image_6b2179d4.png');
 * ```
 */
export function getDirectorsStudioUrl(fileName: string): string {
  return getAssetUrl(`/directors-studio/${fileName}`);
}

/**
 * Check if CDN is currently enabled
 * التحقق من تفعيل CDN
 *
 * @returns true if CDN is enabled, false otherwise
 */
export function isCdnEnabled(): boolean {
  return ENABLE_CDN && !!CDN_URL;
}

/**
 * Get the current CDN base URL
 * الحصول على رابط CDN الأساسي
 *
 * @returns The CDN base URL or empty string if not configured
 */
export function getCdnBaseUrl(): string {
  return ENABLE_CDN ? CDN_URL : "";
}

/**
 * Preload a static asset (useful for critical resources)
 * تحميل أصل ثابت مسبقاً (مفيد للموارد الحرجة)
 *
 * @param path - The path to the asset
 * @param type - The resource type (image, font, style, script)
 *
 * @example
 * ```tsx
 * import { preloadAsset } from '@/lib/cdn';
 *
 * // In a component or page
 * useEffect(() => {
 *   preloadAsset('/fonts/amiri-400.woff2', 'font');
 * }, []);
 * ```
 */
export function preloadAsset(
  path: string,
  type: "image" | "font" | "style" | "script" = "image"
): void {
  if (typeof document === "undefined") return;

  const url = getAssetUrl(path);
  const link = document.createElement("link");
  link.rel = "preload";
  link.href = url;
  link.as = type;

  // Add crossorigin for fonts
  if (type === "font") {
    link.crossOrigin = "anonymous";
  }

  document.head.appendChild(link);
}

/**
 * Export configuration for debugging
 * تصدير الإعدادات للتشخيص
 */
export const cdnConfig = {
  url: CDN_URL,
  enabled: ENABLE_CDN,
  isActive: isCdnEnabled(),
} as const;

/**
 * خدمة تحسين الخطوط - Font Optimization Service
 * تم توحيد جميع الخطوط لاستخدام Cairo فقط
 */

export interface FontConfig {
  family: string;
  weights: number[];
  styles: ("normal" | "italic")[];
  display: "auto" | "block" | "swap" | "fallback" | "optional";
  preload?: boolean;
}

// الخط الموحد: Cairo فقط
export const FONT_CONFIGS: Record<string, FontConfig> = {
  cairo: {
    family: "Cairo",
    weights: [200, 300, 400, 500, 600, 700, 800, 900, 1000],
    styles: ["normal"],
    display: "swap",
    preload: true,
  },
};

// للتوافق مع الاستخدامات القديمة - جميعها تشير إلى Cairo
export const LEGACY_FONT_CONFIGS = {
  amiri: FONT_CONFIGS.cairo,
  tajawal: FONT_CONFIGS.cairo,
  literata: FONT_CONFIGS.cairo,
  sourceCodePro: FONT_CONFIGS.cairo,
};

/**
 * توليد CSS لتحميل الخط محلياً
 */
export function generateFontFaceCSS(
  config: FontConfig,
  fontBasePath: string = "/fonts"
): string {
  const { family, weights, styles } = config;
  const fontFaces: string[] = [];

  weights.forEach((weight) => {
    styles.forEach((style) => {
      const fontFileName = `${family.toLowerCase().replace(/\s+/g, "-")}-${weight}${style === "italic" ? "-italic" : ""}`;

      fontFaces.push(`
@font-face {
  font-family: '${family}';
  font-style: ${style};
  font-weight: ${weight};
  font-display: ${config.display};
  src: url('${fontBasePath}/${fontFileName}.woff2') format('woff2'),
       url('${fontBasePath}/${fontFileName}.woff') format('woff');
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD, U+0600-06FF, U+200C-200D, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE80-FEFC;
}`);
    });
  });

  return fontFaces.join("\n");
}

/**
 * توليد روابط preload للخطوط الحرجة
 */
export function generatePreloadLinks(): string[] {
  return Object.entries(FONT_CONFIGS)
    .filter(([, config]) => config.preload)
    .flatMap(([, config]) => {
      const primaryWeight = config.weights.includes(400)
        ? 400
        : config.weights[0];
      const fontFileName = `${config.family.toLowerCase().replace(/\s+/g, "-")}-${primaryWeight}`;

      return [
        `<link rel="preload" href="/fonts/${fontFileName}.woff2" as="font" type="font/woff2" crossorigin="anonymous">`,
      ];
    });
}

/**
 * الحصول على fallbacks الخط المحسنة
 */
export function getFontFallbacks(_primaryFont: string): string {
  // Cairo هو الخط الوحيد - استخدام fallbacks موحدة
  return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
}

/**
 * متغيرات CSS للخطوط - موحدة لاستخدام Cairo
 */
export const FONT_CSS_VARIABLES = `
  /* الخط الموحد: Cairo */
  --font-family: 'Cairo', ${getFontFallbacks("Cairo")};
  --font-arabic-primary: 'Cairo', ${getFontFallbacks("Cairo")};
  --font-arabic-modern: 'Cairo', ${getFontFallbacks("Cairo")};
  --font-arabic-clean: 'Cairo', ${getFontFallbacks("Cairo")};
  --font-body: 'Cairo', ${getFontFallbacks("Cairo")};
  --font-headline: 'Cairo', ${getFontFallbacks("Cairo")};
  --font-code: 'Cairo', ${getFontFallbacks("Cairo")};

  /* تحسين تحميل الخط */
  --font-loading-strategy: swap;
` as const;

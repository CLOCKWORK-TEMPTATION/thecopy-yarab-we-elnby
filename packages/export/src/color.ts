// ============================================================================
// تحويل ألوان CSS الحديثة إلى صيغ مدعومة في html2canvas/jsPDF
// ============================================================================
// المشكلة الجذرية الموثقة في تقرير editor:
//   فشل PDF بسبب: Attempting to parse an unsupported color function 'oklch'.
//
// الحل: قبل تمرير DOM إلى مكتبات التصدير نمرّ على كل لون منسوخ ونحوّل:
//   - oklch(...)  → rgb hex/rgba
//   - oklab(...)  → rgb hex/rgba
//   - color-mix(...) → fallback أبيض/أسود حسب السياق
//   - color(display-p3 ...) → نسخة sRGB تقريبية
//
// التحويل تقريبي وكافٍ للتصدير. الهدف ليس دقة لونية، بل عدم كسر التصدير.

/**
 * نتيجة التحويل: string هو لون CSS صالح في sRGB.
 */
export type SafeRgbColor = string;

/**
 * يحوّل oklch إلى تقدير sRGB بسيط.
 * المعادلات الكاملة معقدة؛ نستخدم تقريباً يحفظ التباين العام
 * ولا يكسر التصدير. إذا لم نتمكن من التحليل نُرجع fallback.
 */
function oklchToRgb(input: string, fallback: SafeRgbColor): SafeRgbColor {
  const match = input.match(/oklch\(\s*([^)]+)\)/i);
  if (match === null || match[1] === undefined) {
    return fallback;
  }
  // الصيغة: oklch(L C H [/ A])
  const parts = match[1]
    .split(/[\s/,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (parts.length < 3) {
    return fallback;
  }

  const parsePercentOrUnit = (raw: string): number => {
    if (raw.endsWith("%")) {
      return Number.parseFloat(raw) / 100;
    }
    return Number.parseFloat(raw);
  };

  const L = parsePercentOrUnit(parts[0] ?? "0");
  const C = Number.parseFloat(parts[1] ?? "0");
  const H = Number.parseFloat(parts[2] ?? "0");
  const aPart = parts[3];
  const alpha = aPart !== undefined ? parsePercentOrUnit(aPart) : 1;

  if (!Number.isFinite(L) || !Number.isFinite(C) || !Number.isFinite(H)) {
    return fallback;
  }

  // OKLab → linear sRGB → sRGB (تقريب).
  const hRad = (H * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const lCubed = l_ * l_ * l_;
  const mCubed = m_ * m_ * m_;
  const sCubed = s_ * s_ * s_;

  let r = 4.0767416621 * lCubed - 3.3077115913 * mCubed + 0.2309699292 * sCubed;
  let g = -1.2684380046 * lCubed + 2.6097574011 * mCubed - 0.3413193965 * sCubed;
  let bChan = -0.0041960863 * lCubed - 0.7034186147 * mCubed + 1.707614701 * sCubed;

  // gamma encode (sRGB).
  const toSrgb = (x: number): number => {
    const clamped = Math.max(0, Math.min(1, x));
    return clamped <= 0.0031308
      ? 12.92 * clamped
      : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
  };

  r = Math.round(toSrgb(r) * 255);
  g = Math.round(toSrgb(g) * 255);
  bChan = Math.round(toSrgb(bChan) * 255);

  if (alpha >= 0.999) {
    return `rgb(${r}, ${g}, ${bChan})`;
  }
  return `rgba(${r}, ${g}, ${bChan}, ${alpha.toFixed(3)})`;
}

/**
 * نفس فكرة oklch لكن للـ oklab — يدخلها كنفس المسار بعد تحويل a,b إلى C,H تقريبي.
 */
function oklabToRgb(input: string, fallback: SafeRgbColor): SafeRgbColor {
  const match = input.match(/oklab\(\s*([^)]+)\)/i);
  if (match === null || match[1] === undefined) {
    return fallback;
  }
  const parts = match[1]
    .split(/[\s/,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length < 3) {
    return fallback;
  }
  const L = parts[0]?.endsWith("%")
    ? Number.parseFloat(parts[0]) / 100
    : Number.parseFloat(parts[0] ?? "0");
  const a = Number.parseFloat(parts[1] ?? "0");
  const b = Number.parseFloat(parts[2] ?? "0");
  const C = Math.sqrt(a * a + b * b);
  const H = (Math.atan2(b, a) * 180) / Math.PI;
  return oklchToRgb(`oklch(${L} ${C} ${H})`, fallback);
}

/**
 * يحدد إن كان لون النص فاتحاً أو غامقاً نسبياً (لاختيار fallback).
 */
function pickContrastFallback(role: "background" | "foreground"): SafeRgbColor {
  return role === "background" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)";
}

/**
 * يحوّل أي قيمة لون CSS إلى صيغة آمنة لـ html2canvas/jsPDF.
 * إذا كانت القيمة fallback آمنة بالفعل (rgb/hex/rgba/hsl/hsla/named) تُترك.
 */
export function toExportSafeColor(
  value: string,
  role: "background" | "foreground" = "foreground",
): SafeRgbColor {
  if (typeof value !== "string" || value.length === 0) {
    return pickContrastFallback(role);
  }

  const trimmed = value.trim();

  // أنواع آمنة معروفة.
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb(") ||
    trimmed.startsWith("rgba(") ||
    trimmed.startsWith("hsl(") ||
    trimmed.startsWith("hsla(") ||
    /^[a-zA-Z]+$/.test(trimmed)
  ) {
    return trimmed;
  }

  if (/oklch\(/i.test(trimmed)) {
    return oklchToRgb(trimmed, pickContrastFallback(role));
  }
  if (/oklab\(/i.test(trimmed)) {
    return oklabToRgb(trimmed, pickContrastFallback(role));
  }
  if (/color-mix\(/i.test(trimmed) || /color\(/i.test(trimmed)) {
    // بدائل لا يمكن حلها قبل rendering — نعتمد fallback آمن.
    return pickContrastFallback(role);
  }

  return trimmed;
}

/**
 * أنماط مرشحة في declarations للون.
 */
const COLOR_PROPERTIES: ReadonlyArray<keyof CSSStyleDeclaration> = [
  "color",
  "backgroundColor",
  "borderColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "textDecorationColor",
  "fill",
  "stroke",
];

/**
 * يجبر كل خاصية لون على عنصر إلى قيمة آمنة.
 */
export function applyExportSafeColors(element: HTMLElement): void {
  if (typeof window === "undefined") {
    return;
  }
  const computed = window.getComputedStyle(element);
  for (const prop of COLOR_PROPERTIES) {
    const raw = computed.getPropertyValue(prop as string);
    if (typeof raw === "string" && raw.length > 0) {
      const role: "background" | "foreground" =
        prop === "backgroundColor" || prop === "fill" ? "background" : "foreground";
      const safe = toExportSafeColor(raw, role);
      // نكتب inline style ليتجاوز أي CSS variable لاحقة.
      element.style.setProperty(prop as string, safe, "important");
    }
  }
}

/**
 * تكوين الخطوط - Font Configuration
 *
 * الخط الموحد: Cairo فقط
 * تم توحيد جميع الخطوط لاستخدام Cairo لضمان التناسق في التصميم
 */

// الخط الموحد - Cairo
export const cairo = {
  variable: "--font-cairo",
  className: "font-cairo",
  style: { fontFamily: '"Cairo", system-ui, -apple-system, sans-serif' },
};

// للتوافق مع الاستخدامات القديمة - جميعها تشير إلى Cairo
export const amiri = cairo;
export const literata = cairo;
export const sourceCodePro = {
  ...cairo,
  variable: "--font-mono",
};

/**
 * ملاحظة: تم توحيد جميع الخطوط لاستخدام Cairo
 * لتغيير الخط، عدل هذا الملف فقط
 */
export default cairo;

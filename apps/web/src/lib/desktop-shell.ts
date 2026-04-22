/**
 * مرجع واجهة الويب الديسكتوب المعتمد لكل صفحات التطبيق.
 *
 * السياسة الحاكمة:
 * - التطبيق يُصمم ويُعرض على مساحة مرجعية ثابتة لسطح المكتب.
 * - عند ضيق المساحة نُبقي التكوين كما هو ونسمح بالتمرير بدل إعادة التشكيل.
 * - ممنوع تفعيل مسارات "الجوال" أو إعادة ترتيب الواجهة تلقائيًا
 *   إلا بطلب صريح جديد.
 */

export const DESKTOP_WEB_APP_LOCKED = true;
export const DESKTOP_WEB_APP_REFERENCE_WIDTH_PX = 1440;
export const DESKTOP_WEB_APP_MIN_WIDTH_PX = 1280;
export const DESKTOP_WEB_APP_BODY_CLASS = "desktop-web-app";
export const DESKTOP_WEB_APP_FRAME_CLASS = "desktop-web-app-frame";

export const isDesktopWebAppLocked = (): boolean => DESKTOP_WEB_APP_LOCKED;

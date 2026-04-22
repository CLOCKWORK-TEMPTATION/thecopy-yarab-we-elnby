/**
 * @module constants/shell-layout
 * ثوابت غلاف المحرر المرجعي على سطح المكتب.
 *
 * بعد تحوّل الغلاف إلى فلسفة Modern Floating UI:
 *   - الرأس يبقى أعلى الشاشة لكن بلا خلفية ممتدة (مجرد clusters عائمة).
 *   - الـ Dock انتقل من الأعلى إلى الأسفل كـ floating pill فوق الذيل.
 *   - الشريط الجانبي يظل ثابتًا على اليمين كلوحة عائمة.
 *
 * تُستخدم هذه القيم لضبط padding المسرح حول ورقة المحرر وموقع العناصر
 * العائمة ضمن الغلاف فقط، ولا تمس منطق المحرر أو ترقيم الصفحات.
 */

export const EDITOR_SHELL_HEADER_HEIGHT_PX = 68;
export const EDITOR_SHELL_SIDEBAR_WIDTH_PX = 288;
export const EDITOR_SHELL_SIDEBAR_TOP_PX = 92;
export const EDITOR_SHELL_SIDEBAR_RIGHT_PX = 24;
export const EDITOR_SHELL_SIDEBAR_BOTTOM_PX = 120;

/**
 * موقع الـ dock العائم من أسفل النافذة.
 * الـ dock يقف فوق الذيل مباشرة في فلسفة Modern Floating UI.
 */
export const EDITOR_SHELL_DOCK_BOTTOM_PX = 28;
export const EDITOR_SHELL_DOCK_HEIGHT_PX = 64;
export const EDITOR_SHELL_DOCK_TO_CANVAS_GAP_PX = 12;

/**
 * @deprecated الـ dock أصبح عائمًا من الأسفل. تُركت الثابتة لأي مستهلك
 *   قديم، لكن لم تعد مستخدمة في تخطيط التصيير الفعلي.
 */
export const EDITOR_SHELL_DOCK_TOP_PX = EDITOR_SHELL_HEADER_HEIGHT_PX + 16;

export const EDITOR_CANVAS_WIDTH_PX = 850;
export const EDITOR_CANVAS_LEFT_GUTTER_PX = 120;
export const EDITOR_CANVAS_RIGHT_RESERVE_PX =
  EDITOR_SHELL_SIDEBAR_WIDTH_PX + EDITOR_SHELL_SIDEBAR_RIGHT_PX + 48;
export const EDITOR_COMPOSITION_SHIFT_LEFT_PX =
  (EDITOR_CANVAS_RIGHT_RESERVE_PX - EDITOR_CANVAS_LEFT_GUTTER_PX) / 2;

/**
 * الحد الأدنى لعرض الشاشة قبل تفعيل الوضع المضغوط.
 * أقل من هذا العرض: الشريط الجانبي يُخفى والصفحة تتوسط في الـ viewport.
 */
export const EDITOR_COMPACT_BREAKPOINT_PX = 1200;

/**
 * قيم الـ paddings في الوضع المضغوط — متوازنة لتوسيط الصفحة
 * في منتصف الـ viewport عندما يختفي الشريط الجانبي.
 */
export const EDITOR_CANVAS_COMPACT_GUTTER_PX = 48;

/**
 * عرض غلاف الصفحة في الوضع المضغوط — يُطابق عرض صفحة A4 الفعلي
 * (794px) ليتسع مع الـ paddings في الـ viewport الضيق.
 */
export const EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX = 794;

/**
 * المسافة بين أعلى منطقة التمرير وأعلى الورقة.
 * منطقة التمرير تبدأ بعد الـ header، لذا نطرح ارتفاع الـ header
 * من موقع الـ dock حتى نحسب الإزاحة داخل منطقة التمرير فقط.
 */
export const EDITOR_CANVAS_TOP_OFFSET_PX =
  EDITOR_SHELL_DOCK_TOP_PX -
  EDITOR_SHELL_HEADER_HEIGHT_PX +
  EDITOR_SHELL_DOCK_HEIGHT_PX +
  EDITOR_SHELL_DOCK_TO_CANVAS_GAP_PX;

/**
 * المسافة المطلوبة أسفل منطقة التمرير.
 */
export const EDITOR_CANVAS_BOTTOM_OFFSET_PX = 32;

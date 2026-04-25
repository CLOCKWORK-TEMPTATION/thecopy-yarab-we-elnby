/**
 * @file editor.ts
 * @description مصنع محرر السيناريو (Screenplay Editor Factory). يتولى:
 *   1. تسجيل جميع امتدادات Tiptap المخصصة لعناصر السيناريو العربي.
 *   2. تهيئة نظام الصفحات (A4 pagination) عبر `@tiptap-pro/extension-pages`.
 *   3. تصدير قائمة عناصر السيناريو `SCREENPLAY_ELEMENTS` مع التسميات العربية والاختصارات.
 *   4. توفير دالة إنشاء المحرر `createScreenplayEditor` لتوليد مثيل Tiptap Editor مهيّأ بالكامل.
 *
 * @exports
 *   - `SCREENPLAY_ELEMENTS` — مصفوفة ثابتة (readonly) بثمانية عناصر سيناريو.
 *   - `createScreenplayEditor` — دالة مصنع تُنشئ مثيل Editor مع كل الامتدادات.
 *
 * @dependencies
 *   - `@tiptap/core` — محرك المحرر الأساسي.
 *   - `@tiptap-pro/extension-pages` — نظام تقسيم الصفحات.
 *   - `./extensions/*` — 10 امتدادات مخصصة لعناصر السيناريو + الأوامر + مصنف اللصق.
 *   - `./constants` — ثوابت أبعاد الصفحة والتخطيط (A4 @ 96 PPI).
 *
 * @usedBy
 *   - `components/editor/EditorArea.ts` — يستدعي `createScreenplayEditor` لتركيب المحرر.
 *   - `toolbar.ts` — يستورد `SCREENPLAY_ELEMENTS` لبناء القائمة المنسدلة.
 *   - `App.tsx` — يستورد `SCREENPLAY_ELEMENTS` لربط الاختصارات وعرض التسميات.
 */
import { Editor, Extension } from "@tiptap/core";
import { history, redo, undo } from "@tiptap/pm/history";
import { keymap } from "@tiptap/pm/keymap";
import { Basmala } from "./extensions/basmala";
import { SceneHeaderTopLine } from "./extensions/scene-header-top-line";
import { SceneHeader1 } from "./extensions/scene-header-1";
import { SceneHeader2 } from "./extensions/scene-header-2";
import { SceneHeader3 } from "./extensions/scene-header-3";
import { Action } from "./extensions/action";
import { Character } from "./extensions/character";
import { Dialogue } from "./extensions/dialogue";
import { Parenthetical } from "./extensions/parenthetical";
import { Transition } from "./extensions/transition";
import { ScreenplayCommands } from "./extensions/screenplay-commands";
import { PasteClassifier } from "./extensions/paste-classifier";
import { Pages } from "@tiptap-pro/extension-pages";
import {
  FOOTER_HEIGHT_PX,
  FOOTER_TEMPLATE_LINE_COUNT,
  HEADER_HEIGHT_PX,
  HEADER_TEMPLATE_LINE_COUNT,
  PAGE_GAP_PX,
  PAGE_HEIGHT_PX,
  PAGE_MARGIN_LEFT_PX,
  PAGE_MARGIN_RIGHT_PX,
  PAGE_WIDTH_PX,
} from "./constants";

// الامتدادات الأساسية من Tiptap
import Document from "@tiptap/extension-document";
import Text from "@tiptap/extension-text";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";

/**
 * @description قائمة عناصر السيناريو المتاحة مع البيانات الوصفية لكل عنصر.
 *   تُستخدم لبناء واجهات اختيار العنصر (القائمة المنسدلة، شريط الأدوات، الذيل)
 *   ولربط اختصارات لوحة المفاتيح بأوامر تحويل الفقرة.
 *
 * @remarks
 *   - `name` — معرّف العنصر بصيغة kebab-case، يطابق اسم امتداد Tiptap.
 *   - `label` — التسمية العربية المعروضة للمستخدم.
 *   - `shortcut` — اختصار لوحة المفاتيح (Ctrl+رقم).
 *   - `icon` — رمز Unicode أو Emoji للعرض في الواجهة.
 *
 * @example
 * // الوصول لعنصر بالاسم
 * const actionEl = SCREENPLAY_ELEMENTS.find(el => el.name === 'action')
 *
 * @example
 * // بناء قائمة منسدلة
 * SCREENPLAY_ELEMENTS.forEach(el => {
 *   const opt = document.createElement('option')
 *   opt.value = el.name
 *   opt.textContent = `${el.icon} ${el.label}`
 * })
 *
 * @example
 * // ربط اختصار لوحة المفاتيح
 * if (editor.isActive(SCREENPLAY_ELEMENTS[3].name)) {
 *   // العنصر النشط هو "حركة (Action)"
 * }
 */
export const SCREENPLAY_ELEMENTS = [
  { name: "basmala", label: "بسملة", shortcut: "Ctrl+0", icon: "﷽" },
  {
    name: "scene_header_top_line",
    label: "سطر رأس المشهد",
    shortcut: "Ctrl+1",
    icon: "🎬",
  },
  {
    name: "scene_header_3",
    label: "رأس المشهد (3)",
    shortcut: "Ctrl+2",
    icon: "📍",
  },
  { name: "action", label: "حركة (Action)", shortcut: "Ctrl+3", icon: "📝" },
  {
    name: "character",
    label: "شخصية (Character)",
    shortcut: "Ctrl+4",
    icon: "👤",
  },
  {
    name: "dialogue",
    label: "حوار (Dialogue)",
    shortcut: "Ctrl+5",
    icon: "💬",
  },
  {
    name: "parenthetical",
    label: "توصيف (Parenthetical)",
    shortcut: "Ctrl+6",
    icon: "🎭",
  },
  {
    name: "transition",
    label: "انتقال (Transition)",
    shortcut: "Ctrl+7",
    icon: "🔀",
  },
] as const;

/**
 * @description تنسيق الصفحة المخصص لسيناريوهات Filmlane بمقاس A4 عند 96 PPI.
 *   هذا الإصدار من Pages يحجز مساحة الهيدر والفوتر من الهوامش الرأسية
 *   نفسها، لذلك يجب أن يطابق `margins.top` و `margins.bottom` الارتفاع
 *   البصري المحجوز فعليًا لكل من الترويسة والتذييل.
 *
 * @see PAGE_WIDTH_PX — عرض الصفحة (794px).
 * @see PAGE_HEIGHT_PX — ارتفاع الصفحة (1123px).
 */
const SCREENPLAY_PAGE_FORMAT = {
  id: "FilmlaneA4",
  width: PAGE_WIDTH_PX,
  height: PAGE_HEIGHT_PX,
  margins: {
    top: HEADER_HEIGHT_PX,
    right: PAGE_MARGIN_RIGHT_PX,
    bottom: FOOTER_HEIGHT_PX,
    left: PAGE_MARGIN_LEFT_PX,
  },
} as const;

/**
 * الحزمة الرسمية تطبّع header/footer إلى بنية فقرات داخلية،
 * لذلك نولّد ارتفاع الرأس والذيل عبر فقرات فعلية قابلة للقياس
 * بدل عناصر HTML مخصّصة تُزال أثناء التطبيع.
 */
const PAGES_HEADER_LINES = HEADER_TEMPLATE_LINE_COUNT;
const PAGES_FOOTER_LINES = FOOTER_TEMPLATE_LINE_COUNT;

const buildSpacerParagraphs = (count: number): string =>
  Array.from({ length: count }, () => "<p>&nbsp;</p>").join("");

/** قالب HTML لرأس الصفحة — مساحة فارغة مقاسة بفقرات فعلية. */
const PAGES_HEADER_TEMPLATE = buildSpacerParagraphs(PAGES_HEADER_LINES);

/**
 * قالب HTML لذيل الصفحة — يحجز ارتفاع التذييل ويُبقي رقم الصفحة
 * على السطر الأخير ضمن المحتوى المقاس نفسه.
 */
const PAGES_FOOTER_TEMPLATE = `${buildSpacerParagraphs(
  Math.max(1, PAGES_FOOTER_LINES - 1)
)}<p>{page}.</p>`;

type ScreenplayPagesOptions = {
  pageFormat: {
    id: string;
    width: number;
    height: number;
    margins: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  pageGap?: number;
  headerTopMargin?: number;
  footerBottomMargin?: number;
  pageBreakBackground?: string;
  header: string;
  footer: string;
};

const ScreenplayPages = Pages.extend<
  ScreenplayPagesOptions,
  Record<string, unknown>
>({});

const ScreenplayHistory = Extension.create({
  name: "screenplayHistory",
  addProseMirrorPlugins() {
    return [
      history(),
      keymap({
        "Mod-z": undo,
        "Shift-Mod-z": redo,
        "Mod-y": redo,
      }),
    ];
  },
});

/**
 * إنشاء محرر السيناريو
 */
export function createScreenplayEditor(element: HTMLElement): Editor {
  // تخصيص مستند (Document) لقبول عناصر السيناريو فقط
  const ScreenplayDocument = Document.extend({
    content: "block+",
  });

  const editor = new Editor({
    element,
    extensions: [
      ScreenplayDocument,
      Text,
      Bold,
      Italic,
      Underline,
      TextAlign.configure({
        types: [
          "basmala",
          "scene_header_top_line",
          "scene_header_1",
          "scene_header_2",
          "scene_header_3",
          "action",
          "character",
          "dialogue",
          "parenthetical",
          "transition",
        ],
        alignments: ["left", "center", "right"],
      }),
      ScreenplayPages.configure({
        pageFormat: SCREENPLAY_PAGE_FORMAT,
        pageGap: PAGE_GAP_PX,
        headerTopMargin: 0,
        footerBottomMargin: 0,
        pageBreakBackground: "#060808",
        header: PAGES_HEADER_TEMPLATE,
        footer: PAGES_FOOTER_TEMPLATE,
      }),
      ScreenplayHistory,
      // عناصر السيناريو المخصصة
      Basmala,
      SceneHeaderTopLine,
      SceneHeader1,
      SceneHeader2,
      SceneHeader3,
      Action,
      Character,
      Dialogue,
      Parenthetical,
      Transition,
      // أوامر السيناريو واختصارات لوحة المفاتيح
      ScreenplayCommands,
      // تصنيف النص الملصوق تلقائياً
      PasteClassifier,
    ],
    content: getDefaultContent(),
    editorProps: {
      attributes: {
        class: "tiptap",
        spellcheck: "true",
        dir: "rtl",
      },
    },
    autofocus: true,
  });

  return editor;
}

/**
 * @description المحتوى الافتراضي عند فتح المحرر — سيناريو تجريبي قصير يتضمن
 *   نماذج لجميع عناصر السيناريو الأساسية (بسملة، رأس مشهد، حدث، شخصية، حوار، انتقال).
 *   يُستخدم كقيمة أولية لخاصية `content` في مثيل Tiptap Editor.
 *
 * @returns {string} سلسلة HTML تمثل محتوى السيناريو الافتراضي مع `data-type` attributes.
 */
function getDefaultContent(): string {
  return `<div data-type="action"></div>`;
}

"use client";

/**
 * @file App.tsx
 * @description المكون الجذري لتطبيق أفان تيتر — محرر السيناريو العربي.
 *   يجمع كل واجهات المستخدم (الترويسة، القائمة الرئيسية، الشريط الجانبي، شريط Dock،
 *   منطقة المحرر، الذيل) ويدير:
 *   - دورة حياة EditorArea (إنشاء/تدمير).
 *   - اختصارات لوحة المفاتيح العامة (Ctrl+0..7 للعناصر، Ctrl+S/O/N/Z/Y/B/I/U).
 *   - عمليات الملفات (فتح، إدراج، حفظ، تصدير HTML، طباعة).
 *   - توزيع أوامر القوائم عبر `handleMenuAction`.
 *   - عرض إحصائيات المستند (صفحات، كلمات، حروف، مشاهد) في الذيل.
 *
 * @architecture
 *   نمط هجين: React يدير الغلاف (shell) وحالة واجهة المستخدم،
 *   بينما `EditorArea` (فئة حتمية) تدير محرك Tiptap مباشرة.
 *   المكونات العرضية الصغيرة (`BackgroundGrid`, `DockIconButton`) معرّفة
 *   داخل هذا الملف وليس في ملفات منفصلة.
 *
 * @exports
 *   - `App` — المكون الجذري (named export).
 *
 * @dependencies
 *   - `components/editor` — واجهة محرك المحرر (Barrel + EditorArea).
 *   - `components/ui/hover-border-gradient` — مكون تأثير الحدود المتدرجة.
 *   - `utils/file-import/*` — خط أنابيب استيراد الملفات.
 *   - `extensions/classification-types` — أنواع عناصر السيناريو.
 *   - `lucide-react` — أيقونات الواجهة.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

import { DotBackground } from "@/components/ui/dot-background";
import { getCurrentProject } from "@/lib/projectStore";

import {
  AppDock,
  AppFooter,
  AppHeader,
  AppSidebar,
  PipelineMonitor,
  SettingsPanel,
} from "./components/app-shell";
import {
  EditorArea,
  type DocumentStats,
  type ProgressiveSurfaceState,
} from "./components/editor";
import { BackgroundGrid } from "./components/ui/BackgroundGrid";
import {
  brandColors,
  classificationTypeOptions,
  colors,
  DOCK_BUTTONS,
  EDITOR_CANVAS_BOTTOM_OFFSET_PX,
  EDITOR_CANVAS_COMPACT_GUTTER_PX,
  EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX,
  EDITOR_CANVAS_LEFT_GUTTER_PX,
  EDITOR_CANVAS_RIGHT_RESERVE_PX,
  EDITOR_CANVAS_TOP_OFFSET_PX,
  EDITOR_CANVAS_WIDTH_PX,
  fonts,
  formatClassMap,
  FORMAT_LABEL_BY_TYPE,
  getSpacingMarginTop,
  gradients,
  highlightColors,
  MENU_SECTIONS,
  screenplayFormats,
  semanticColors,
  SHORTCUT_FORMAT_BY_DIGIT,
  SIDEBAR_SECTIONS,
  textSizes,
} from "./constants";
import {
  handleMenuAction,
  handleSidebarItemAction,
  runExport,
  type EditorActionsDeps,
} from "./controllers";
import {
  loadFromStorage,
  saveToStorage,
  subscribeIsMobile,
  toast,
  useAutoSave as scheduleAutoSave,
  useEditorCompactMode,
  useIsMobile as getIsMobile,
  useMenuCommandResolver,
} from "./hooks";
import {
  DEFAULT_TYPING_SYSTEM_SETTINGS,
  minutesToMilliseconds,
  sanitizeTypingSystemSettings,
  type RunDocumentThroughPasteWorkflowOptions,
  type TypingSystemSettings,
} from "./types";
import { resolveFileImportExtractEndpoint } from "./utils/backend-endpoints";
import { logger } from "./utils/logger";

import type { MenuActionId } from "./constants/menu-definitions";
import type { ElementType } from "./extensions/classification-types";

const TYPING_SETTINGS_STORAGE_KEY = "filmlane.typing-system.settings";
const AUTOSAVE_DRAFT_STORAGE_KEY = "filmlane.autosave.document-text.v1";

const LOCKED_EDITOR_FONT_LABEL = fonts[0]?.label ?? "غير محدد";
const LOCKED_EDITOR_FONT_VALUE = fonts[0]?.value ?? "AzarMehrMonospaced-San";
const LOCKED_EDITOR_SIZE_LABEL = textSizes[0]?.label ?? "12";
const SUPPORTED_LEGACY_FORMAT_COUNT = Object.keys(formatClassMap).length;
const CLASSIFIER_OPTION_COUNT = classificationTypeOptions.length;
const ACTION_BLOCK_SPACING = getSpacingMarginTop("action", "action") || "0";
const MAX_DIAGNOSTIC_EVENTS = 5;

interface EditorAutosaveSnapshot {
  html?: string;
  text: string;
  updatedAt: string;
  version?: 2;
}

interface EditorDiagnosticEvent {
  id: string;
  title: string;
  message: string;
  createdAt: string;
}

const readTypingSystemSettings = (): TypingSystemSettings => {
  const parsed = loadFromStorage<Partial<TypingSystemSettings> | null>(
    TYPING_SETTINGS_STORAGE_KEY,
    null
  );
  return sanitizeTypingSystemSettings(parsed ?? DEFAULT_TYPING_SYSTEM_SETTINGS);
};

const readActiveProjectTitle = (): string | null => {
  const project = getCurrentProject();
  if (!project?.id) {
    return null;
  }

  const normalizedTitle =
    typeof project.title === "string" ? project.title.trim() : "";
  return normalizedTitle || "مشروع بدون عنوان";
};

const readAutosaveSnapshot = (): EditorAutosaveSnapshot | null =>
  loadFromStorage<EditorAutosaveSnapshot | null>(
    AUTOSAVE_DRAFT_STORAGE_KEY,
    null
  );

const canRestoreAutosaveSnapshot = (
  snapshot: EditorAutosaveSnapshot | null
): snapshot is EditorAutosaveSnapshot =>
  Boolean(snapshot?.text && snapshot.text.trim().length > 0);

const applyAutosaveSnapshot = async (
  area: EditorArea,
  snapshot: EditorAutosaveSnapshot
): Promise<void> => {
  if (snapshot.version === 2 && snapshot.html?.trim()) {
    area.editor.commands.setContent(snapshot.html, { emitUpdate: true });
    area.editor.commands.focus("end");
    return;
  }

  await area.importClassifiedText(snapshot.text, "replace");
};

/**
 * @description المكون الجذري للتطبيق (App Component). يجمع كل الواجهات (الترويسة، الشريط الجانبي، منطقة المحرر، الذيل) ويدير حالة النسخة والإحصائيات والأحداث العامة.
 *
 * @complexity الزمنية: O(1) للتصيير (Render) | المكانية: O(1) لحفظ المراجع والحالة محلياً.
 *
 * @sideEffects
 *   - ينشئ دورة حياة مفردة لـ `EditorArea`.
 *   - يسجل مستمعي أحداث `keydown` و `click` على الـ `document`.
 *
 * @usedBy
 *   - `main.tsx` لتركيب شجرة React.
 */
export function App(): React.JSX.Element {
  const editorMountRef = useRef<HTMLDivElement | null>(null);
  const editorAreaRef = useRef<EditorArea | null>(null);
  const handleMenuActionRef = useRef<
    ((actionId: MenuActionId) => Promise<void>) | null
  >(null);
  const liveTypingWorkflowTimeoutRef = useRef<number | null>(null);
  const applyingTypingWorkflowRef = useRef(false);
  const lastLiveWorkflowTextRef = useRef("");

  const [stats, setStats] = useState<DocumentStats>({
    pages: 1,
    words: 0,
    characters: 0,
    scenes: 0,
  });
  const [currentFormat, setCurrentFormat] = useState<ElementType | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [openSidebarItem, setOpenSidebarItem] = useState<string | null>(null);
  const [documentText, setDocumentText] = useState("");
  const [isMobile, setIsMobile] = useState<boolean>(() => getIsMobile());
  const isCompact = useEditorCompactMode();
  const [typingSystemSettings, setTypingSystemSettings] =
    useState<TypingSystemSettings>(() => readTypingSystemSettings());
  const [showPipelineMonitor, setShowPipelineMonitor] = useState(false);
  const [progressiveSurfaceState, setProgressiveSurfaceState] =
    useState<ProgressiveSurfaceState | null>(null);
  const [activeProjectTitle, setActiveProjectTitle] = useState<string | null>(
    () => readActiveProjectTitle()
  );
  const [diagnosticEvents, setDiagnosticEvents] = useState<
    EditorDiagnosticEvent[]
  >([]);

  const recordDiagnostic = useCallback(
    (title: string, message: string): void => {
      const normalizedTitle = title.trim() || "تشخيص المحرر";
      const normalizedMessage = message.trim() || "حدث خطأ غير معروف.";
      setDiagnosticEvents((current) =>
        [
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            title: normalizedTitle,
            message: normalizedMessage,
            createdAt: new Date().toISOString(),
          },
          ...current,
        ].slice(0, MAX_DIAGNOSTIC_EVENTS)
      );
    },
    []
  );

  /* ── تركيب/تدمير EditorArea مرة واحدة فقط ── */
  useEffect(() => {
    const mount = editorMountRef.current;
    if (!mount) return;

    const editorArea = new EditorArea({
      mount,
      onContentChange: (text) => setDocumentText(text),
      onStatsChange: (nextStats) => setStats(nextStats),
      onFormatChange: (format) => setCurrentFormat(format),
      onImportError: (message) => {
        recordDiagnostic("فشل تطبيق نظام الشك", message);
        toast({
          title: "فشل تطبيق نظام الشك",
          description: message,
          variant: "destructive",
        });
      },
      onProgressiveStateChange: (state) => setProgressiveSurfaceState(state),
    });
    editorAreaRef.current = editorArea;

    const snapshot = readAutosaveSnapshot();
    if (canRestoreAutosaveSnapshot(snapshot)) {
      void applyAutosaveSnapshot(editorArea, snapshot)
        .then(() => {
          setDocumentText(editorArea.getAllText());
        })
        .catch((error) => {
          const message =
            error instanceof Error
              ? error.message
              : "حدث خطأ غير معروف أثناء الاستعادة التلقائية.";
          recordDiagnostic("فشل الاستعادة التلقائية", message);
          logger.warn("Automatic autosave restore failed", {
            scope: "autosave",
            data: error,
          });
        });
    }

    return () => {
      editorArea.destroy();
      editorAreaRef.current = null;
    };
  }, [recordDiagnostic]);

  useEffect(() => {
    return subscribeIsMobile((nextIsMobile) => {
      setIsMobile(nextIsMobile);
      if (nextIsMobile) {
        setOpenSidebarItem(null);
      }
    });
  }, []);

  useEffect(() => {
    const syncActiveProjectTitle = () => {
      setActiveProjectTitle(readActiveProjectTitle());
    };

    syncActiveProjectTitle();
    window.addEventListener("storage", syncActiveProjectTitle);
    window.addEventListener(
      "directors-studio:project-changed",
      syncActiveProjectTitle
    );
    window.addEventListener(
      "directors-editor:project-synced",
      syncActiveProjectTitle
    );

    return () => {
      window.removeEventListener("storage", syncActiveProjectTitle);
      window.removeEventListener(
        "directors-studio:project-changed",
        syncActiveProjectTitle
      );
      window.removeEventListener(
        "directors-editor:project-synced",
        syncActiveProjectTitle
      );
    };
  }, []);

  /* ── استعادة يدوية للمسودة المحفوظة تلقائيًا ── */
  const restoreAutosaveDraft = useCallback(async (): Promise<void> => {
    const area = editorAreaRef.current;
    if (!area) return;

    const snapshot = readAutosaveSnapshot();

    if (!canRestoreAutosaveSnapshot(snapshot)) {
      toast({
        title: "لا توجد مسودة",
        description: "لم نعثر على مسودة محفوظة لاستعادتها.",
      });
      return;
    }

    try {
      await applyAutosaveSnapshot(area, snapshot);
      setDocumentText(area.getAllText());
      toast({
        title: "تمت استعادة المسودة",
        description: "استرجعنا آخر نسخة محفوظة تلقائيًا.",
      });
    } catch (error) {
      logger.warn("Manual autosave restore failed", {
        scope: "autosave",
        data: error,
      });
      recordDiagnostic(
        "تعذرت استعادة المسودة",
        error instanceof Error
          ? error.message
          : "حدث خطأ غير معروف أثناء استعادة المسودة."
      );
      toast({
        title: "تعذرت استعادة المسودة",
        description:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير معروف أثناء استعادة المسودة.",
        variant: "destructive",
      });
    }
  }, []);

  /* ── إغلاق القوائم عند النقر خارجها ── */
  useEffect(() => {
    const closeMenus = (event: MouseEvent): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-app-menu-root="true"]')) {
        return;
      }
      setActiveMenu(null);
    };
    document.addEventListener("click", closeMenus);
    return () => document.removeEventListener("click", closeMenus);
  }, []);

  useEffect(() => {
    saveToStorage(TYPING_SETTINGS_STORAGE_KEY, typingSystemSettings);
  }, [typingSystemSettings]);

  useEffect(() => {
    const area = editorAreaRef.current;
    if (!area) return;

    scheduleAutoSave<EditorAutosaveSnapshot>(
      AUTOSAVE_DRAFT_STORAGE_KEY,
      {
        html: area.getAllHtml(),
        text: area.getAllText(),
        updatedAt: new Date().toISOString(),
        version: 2,
      },
      1500
    );
  }, [documentText]);

  /* ── تفعيل Design Tokens من constants/colors.ts ── */
  useEffect(() => {
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--brand", brandColors.jungleGreen);
    rootStyle.setProperty("--brand-teal", brandColors.teal);
    rootStyle.setProperty("--brand-bronze", brandColors.bronze);
    rootStyle.setProperty("--ring", brandColors.jungleGreen);
    rootStyle.setProperty("--accent", semanticColors.secondary);
    rootStyle.setProperty("--accent-success", semanticColors.success);
    rootStyle.setProperty("--accent-warning", semanticColors.warning);
    rootStyle.setProperty("--accent-error", semanticColors.error);
    rootStyle.setProperty("--accent-creative", semanticColors.creative);
    rootStyle.setProperty("--accent-technical", semanticColors.technical);
    rootStyle.setProperty("--filmlane-brand-gradient", gradients.jungleFull);
    rootStyle.setProperty("--filmlane-brand-gradient-soft", gradients.jungle);
    rootStyle.setProperty("--filmlane-highlight-primary", highlightColors[0]);
    rootStyle.setProperty("--filmlane-highlight-secondary", highlightColors[1]);
    rootStyle.setProperty("--filmlane-palette-dark", colors[0]);
    rootStyle.setProperty("--filmlane-editor-font", LOCKED_EDITOR_FONT_VALUE);
    rootStyle.setProperty(
      "--filmlane-editor-size",
      `${LOCKED_EDITOR_SIZE_LABEL}pt`
    );
  }, []);

  const fileImportBackendEndpoint = resolveFileImportExtractEndpoint();
  const hasFileImportBackend = fileImportBackendEndpoint.length > 0;

  const handleTypingModeChange = (
    nextMode: TypingSystemSettings["typingSystemMode"]
  ): void => {
    setTypingSystemSettings((current) =>
      sanitizeTypingSystemSettings({
        ...current,
        typingSystemMode: nextMode,
      })
    );

    if (
      nextMode !== "auto-live" &&
      liveTypingWorkflowTimeoutRef.current !== null
    ) {
      window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
      liveTypingWorkflowTimeoutRef.current = null;
    }

    logger.info("Typing system mode updated", {
      scope: "typing-system",
      data: { mode: nextMode },
    });
  };

  const handleLiveIdleMinutesChange = (nextMinutes: number): void => {
    setTypingSystemSettings((current) =>
      sanitizeTypingSystemSettings({
        ...current,
        liveIdleMinutes: nextMinutes,
      })
    );
  };

  const runDocumentThroughPasteWorkflow = useCallback(
    async (options: RunDocumentThroughPasteWorkflowOptions): Promise<void> => {
      const area = editorAreaRef.current;
      if (!area) return;
      if (area.isSurfaceLocked()) return;

      const fullText = area.getAllText().trim();
      if (!fullText) return;

      if (
        options.source === "live-idle" &&
        fullText === lastLiveWorkflowTextRef.current
      ) {
        return;
      }

      if (applyingTypingWorkflowRef.current) return;
      applyingTypingWorkflowRef.current = true;

      try {
        await area.importClassifiedText(fullText, "replace");
        lastLiveWorkflowTextRef.current = area.getAllText().trim();

        logger.info("Typing workflow executed", {
          scope: "typing-system",
          data: {
            source: options.source,
            reviewProfile: options.reviewProfile,
            policyProfile: options.policyProfile,
          },
        });

        if (!options.suppressToasts) {
          toast({
            title:
              options.source === "live-idle"
                ? "تمت المعالجة الحية"
                : "تمت المعالجة المؤجلة",
            description: "تم تمرير كامل المستند عبر مصنف اللصق وتحديث البنية.",
          });
        }
      } catch (error) {
        logger.error("Typing workflow failed", {
          scope: "typing-system",
          data: error,
        });
        if (!options.suppressToasts) {
          recordDiagnostic(
            "تعذر تشغيل نظام الكتابة",
            error instanceof Error
              ? error.message
              : "حدث خطأ غير معروف أثناء المعالجة."
          );
          toast({
            title: "تعذر تشغيل نظام الكتابة",
            description:
              error instanceof Error
                ? error.message
                : "حدث خطأ غير معروف أثناء المعالجة.",
            variant: "destructive",
          });
        }
      } finally {
        applyingTypingWorkflowRef.current = false;
      }
    },
    []
  );

  const runForcedProductionSelfCheck = useCallback(
    async (
      trigger: "manual-auto-check" | "manual-reclassify"
    ): Promise<void> => {
      const area = editorAreaRef.current;
      if (!area) return;

      try {
        const { runProductionSelfCheck } =
          await import("./extensions/production-self-check");
        const report = await runProductionSelfCheck({
          trigger,
          sampleText: area.getAllText(),
          force: true,
        });

        if (report.failedFunctions === 0) {
          toast({
            title: "فحص التكامل مكتمل",
            description: `تم تشغيل ${report.executedFunctions} دالة بنجاح عبر مسار الإنتاج.`,
          });
          return;
        }

        toast({
          title: "فحص التكامل اكتشف أخطاء",
          description: `نجح ${report.executedFunctions - report.failedFunctions} وفشل ${report.failedFunctions}.`,
          variant: "destructive",
        });
      } catch (error) {
        logger.error("Forced production self-check failed", {
          scope: "self-check",
          data: error,
        });
        recordDiagnostic(
          "تعذر تشغيل فحص التكامل",
          error instanceof Error
            ? error.message
            : "حدث خطأ غير معروف أثناء فحص التكامل."
        );
        toast({
          title: "تعذر تشغيل فحص التكامل",
          description:
            error instanceof Error
              ? error.message
              : "حدث خطأ غير معروف أثناء فحص التكامل.",
          variant: "destructive",
        });
      }
    },
    [recordDiagnostic]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const liveIdleDelayMs = minutesToMilliseconds(
      typingSystemSettings.liveIdleMinutes
    );
    if (typingSystemSettings.typingSystemMode !== "auto-live") {
      if (liveTypingWorkflowTimeoutRef.current !== null) {
        window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
        liveTypingWorkflowTimeoutRef.current = null;
      }
      return;
    }

    const normalizedText = documentText.trim();
    if (!normalizedText) return;
    if (applyingTypingWorkflowRef.current) return;
    if (progressiveSurfaceState?.activeRun?.surfaceLocked) return;
    if (normalizedText === lastLiveWorkflowTextRef.current) return;

    if (liveTypingWorkflowTimeoutRef.current !== null) {
      window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
    }

    liveTypingWorkflowTimeoutRef.current = window.setTimeout(() => {
      liveTypingWorkflowTimeoutRef.current = null;
      void runDocumentThroughPasteWorkflow({
        source: "live-idle",
        reviewProfile: "silent-live",
        policyProfile: "strict-structure",
        suppressToasts: true,
      });
    }, liveIdleDelayMs);

    return () => {
      if (liveTypingWorkflowTimeoutRef.current !== null) {
        window.clearTimeout(liveTypingWorkflowTimeoutRef.current);
        liveTypingWorkflowTimeoutRef.current = null;
      }
    };
  }, [
    documentText,
    progressiveSurfaceState?.activeRun?.surfaceLocked,
    runDocumentThroughPasteWorkflow,
    typingSystemSettings,
  ]);

  const approveCurrentVersion = useCallback(async (): Promise<void> => {
    const area = editorAreaRef.current;
    if (!area) return;

    try {
      await area.approveCurrentVersion();
      toast({
        title: "تم اعتماد النسخة",
        description: "تم وسم كل العناصر الظاهرة في النسخة المعتمدة.",
      });
    } catch (error) {
      recordDiagnostic(
        "تعذر اعتماد النسخة",
        error instanceof Error
          ? error.message
          : "حدث خطأ غير معروف أثناء اعتماد النسخة."
      );
      toast({
        title: "تعذر اعتماد النسخة",
        description:
          error instanceof Error
            ? error.message
            : "حدث خطأ غير معروف أثناء اعتماد النسخة.",
        variant: "destructive",
      });
    }
  }, [recordDiagnostic]);

  const dismissProgressiveFailure = useCallback((): void => {
    const area = editorAreaRef.current;
    if (!area) return;

    const dismissed = area.dismissProgressiveFailure();
    if (!dismissed) return;

    toast({
      title: "تم إغلاق حالة الفشل",
      description: "حافظنا على آخر نسخة صالحة وأعدنا فتح السطح لتشغيل جديد.",
    });
  }, []);

  /* ── اختصارات لوحة المفاتيح العامة ── */
  useEffect(() => {
    const handleGlobalShortcut = (event: KeyboardEvent): void => {
      if (!(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();

      // مراقب الـ pipeline — يعمل حتى لو المحرر مش جاهز
      if (event.shiftKey && key === "m") {
        event.preventDefault();
        setShowPipelineMonitor((prev) => !prev);
        return;
      }

      const area = editorAreaRef.current;
      if (!area) return;
      const targetElement = event.target as HTMLElement | null;
      const activeElement =
        typeof document !== "undefined"
          ? (document.activeElement as HTMLElement | null)
          : null;
      const isEditorFocused = Boolean(
        targetElement?.closest(".ProseMirror") ??
          activeElement?.closest(".ProseMirror") ??
          targetElement?.isContentEditable ??
          activeElement?.isContentEditable ??
          area.editor.view.hasFocus()
      );

      if (key in SHORTCUT_FORMAT_BY_DIGIT) {
        event.preventDefault();
        const shortcutFormat = SHORTCUT_FORMAT_BY_DIGIT[key];
        if (shortcutFormat) {
          area.setFormat(shortcutFormat);
        }
        return;
      }

      switch (key) {
        case "s":
          event.preventDefault();
          void handleMenuActionRef.current?.("save-file");
          break;
        case "o":
          event.preventDefault();
          void handleMenuActionRef.current?.("open-file");
          break;
        case "n":
          event.preventDefault();
          void handleMenuActionRef.current?.("new-file");
          break;
        case "a":
          if (isEditorFocused) {
            event.preventDefault();
            area.runCommand({ command: "select-all" });
          }
          break;
        case "c":
          if (isEditorFocused || area.hasSelection()) {
            event.preventDefault();
            void handleMenuActionRef.current?.("copy");
          }
          break;
        case "x":
          if (isEditorFocused || area.hasSelection()) {
            event.preventDefault();
            void handleMenuActionRef.current?.("cut");
          }
          break;
        case "v":
          if (isEditorFocused) {
            event.preventDefault();
            void handleMenuActionRef.current?.("paste");
          }
          break;
        case "z":
          event.preventDefault();
          area.runCommand("undo");
          break;
        case "y":
          event.preventDefault();
          area.runCommand("redo");
          break;
        case "b":
          event.preventDefault();
          area.runCommand("bold");
          break;
        case "i":
          event.preventDefault();
          area.runCommand("italic");
          break;
        case "u":
          event.preventDefault();
          area.runCommand("underline");
          break;
        default:
          break;
      }
    };

    // capture: true يضمن تنفيذ المعالج قبل أي handler آخر ومنع المتصفح من اعتراض Ctrl+B/I/Z
    document.addEventListener("keydown", handleGlobalShortcut, true);
    return () =>
      document.removeEventListener("keydown", handleGlobalShortcut, true);
  }, []);

  const resolveMenuCommand = useMenuCommandResolver(editorAreaRef, toast);

  const actionDeps: EditorActionsDeps = {
    getArea: () => editorAreaRef.current,
    toast,
    resolveMenuCommand,
    isProgressiveSurfaceLocked: () =>
      editorAreaRef.current?.isSurfaceLocked() ?? false,
    runDocumentThroughPasteWorkflow,
    runForcedProductionSelfCheck,
    restoreAutosaveDraft,
    recordDiagnostic,
  };

  const dispatchMenuAction = async (actionId: MenuActionId): Promise<void> => {
    setActiveMenu(null);
    await handleMenuAction(actionId, actionDeps);
  };

  handleMenuActionRef.current = dispatchMenuAction;

  const currentFormatLabel = currentFormat
    ? FORMAT_LABEL_BY_TYPE[currentFormat]
    : "—";

  /* ──────────────────────── JSX ──────────────────────── */
  return (
    <div
      className="editor-modern-floating app-root flex h-screen flex-col overflow-hidden font-['Cairo'] selection:bg-[color:var(--mf-accent)]/25"
      dir="rtl"
      data-testid="app-root"
    >
      <BackgroundGrid />
      <AppHeader
        menuSections={MENU_SECTIONS}
        activeMenu={activeMenu}
        onToggleMenu={(sectionLabel) =>
          setActiveMenu((prev) => (prev === sectionLabel ? null : sectionLabel))
        }
        activeProjectTitle={activeProjectTitle}
        progressiveSurfaceState={progressiveSurfaceState}
        onApproveVisibleVersion={() => {
          void approveCurrentVersion();
        }}
        onDismissFailure={dismissProgressiveFailure}
        onAction={(actionId) => {
          void dispatchMenuAction(actionId as MenuActionId);
        }}
        infoDotColor={semanticColors.info}
        brandGradient={gradients.jungle}
        onlineDotColor={brandColors.jungleGreen}
      />

      <div
        className="app-main relative z-10 flex flex-1 overflow-hidden"
        suppressHydrationWarning
      >
        <div className="app-stage relative flex min-h-full min-w-0 flex-1">
          {!isCompact && (
            <AppSidebar
              sections={SIDEBAR_SECTIONS}
              openSectionId={openSidebarItem}
              isMobile={isMobile}
              documentText={documentText}
              onEditorSearchJump={(query) => {
                const area = editorAreaRef.current;
                if (!area) return;
                area.findAndFocus(query);
              }}
              onToggleSection={(sectionId) =>
                setOpenSidebarItem((prev) =>
                  prev === sectionId ? null : sectionId
                )
              }
              onItemAction={(sectionId, itemLabel) => {
                void handleSidebarItemAction(sectionId, itemLabel, actionDeps);
              }}
              settingsPanel={
                <SettingsPanel
                  typingSystemSettings={typingSystemSettings}
                  onTypingModeChange={handleTypingModeChange}
                  onLiveIdleMinutesChange={handleLiveIdleMinutesChange}
                  onRunExportClassified={() => {
                    void runExport("classified", actionDeps, "النص_المصنف");
                  }}
                  onRunProcessNow={() => {
                    void runDocumentThroughPasteWorkflow({
                      source: "manual-deferred",
                      reviewProfile: "interactive",
                      policyProfile: "strict-structure",
                    });
                  }}
                  lockedEditorFontLabel={LOCKED_EDITOR_FONT_LABEL}
                  lockedEditorSizeLabel={LOCKED_EDITOR_SIZE_LABEL}
                  supportedLegacyFormatCount={SUPPORTED_LEGACY_FORMAT_COUNT}
                  classifierOptionCount={CLASSIFIER_OPTION_COUNT}
                  actionBlockSpacing={ACTION_BLOCK_SPACING}
                  hasFileImportBackend={hasFileImportBackend}
                />
              }
            />
          )}

          <main className="app-editor-main relative flex min-w-0 flex-1 flex-col overflow-hidden">
            <AppDock
              buttons={DOCK_BUTTONS}
              isMobile={isMobile}
              isCompact={isCompact}
              onAction={(actionId) => {
                void dispatchMenuAction(actionId as MenuActionId);
              }}
            />

            <div
              className="app-editor-scroll scrollbar-none relative flex flex-1 justify-center overflow-x-hidden overflow-y-auto"
              style={{
                paddingTop: `${EDITOR_CANVAS_TOP_OFFSET_PX}px`,
                paddingRight: `${
                  isCompact
                    ? EDITOR_CANVAS_COMPACT_GUTTER_PX
                    : EDITOR_CANVAS_RIGHT_RESERVE_PX
                }px`,
                paddingLeft: `${
                  isCompact
                    ? EDITOR_CANVAS_COMPACT_GUTTER_PX
                    : EDITOR_CANVAS_LEFT_GUTTER_PX
                }px`,
                paddingBottom: `${EDITOR_CANVAS_BOTTOM_OFFSET_PX}px`,
              }}
              onClick={(e) => {
                // منح التركيز للمحرر عند النقر في المنطقة البيضاء خارج الورقة
                const target = e.target as HTMLElement;
                if (target.closest(".ProseMirror")) return;
                editorAreaRef.current?.focusEditor();
              }}
            >
              <DotBackground />
              <div
                className="app-editor-shell relative mx-auto w-full pb-20"
                style={{
                  maxWidth: `${
                    isCompact
                      ? EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX
                      : EDITOR_CANVAS_WIDTH_PX
                  }px`,
                  minWidth: `${
                    isCompact
                      ? EDITOR_CANVAS_COMPACT_SHELL_WIDTH_PX
                      : EDITOR_CANVAS_WIDTH_PX
                  }px`,
                }}
              >
                <div
                  ref={editorMountRef}
                  className="editor-area app-editor-host"
                  data-testid="editor-area"
                />
              </div>
            </div>
          </main>
        </div>
      </div>

      <AppFooter
        stats={stats}
        currentFormatLabel={currentFormatLabel}
        isMobile={isMobile}
      />

      <PipelineMonitor
        visible={showPipelineMonitor}
        progressiveSurfaceState={progressiveSurfaceState}
        onDismissFailure={dismissProgressiveFailure}
        onClose={() => setShowPipelineMonitor(false)}
      />

      {diagnosticEvents.length > 0 ? (
        <aside
          className="editor-diagnostics-log fixed right-4 bottom-20 z-50 w-[min(92vw,420px)] rounded-2xl border border-red-500/25 bg-red-950/85 p-3 text-right text-red-50 shadow-2xl backdrop-blur-xl"
          data-testid="editor-diagnostics-log"
          role="status"
          aria-live="polite"
        >
          <div className="mb-2 text-xs font-bold">سجل تشخيص المحرر</div>
          <div className="space-y-2">
            {diagnosticEvents.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-white/10 bg-white/5 p-2"
              >
                <div className="text-xs font-bold">{event.title}</div>
                <div className="mt-1 text-[11px] leading-5 text-red-100/85">
                  {event.message}
                </div>
              </div>
            ))}
          </div>
        </aside>
      ) : null}

      <div className="sr-only">
        {screenplayFormats.map((format) => (
          <span key={format.id}>{format.label}</span>
        ))}
      </div>
    </div>
  );
}

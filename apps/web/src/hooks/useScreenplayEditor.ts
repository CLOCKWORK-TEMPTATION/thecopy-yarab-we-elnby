/**
 * Screenplay Editor Hooks - هوks محرر السيناريو
 *
 * hooks مخصصة لاستخدامها مع محرر السيناريو العربي
 *
 * @module hooks/useScreenplayEditor
 */

import { useEffect, useCallback, useRef } from "react";

import { logger } from "@/lib/ai/utils/logger";
import { ScreenplayClassifier } from "@/lib/screenplay/classifier";
import { useScreenplayStore } from "@/lib/stores/screenplayStore";

import type { FormattedLine } from "@/lib/stores/screenplayStore";

/**
 * hook لمحرر السيناريو
 * يوفر جميع الوظائف المطلوبة للمحرر
 */
export function useScreenplayEditor(documentId?: string) {
  const {
    content,
    formattedLines,
    cursorPosition,
    selection,
    isDirty,
    stats,
    settings,
    isSaving,
    isLoading,
    currentFormat,
    setContent,
    setFormattedLines,
    setCursorPosition,
    setSelection,
    saveDocument,
    loadDocument,
    exportDocument,
    markDirty,
    markClean,
    calculateStats,
    setCurrentFormat,
  } = useScreenplayStore();

  // Classifier instance
  const classifierRef = useRef(new ScreenplayClassifier());

  /**
   * Auto-save effect
   */
  useEffect(() => {
    if (!documentId || !isDirty) return;

    const timer = setTimeout(() => {
      saveDocument().catch((error: unknown) => {
        logger.error("فشل الحفظ التلقائي للمستند", error);
      });
    }, settings.autoSaveInterval);

    return () => clearTimeout(timer);
  }, [content, isDirty, documentId, settings.autoSaveInterval]);

  /**
   * Load document on mount
   */
  useEffect(() => {
    if (documentId) {
      loadDocument(documentId).catch((error: unknown) => {
        logger.error("فشل تحميل المستند", error);
      });
    }
  }, [documentId]);

  /**
   * Process text and classify lines
   */
  const processText = useCallback(
    (text: string) => {
      const lines = text.split("\n");
      const newFormattedLines: FormattedLine[] = [];
      let lineNumber = 0;

      for (const line of lines) {
        lineNumber++;

        const lineType = classifierRef.current.classifyLine(line);

        newFormattedLines.push({
          id: `line_${lineNumber}_${Date.now()}`,
          text: line,
          type: lineType,
          number: lineNumber,
        });
      }

      setContent(text);
      setFormattedLines(newFormattedLines);
      calculateStats();
    },
    [setContent, setFormattedLines, calculateStats]
  );

  /**
   * Insert text at cursor
   */
  const insertText = useCallback(
    (text: string) => {
      if (selection) {
        const { start, end } = selection;
        const newContent =
          content.substring(0, start) + text + content.substring(end);
        processText(newContent);
        setCursorPosition(start + text.length);
        setSelection(null);
      } else {
        const newContent =
          content.substring(0, cursorPosition) +
          text +
          content.substring(cursorPosition);
        processText(newContent);
        setCursorPosition(cursorPosition + text.length);
      }

      markDirty();
    },
    [content, cursorPosition, selection, processText, markDirty]
  );

  /**
   * Delete text
   */
  const deleteText = useCallback(
    (start: number, end: number) => {
      const newContent = content.substring(0, start) + content.substring(end);
      processText(newContent);
      setCursorPosition(start);
      markDirty();
    },
    [content, processText, markDirty]
  );

  /**
   * Replace text
   */
  const replaceText = useCallback(
    (start: number, end: number, text: string) => {
      const newContent =
        content.substring(0, start) + text + content.substring(end);
      processText(newContent);
      setCursorPosition(start + text.length);
      markDirty();
    },
    [content, processText, markDirty]
  );

  /**
   * Format line
   */
  const formatLine = useCallback(
    (lineNumber: number, formatType: string) => {
      const newFormattedLines = [...formattedLines];
      if (newFormattedLines[lineNumber]) {
        newFormattedLines[lineNumber].type = formatType;
        setFormattedLines(newFormattedLines);
      }
    },
    [formattedLines, setFormattedLines]
  );

  /**
   * Apply formatting
   */
  const applyFormatting = useCallback(
    (formatType: string) => {
      if (selection) {
        // Format selected text
        const { start, end } = selection;

        let startLine = -1;
        let endLine = -1;
        let currentPos = 0;

        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i] ?? "";
          const lineEnd = currentPos + line.length;

          if (startLine === -1 && start <= lineEnd) {
            startLine = i;
          }

          if (endLine === -1 && end <= lineEnd + 1) {
            endLine = i;
          }

          currentPos = lineEnd + 1;
        }

        if (endLine === -1) endLine = lines.length - 1;
        if (startLine === -1) startLine = 0;

        const newFormattedLines = [...formattedLines];
        let hasChanges = false;

        for (let i = startLine; i <= endLine; i++) {
          const formattedLine = newFormattedLines[i];
          if (formattedLine && formattedLine.type !== formatType) {
            newFormattedLines[i] = {
              ...formattedLine,
              type: formatType,
            };
            hasChanges = true;
          }
        }

        if (hasChanges) {
          setFormattedLines(newFormattedLines);
          markDirty();
        }
      } else {
        // Format current line
        setCurrentFormat(formatType);
      }
    },
    [
      content,
      selection,
      formattedLines,
      setFormattedLines,
      markDirty,
      setCurrentFormat,
    ]
  );

  return {
    // State
    content,
    formattedLines,
    cursorPosition,
    selection,
    isDirty,
    stats,
    settings,
    isSaving,
    isLoading,
    currentFormat,

    // Actions
    processText,
    insertText,
    deleteText,
    replaceText,
    formatLine,
    applyFormatting,
    saveDocument,
    exportDocument,
    markDirty,
    markClean,
    setCurrentFormat,
  };
}

/**
 * hook للتصدير
 */
export function useExportScreenplay() {
  const { content, exportDocument } = useScreenplayStore();

  const exportAsHTML = useCallback(() => {
    return exportDocument("html");
  }, [exportDocument]);

  const exportAsTXT = useCallback(() => {
    return exportDocument("txt");
  }, [exportDocument]);

  const exportAsPDF = useCallback(() => {
    return exportDocument("pdf");
  }, [exportDocument]);

  return {
    exportAsHTML,
    exportAsTXT,
    exportAsPDF,
    content,
  };
}

/**
 * hook للإحصائيات
 */
export function useScreenplayStats() {
  const { stats, calculateStats } = useScreenplayStore();

  useEffect(() => {
    calculateStats();
  }, []);

  return stats;
}

/**
 * hook للإعدادات
 */
export function useEditorSettings() {
  const { settings, updateSettings, setFontSize, setFontFamily, toggleTheme } =
    useScreenplayStore();

  return {
    settings,
    updateSettings,
    setFontSize,
    setFontFamily,
    toggleTheme,
  };
}

/**
 * hook للحفظ التلقائي
 */
export function useAutoSave(interval = 30000) {
  const { isDirty, saveDocument, updateSettings } = useScreenplayStore();

  useEffect(() => {
    // Update auto-save interval
    updateSettings({ autoSaveInterval: interval });
  }, [interval, updateSettings]);

  useEffect(() => {
    if (!isDirty) return;

    const timer = setInterval(() => {
      saveDocument().catch((error: unknown) => {
        logger.error("فشل الحفظ التلقائي المتكرر", error);
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isDirty, interval, saveDocument]);
}

/**
 * hook لتصنيف النصوص
 */
export function useClassifier() {
  const classifierRef = useRef(new ScreenplayClassifier());

  /**
   * Classify a single line
   */
  const classifyLine = useCallback((line: string) => {
    return classifierRef.current.classifyLine(line);
  }, []);

  /**
   * Classify multiple lines
   */
  const classifyLines = useCallback(
    (lines: string[]) => {
      return lines.map((line) => classifyLine(line));
    },
    [classifyLine]
  );

  /**
   * Check if line is specific type
   */
  const isBasmala = useCallback((line: string) => {
    return ScreenplayClassifier.isBasmala(line);
  }, []);

  const isSceneHeader = useCallback((line: string) => {
    return ScreenplayClassifier.isSceneHeaderStart(line);
  }, []);

  const isCharacter = useCallback((line: string) => {
    return ScreenplayClassifier.isCharacterLine(line);
  }, []);

  const isDialogue = useCallback((line: string) => {
    return (
      !ScreenplayClassifier.isLikelyAction(line) &&
      !ScreenplayClassifier.isSceneHeaderStart(line) &&
      !ScreenplayClassifier.isCharacterLine(line)
    );
  }, []);

  const isAction = useCallback((line: string) => {
    return ScreenplayClassifier.isLikelyAction(line);
  }, []);

  const isTransition = useCallback((line: string) => {
    return ScreenplayClassifier.isTransition(line);
  }, []);

  return {
    classifyLine,
    classifyLines,
    isBasmala,
    isSceneHeader,
    isCharacter,
    isDialogue,
    isAction,
    isTransition,
  };
}

/**
 * @fileoverview خطاف وضع اختبار الحفظ
 * يدير كل منطق حفظ النصوص بما في ذلك التتبع والتحقق والتلقين
 * @reason فصل المنطق المعقد (>10 أسطر) إلى خطاف مستقل لتحسين قابلية الصيانة
 */

"use client";

import { useState, useCallback, useRef } from "react";

import { postToBackend } from "@/lib/backend-api";

import { createDeterministicMemorizationMask } from "../lib/studio-engines";
import {
  VALIDATION_CONSTANTS,
  SAMPLE_MEMORIZATION_SCRIPT,
} from "../types/constants";

import type { MemorizationStats } from "../types";

/**
 * مستوى حذف الكلمات
 * @description نسبة الكلمات المحذوفة من النص للاختبار
 */
export type DeletionLevel = 10 | 50 | 90;

/**
 * حالة وضع الحفظ
 */
export interface MemorizationState {
  /** النص المراد حفظه */
  script: string;
  /** مستوى صعوبة الحذف */
  deletionLevel: DeletionLevel;
  /** هل الجلسة نشطة */
  isActive: boolean;
  /** هل الجلسة متوقفة مؤقتاً */
  isPaused: boolean;
  /** هل وضع التلقين مفعل */
  isPromptMode: boolean;
  /** فهرس السطر الحالي */
  currentLineIndex: number;
  /** إدخال المستخدم الحالي */
  userInput: string;
  /** هل تم اكتشاف تردد */
  hesitationDetected: boolean;
  /** إحصائيات الجلسة */
  stats: MemorizationStats;
  /** هل يُعرض تلميح التلقين */
  showPromptHint: boolean;
  /** الكلمة الحالية للتلقين */
  currentPromptWord: string;
}

/**
 * القيم الافتراضية لإحصائيات الحفظ
 */
const DEFAULT_STATS: MemorizationStats = {
  totalAttempts: 0,
  correctWords: 0,
  incorrectWords: 0,
  hesitationCount: 0,
  weakPoints: [],
  averageResponseTime: 0,
};

/**
 * واجهة قيمة العودة من خطاف الحفظ
 */
export interface UseMemorizationReturn {
  /** حالة الحفظ الكاملة */
  state: MemorizationState;
  /** تعيين نص الحفظ */
  setScript: (script: string) => void;
  /** تعيين مستوى الصعوبة */
  setDeletionLevel: (level: DeletionLevel) => void;
  /** بدء جلسة الحفظ */
  startSession: () => { success: boolean; error?: string };
  /** إيقاف جلسة الحفظ */
  stopSession: () => void;
  /** إيقاف مؤقت/استئناف */
  togglePause: () => void;
  /** معالجة إدخال المستخدم */
  handleInput: (value: string) => void;
  /** تقديم إجابة */
  submitAnswer: () => { correct: number; incorrect: number };
  /** تحميل نص نموذجي */
  loadSampleScript: () => void;
  /** زيادة مستوى الصعوبة */
  increaseDifficulty: () => void;
  /** الحصول على الأجزاء الصعبة */
  getDifficultParts: () => string[];
  /** معالجة النص للحفظ (حذف كلمات) */
  processTextForDisplay: () => string;
  /** إعادة التعيين */
  reset: () => void;
}

/**
 * خطاف إدارة وضع اختبار الحفظ
 * @description يدير كل منطق حفظ النصوص بما في ذلك:
 * - حذف كلمات عشوائية حسب مستوى الصعوبة
 * - اكتشاف التردد والتلقين
 * - تتبع نقاط الضعف والإحصائيات
 * - حساب متوسط وقت الاستجابة
 *
 * @example
 * ```tsx
 * const {
 *   state,
 *   setScript,
 *   startSession,
 *   handleInput,
 *   submitAnswer
 * } = useMemorization();
 *
 * // بدء جلسة
 * setScript("النص المراد حفظه...");
 * const result = startSession();
 * if (!result.success) {
 *   console.error(result.error);
 * }
 * ```
 */
export function useMemorization(): UseMemorizationReturn {
  // الحالة الرئيسية
  const [script, setScriptState] = useState("");
  const [deletionLevel, setDeletionLevelState] = useState<DeletionLevel>(10);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPromptMode, setIsPromptMode] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [hesitationDetected, setHesitationDetected] = useState(false);
  const [stats, setStats] = useState<MemorizationStats>(DEFAULT_STATS);
  const [showPromptHint, setShowPromptHint] = useState(false);
  const [currentPromptWord, setCurrentPromptWord] = useState("");

  // مراجع للتتبع
  const hesitationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const attemptStartTimeRef = useRef<number>(0);
  const responseTimesRef = useRef<number[]>([]);
  const weakPointsMapRef = useRef<Map<string, number>>(new Map());

  /**
   * تنظيف مؤقت التردد
   */
  const clearHesitationTimer = useCallback(() => {
    if (hesitationTimerRef.current) {
      clearTimeout(hesitationTimerRef.current);
      hesitationTimerRef.current = null;
    }
  }, []);

  /**
   * تفعيل وضع التلقين
   */
  const activatePromptMode = useCallback(() => {
    setIsPromptMode(true);
    setHesitationDetected(true);
    setStats((prev) => ({
      ...prev,
      hesitationCount: prev.hesitationCount + 1,
    }));

    // عرض تلميح للكلمة التالية
    const lines = script.split("\n");
    const currentLine = lines[currentLineIndex];
    if (currentLine) {
      const words = currentLine.split(/\s+/);
      const firstWord = words[0];
      if (firstWord) {
        setCurrentPromptWord(firstWord);
        setShowPromptHint(true);
      }
    }
  }, [script, currentLineIndex]);

  /**
   * تعيين نص الحفظ
   */
  const setScript = useCallback((newScript: string) => {
    setScriptState(newScript);
  }, []);

  /**
   * تعيين مستوى الصعوبة
   */
  const setDeletionLevel = useCallback((level: DeletionLevel) => {
    setDeletionLevelState(level);
  }, []);

  /**
   * بدء جلسة الحفظ
   */
  const startSession = useCallback((): { success: boolean; error?: string } => {
    if (!script.trim()) {
      return { success: false, error: "الرجاء إدخال نص للحفظ أولاً" };
    }

    if (script.length < VALIDATION_CONSTANTS.MIN_SCRIPT_LENGTH) {
      return { success: false, error: "النص قصير جداً للحفظ" };
    }

    // إعادة تعيين الحالة
    setIsActive(true);
    setIsPaused(false);
    setCurrentLineIndex(0);
    setUserInput("");
    setHesitationDetected(false);
    setIsPromptMode(false);
    setShowPromptHint(false);
    attemptStartTimeRef.current = Date.now();
    responseTimesRef.current = [];
    weakPointsMapRef.current = new Map();
    setStats(DEFAULT_STATS);

    return { success: true };
  }, [script]);

  /**
   * إيقاف جلسة الحفظ
   */
  const stopSession = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    clearHesitationTimer();

    // حساب متوسط وقت الاستجابة
    const times = responseTimesRef.current;
    if (times.length > 0) {
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      setStats((prev) => {
        const nextStats = {
          ...prev,
          averageResponseTime: Math.round((avgTime / 1000) * 10) / 10,
        };

        void postToBackend("/api/public/actorai/memorization", nextStats, {
          bestEffort: true,
        });

        return nextStats;
      });
    }
  }, [clearHesitationTimer]);

  /**
   * إيقاف مؤقت/استئناف
   */
  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  /**
   * معالجة إدخال المستخدم
   */
  const handleInput = useCallback(
    (value: string) => {
      setUserInput(value);

      // إعادة تعيين مؤقت التردد
      clearHesitationTimer();

      // بدء مؤقت جديد للتردد
      hesitationTimerRef.current = setTimeout(() => {
        if (isActive && !isPaused) {
          activatePromptMode();
        }
      }, VALIDATION_CONSTANTS.HESITATION_TIMEOUT);
    },
    [isActive, isPaused, activatePromptMode, clearHesitationTimer]
  );

  /**
   * تقديم إجابة والتحقق منها
   */
  const submitAnswer = useCallback((): {
    correct: number;
    incorrect: number;
  } => {
    const responseTime = Date.now() - attemptStartTimeRef.current;
    responseTimesRef.current.push(responseTime);

    const lines = script.split("\n");
    const currentLine = lines[currentLineIndex];

    if (!currentLine) {
      return { correct: 0, incorrect: 0 };
    }

    const correctLineText = currentLine.trim();
    const userLineText = userInput.trim();

    // مقارنة كلمة بكلمة
    const correctWords = correctLineText.split(/\s+/);
    const userWords = userLineText.split(/\s+/);

    let correct = 0;
    let incorrect = 0;
    const weakWords: string[] = [];

    correctWords.forEach((word, index) => {
      if (userWords[index]?.toLowerCase() === word.toLowerCase()) {
        correct++;
      } else {
        incorrect++;
        weakWords.push(word);

        // تتبع نقاط الضعف
        const currentCount = weakPointsMapRef.current.get(word) ?? 0;
        weakPointsMapRef.current.set(word, currentCount + 1);
      }
    });

    // تحديث الإحصائيات
    setStats((prev) => ({
      ...prev,
      totalAttempts: prev.totalAttempts + 1,
      correctWords: prev.correctWords + correct,
      incorrectWords: prev.incorrectWords + incorrect,
      weakPoints: [...new Set([...prev.weakPoints, ...weakWords])].slice(-10),
    }));

    // الانتقال للسطر التالي أو إنهاء الجلسة
    if (currentLineIndex < lines.length - 1) {
      setCurrentLineIndex((prev) => prev + 1);
      setUserInput("");
      attemptStartTimeRef.current = Date.now();
      setShowPromptHint(false);
      setIsPromptMode(false);
    } else {
      // انتهاء النص
      stopSession();
    }

    return { correct, incorrect };
  }, [script, currentLineIndex, userInput, stopSession]);

  /**
   * تحميل نص نموذجي
   */
  const loadSampleScript = useCallback(() => {
    setScriptState(SAMPLE_MEMORIZATION_SCRIPT);
  }, []);

  /**
   * زيادة مستوى الصعوبة
   */
  const increaseDifficulty = useCallback(() => {
    setDeletionLevelState((prev) => {
      if (prev === 10) return 50;
      if (prev === 50) return 90;
      return prev;
    });
  }, []);

  /**
   * الحصول على الأجزاء الصعبة
   */
  const getDifficultParts = useCallback((): string[] => {
    const entries = Array.from(weakPointsMapRef.current.entries());
    return entries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }, []);

  /**
   * معالجة النص للعرض (حذف كلمات)
   */
  const processTextForDisplay = useCallback((): string => {
    return createDeterministicMemorizationMask(script, deletionLevel);
  }, [script, deletionLevel]);

  /**
   * إعادة تعيين كل شيء
   */
  const reset = useCallback(() => {
    setScriptState("");
    setDeletionLevelState(10);
    setIsActive(false);
    setIsPaused(false);
    setIsPromptMode(false);
    setCurrentLineIndex(0);
    setUserInput("");
    setHesitationDetected(false);
    setStats(DEFAULT_STATS);
    setShowPromptHint(false);
    setCurrentPromptWord("");
    clearHesitationTimer();
    responseTimesRef.current = [];
    weakPointsMapRef.current = new Map();
  }, [clearHesitationTimer]);

  // تجميع الحالة
  const state: MemorizationState = {
    script,
    deletionLevel,
    isActive,
    isPaused,
    isPromptMode,
    currentLineIndex,
    userInput,
    hesitationDetected,
    stats,
    showPromptHint,
    currentPromptWord,
  };

  return {
    state,
    setScript,
    setDeletionLevel,
    startSession,
    stopSession,
    togglePause,
    handleInput,
    submitAnswer,
    loadSampleScript,
    increaseDifficulty,
    getDifficultParts,
    processTextForDisplay,
    reset,
  };
}

export default useMemorization;

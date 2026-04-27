"use client";

/**
 * @module useSessionPersistence
 * @description هوك حفظ واسترجاع جلسات تفكيك السيناريو
 *
 * السبب: يمنع فقدان التحليلات عند إعادة التحميل
 * ويتيح للمخرج الرجوع لتحليلات سابقة لنفس السيناريو أو سيناريوهات مختلفة
 */

import { useState, useCallback, useEffect } from "react";

/** مفتاح التخزين */
const STORAGE_KEY = "breakdown_sessions";
const AUTO_SAVE_KEY = "breakdown_autosave";
const AUTO_SAVE_INTERVAL = 30_000; // 30 ثانية

/** جلسة تفكيك محفوظة */
export interface SavedBreakdownSession {
  id: string;
  scriptTitle: string;
  scriptExcerpt: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
}

/** مخزن الجلسات */
interface SessionStore {
  sessions: SavedBreakdownSession[];
  version: number;
}

/**
 * قراءة المخزن
 */
function readStore(): SessionStore {
  if (typeof window === "undefined") return { sessions: [], version: 1 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], version: 1 };
    return JSON.parse(raw) as SessionStore;
  } catch {
    return { sessions: [], version: 1 };
  }
}

/**
 * كتابة المخزن
 */
function writeStore(store: SessionStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // مساحة ممتلئة
  }
}

export function useBreakdownSessionPersistence() {
  const [savedSessions, setSavedSessions] = useState<SavedBreakdownSession[]>(
    []
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const store = readStore();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedSessions(store.sessions);
    setIsLoaded(true);
  }, []);

  /**
   * حفظ جلسة
   */
  const saveSession = useCallback(
    (
      id: string,
      scriptTitle: string,
      scriptExcerpt: string,
      data: Record<string, unknown>
    ): void => {
      const store = readStore();
      const now = new Date().toISOString();

      const existingIndex = store.sessions.findIndex((s) => s.id === id);
      const existingSession =
        existingIndex >= 0 ? store.sessions[existingIndex] : undefined;
      const session: SavedBreakdownSession = {
        id,
        scriptTitle,
        scriptExcerpt: scriptExcerpt.substring(0, 200),
        createdAt: existingSession?.createdAt ?? now,
        updatedAt: now,
        data,
      };

      if (existingIndex >= 0) {
        store.sessions[existingIndex] = session;
      } else {
        store.sessions.unshift(session);
      }

      // الاحتفاظ بآخر 15 جلسة
      if (store.sessions.length > 15) {
        store.sessions = store.sessions.slice(0, 15);
      }

      writeStore(store);
      setSavedSessions([...store.sessions]);
    },
    []
  );

  /**
   * حذف جلسة
   */
  const deleteSession = useCallback((sessionId: string): void => {
    const store = readStore();
    store.sessions = store.sessions.filter((s) => s.id !== sessionId);
    writeStore(store);
    setSavedSessions([...store.sessions]);
  }, []);

  /**
   * تحميل جلسة
   */
  const loadSession = useCallback(
    (sessionId: string): SavedBreakdownSession | null => {
      const store = readStore();
      return store.sessions.find((s) => s.id === sessionId) ?? null;
    },
    []
  );

  /**
   * مسح جميع الجلسات
   */
  const clearAll = useCallback((): void => {
    writeStore({ sessions: [], version: 1 });
    setSavedSessions([]);
  }, []);

  /**
   * حفظ تلقائي مؤقت
   */
  const autoSave = useCallback((data: Record<string, unknown>): void => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        AUTO_SAVE_KEY,
        JSON.stringify({ data, savedAt: new Date().toISOString() })
      );
    } catch {
      // تجاهل
    }
  }, []);

  /**
   * استرجاع الحفظ التلقائي
   */
  const loadAutoSave = useCallback((): {
    data: Record<string, unknown>;
    savedAt: string;
  } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(AUTO_SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  /**
   * مسح الحفظ التلقائي
   */
  const clearAutoSave = useCallback((): void => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AUTO_SAVE_KEY);
  }, []);

  return {
    savedSessions,
    isLoaded,
    saveSession,
    deleteSession,
    loadSession,
    clearAll,
    autoSave,
    loadAutoSave,
    clearAutoSave,
    AUTO_SAVE_INTERVAL,
  };
}

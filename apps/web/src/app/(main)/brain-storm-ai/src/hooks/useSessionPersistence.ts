"use client";

/**
 * @module useSessionPersistence
 * @description هوك حفظ واسترجاع جلسات العصف الذهني من التخزين المحلي
 *
 * السبب: يمنع فقدان الجلسات عند إعادة تحميل الصفحة
 * ويتيح للمستخدم الرجوع لجلسات سابقة
 */

import { useState, useCallback, useEffect } from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import type { Session, DebateMessage } from "../types";

/** مفتاح التخزين */
const STORAGE_KEY = "brainstorm_sessions";
const CURRENT_BRAINSTORM_POINTER_KEY = "brainstorm_current_session";

/** جلسة محفوظة مع بيانات النقاش */
export interface SavedSession {
  session: Session;
  messages: DebateMessage[];
  savedAt: string;
}

/** قائمة الجلسات المحفوظة */
interface SessionStore {
  sessions: SavedSession[];
  version: number;
}

interface PersistedSavedSession {
  session: Omit<Session, "startTime"> & {
    startTime: string;
  };
  messages: (Omit<DebateMessage, "timestamp"> & {
    timestamp: string;
  })[];
  savedAt: string;
}

interface BrainstormPersistenceSnapshot {
  sessions: PersistedSavedSession[];
  currentSessionId: string | null;
  version: number;
}

function restoreSavedSession(value: unknown): SavedSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const saved = value as Partial<PersistedSavedSession>;
  if (
    !saved.session ||
    typeof saved.session !== "object" ||
    typeof saved.session.id !== "string" ||
    typeof saved.session.brief !== "string" ||
    typeof saved.session.phase !== "number" ||
    typeof saved.session.status !== "string" ||
    typeof saved.session.startTime !== "string" ||
    !Array.isArray(saved.session.activeAgents) ||
    !Array.isArray(saved.messages) ||
    typeof saved.savedAt !== "string"
  ) {
    return null;
  }

  return {
    session: {
      ...saved.session,
      startTime: new Date(saved.session.startTime),
    },
    messages: saved.messages
      .map((message) => {
        if (
          !message ||
          typeof message !== "object" ||
          typeof message.agentId !== "string" ||
          typeof message.agentName !== "string" ||
          typeof message.message !== "string" ||
          typeof message.timestamp !== "string" ||
          typeof message.type !== "string"
        ) {
          return null;
        }

        return {
          ...message,
          timestamp: new Date(message.timestamp),
        };
      })
      .filter((message): message is DebateMessage => Boolean(message)),
    savedAt: saved.savedAt,
  };
}

function serializeSavedSession(saved: SavedSession): PersistedSavedSession {
  return {
    session: {
      ...saved.session,
      startTime: saved.session.startTime.toISOString(),
    },
    messages: saved.messages.map((message) => ({
      ...message,
      timestamp: message.timestamp.toISOString(),
    })),
    savedAt: saved.savedAt,
  };
}

function readCurrentSessionIdFromStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(CURRENT_BRAINSTORM_POINTER_KEY);
}

async function persistRemoteStore(store: SessionStore): Promise<void> {
  await persistRemoteAppState<BrainstormPersistenceSnapshot>("brain-storm-ai", {
    sessions: store.sessions.map(serializeSavedSession),
    currentSessionId: readCurrentSessionIdFromStorage(),
    version: store.version,
  });
}

/**
 * قراءة المخزن من localStorage
 */
function readStore(): SessionStore {
  if (typeof window === "undefined") {
    return { sessions: [], version: 1 };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [], version: 1 };

    const parsed = JSON.parse(raw) as { sessions?: unknown; version?: number };
    return {
      sessions: Array.isArray(parsed.sessions)
        ? parsed.sessions
            .map((session) => restoreSavedSession(session))
            .filter((session): session is SavedSession => Boolean(session))
        : [],
      version: typeof parsed.version === "number" ? parsed.version : 1,
    };
  } catch {
    return { sessions: [], version: 1 };
  }
}

/**
 * كتابة المخزن إلى localStorage
 */
function writeStore(store: SessionStore): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessions: store.sessions.map(serializeSavedSession),
        version: store.version,
      })
    );
  } catch {
    // تجاهل أخطاء الكتابة (مساحة ممتلئة)
  }
}

export function useSessionPersistence() {
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>(
    () => readStore().sessions
  );
  const [isLoaded, setIsLoaded] = useState(false);

  /** تحميل الجلسات المحفوظة عند التهيئة */
  useEffect(() => {
    let cancelled = false;
    const localStore = readStore();

    void loadRemoteAppState<BrainstormPersistenceSnapshot>("brain-storm-ai")
      .then((snapshot) => {
        if (cancelled || !snapshot) {
          return;
        }

        const remoteSessions = Array.isArray(snapshot.sessions)
          ? snapshot.sessions
              .map((session) => restoreSavedSession(session))
              .filter((session): session is SavedSession => Boolean(session))
          : [];

        const nextStore: SessionStore =
          remoteSessions.length > 0
            ? {
                sessions: remoteSessions,
                version:
                  typeof snapshot.version === "number" ? snapshot.version : 1,
              }
            : localStore;

        writeStore(nextStore);
        if (typeof window !== "undefined") {
          if (snapshot.currentSessionId) {
            localStorage.setItem(
              CURRENT_BRAINSTORM_POINTER_KEY,
              snapshot.currentSessionId
            );
          } else {
            localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY);
          }
        }

        setSavedSessions(nextStore.sessions);
      })
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * حفظ جلسة حالية
   */
  const saveSession = useCallback(
    (session: Session, messages: DebateMessage[]): void => {
      const savedSession: SavedSession = {
        session: {
          ...session,
          startTime: session.startTime,
        },
        messages: messages.map((m) => ({
          ...m,
          timestamp: m.timestamp,
        })),
        savedAt: new Date().toISOString(),
      };

      const store = readStore();

      // تحديث الجلسة إذا كانت موجودة أو إضافتها
      const existingIndex = store.sessions.findIndex(
        (s) => s.session.id === session.id
      );
      if (existingIndex >= 0) {
        store.sessions[existingIndex] = savedSession;
      } else {
        store.sessions.unshift(savedSession);
      }

      // الاحتفاظ بآخر 20 جلسة فقط
      if (store.sessions.length > 20) {
        store.sessions = store.sessions.slice(0, 20);
      }

      writeStore(store);
      setSavedSessions([...store.sessions]);
      void persistRemoteStore(store).catch(() => {
        /* empty */
      });
    },
    []
  );

  /**
   * حذف جلسة محفوظة
   */
  const deleteSession = useCallback((sessionId: string): void => {
    const store = readStore();
    store.sessions = store.sessions.filter((s) => s.session.id !== sessionId);
    writeStore(store);
    setSavedSessions([...store.sessions]);
    void persistRemoteStore(store).catch(() => {
      /* empty */
    });
  }, []);

  /**
   * تحميل جلسة محفوظة
   */
  const loadSession = useCallback((sessionId: string): SavedSession | null => {
    const store = readStore();
    return store.sessions.find((s) => s.session.id === sessionId) ?? null;
  }, []);

  /**
   * مسح جميع الجلسات
   */
  const clearAllSessions = useCallback((): void => {
    writeStore({ sessions: [], version: 1 });
    setSavedSessions([]);
    if (typeof window !== "undefined") {
      localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY);
    }
    void persistRemoteAppState<BrainstormPersistenceSnapshot>(
      "brain-storm-ai",
      {
        sessions: [],
        currentSessionId: null,
        version: 1,
      }
    ).catch(() => {
      /* empty */
    });
  }, []);

  /**
   * حفظ معرّف الجلسة الحالية
   */
  const setCurrentSessionId = useCallback((id: string | null): void => {
    if (typeof window === "undefined") return;
    if (id) {
      localStorage.setItem(CURRENT_BRAINSTORM_POINTER_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_BRAINSTORM_POINTER_KEY);
    }

    const store = readStore();
    void persistRemoteAppState<BrainstormPersistenceSnapshot>(
      "brain-storm-ai",
      {
        sessions: store.sessions.map(serializeSavedSession),
        currentSessionId: id,
        version: store.version,
      }
    ).catch(() => {
      /* empty */
    });
  }, []);

  /**
   * استرجاع معرّف الجلسة الحالية
   */
  const getCurrentSessionId = useCallback((): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CURRENT_BRAINSTORM_POINTER_KEY);
  }, []);

  return {
    savedSessions,
    isLoaded,
    saveSession,
    deleteSession,
    loadSession,
    clearAllSessions,
    setCurrentSessionId,
    getCurrentSessionId,
  };
}

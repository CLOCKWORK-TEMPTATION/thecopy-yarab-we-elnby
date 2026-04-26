"use client";

/**
 * @fileoverview حاوية طبقة التشخيص — تجمع البيانات وتمررها للمكوّن البصري.
 *
 * - تستمع لاختصار `Ctrl+Shift+D` لتبديل الإظهار.
 * - تشترك في `diagnostics-bus` لتلقي تحديثات الكاميرا والمساعد وعدّاد الإعادة.
 * - تقرأ مفتاح `cinematography-studio.session.v1` من localStorage بشكل دوري.
 * - تظهر toast خفيف مرة واحدة عند تبديل الظهور لتأكيد الحالة.
 */

import * as React from "react";
import { toast } from "react-hot-toast";

import {
  snapshotDiagnostics,
  subscribeDiagnostics,
  type DiagnosticsPayload,
} from "../../lib/diagnostics-bus";
import { SESSION_STORAGE_KEY } from "../../lib/session-storage";

import {
  DiagnosticOverlay,
  type DiagnosticAssistantView,
  type DiagnosticCameraView,
  type DiagnosticOverlayProps,
} from "./DiagnosticOverlay";

const SESSION_POLL_INTERVAL_MS = 1000;

/**
 * يقرأ حجم القيمة المخزّنة في localStorage تحت مفتاح الجلسة وطابعها الزمني.
 */
function readSessionSnapshot(): {
  storageKey: string;
  payloadBytes: number;
  savedAt: string | null;
} {
  if (typeof window === "undefined") {
    return { storageKey: SESSION_STORAGE_KEY, payloadBytes: 0, savedAt: null };
  }
  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return {
        storageKey: SESSION_STORAGE_KEY,
        payloadBytes: 0,
        savedAt: null,
      };
    }
    let savedAt: string | null = null;
    try {
      const parsed = JSON.parse(raw) as { savedAt?: string };
      savedAt = typeof parsed.savedAt === "string" ? parsed.savedAt : null;
    } catch {
      savedAt = null;
    }
    return {
      storageKey: SESSION_STORAGE_KEY,
      payloadBytes: new Blob([raw]).size,
      savedAt,
    };
  } catch {
    return { storageKey: SESSION_STORAGE_KEY, payloadBytes: 0, savedAt: null };
  }
}

interface ContainerState {
  visible: boolean;
  camera: DiagnosticCameraView;
  assistant: DiagnosticAssistantView;
  session: ReturnType<typeof readSessionSnapshot>;
  viewport: { width: number; height: number };
  renderCounts: { studio: number; production: number };
}

const initialContainerState: ContainerState = {
  visible: false,
  camera: { permission: "idle", previewType: null, msSinceLastFrame: null },
  assistant: {
    isLoading: false,
    lastQuestion: null,
    answerLength: 0,
    error: null,
  },
  session: { storageKey: SESSION_STORAGE_KEY, payloadBytes: 0, savedAt: null },
  viewport: { width: 0, height: 0 },
  renderCounts: { studio: 0, production: 0 },
};

/**
 * المكوّن الحاوي. لا يستقبل props خارجية — يُعرّف بنفسه كل ما يحتاج.
 */
export function DiagnosticOverlayContainer(): React.ReactElement | null {
  const [containerState, setContainerState] = React.useState<ContainerState>(
    initialContainerState
  );

  // --- اشتراك في ناقل التشخيص لاستقبال أحداث الكاميرا والمساعد والـ render counts.
  React.useEffect(() => {
    const initial = snapshotDiagnostics();
    setContainerState((prev) => ({
      ...prev,
      camera: {
        permission: initial.camera.permission,
        previewType: initial.camera.previewType,
        msSinceLastFrame:
          initial.camera.lastFrameAt != null
            ? Date.now() - initial.camera.lastFrameAt
            : null,
      },
      assistant: { ...initial.assistant },
      renderCounts: {
        studio: initial.renderCount.studio ?? 0,
        production: initial.renderCount.production ?? 0,
      },
    }));

    const unsubscribe = subscribeDiagnostics((payload: DiagnosticsPayload) => {
      setContainerState((prev) => {
        if (payload.slice === "camera") {
          return {
            ...prev,
            camera: {
              permission: payload.data.permission,
              previewType: payload.data.previewType,
              msSinceLastFrame:
                payload.data.lastFrameAt != null
                  ? Date.now() - payload.data.lastFrameAt
                  : null,
            },
          };
        }
        if (payload.slice === "assistant") {
          return { ...prev, assistant: { ...payload.data } };
        }
        if (payload.slice === "renderCount") {
          return {
            ...prev,
            renderCounts: {
              studio: payload.data.studio ?? prev.renderCounts.studio,
              production:
                payload.data.production ?? prev.renderCounts.production,
            },
          };
        }
        return prev;
      });
    });

    return unsubscribe;
  }, []);

  // --- متابعة دورية لمحتوى الجلسة المحفوظة وحجمها.
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const updateSession = () => {
      setContainerState((prev) => ({
        ...prev,
        session: readSessionSnapshot(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      }));
    };
    updateSession();
    const timer = window.setInterval(updateSession, SESSION_POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  // --- اختصار لوحة المفاتيح Ctrl+Shift+D
  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (
        event.ctrlKey &&
        event.shiftKey &&
        (event.key === "D" || event.key === "d")
      ) {
        event.preventDefault();
        setContainerState((prev) => {
          const next = !prev.visible;
          try {
            toast(next ? "Diagnostics: ON" : "Diagnostics: OFF", {
              id: "cine-diagnostics-toggle",
              duration: 1200,
            });
          } catch {
            // toast يفشل صامتًا في الاختبارات.
          }
          return { ...prev, visible: next };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const overlayProps: DiagnosticOverlayProps = {
    visible: containerState.visible,
    camera: containerState.camera,
    session: containerState.session,
    assistant: containerState.assistant,
    viewport: containerState.viewport,
    renderCounts: containerState.renderCounts,
  };

  return <DiagnosticOverlay {...overlayProps} />;
}

export default DiagnosticOverlayContainer;

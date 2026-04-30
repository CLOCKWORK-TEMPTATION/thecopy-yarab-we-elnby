"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

import {
  buildExportFileName,
  inferExtensionFromMimeType,
  writeStoredSelfTapeTakes,
} from "../../lib/self-tape";

import { SAMPLE_SCRIPT } from "./constants";
import { delay, loadInitialTakes, toPersistedTake } from "./utils";

import type {
  ActiveTool,
  ComparisonView,
  ExportSettings,
  NoteType,
  Take,
  TakeNote,
  TeleprompterSettings,
} from "./types";

// ─── Types ───

interface UseSelfTapeSuiteOptions {
  blobRegistryRef: React.RefObject<Map<string, Blob>>;
  sessionUrlRegistryRef: React.RefObject<Map<string, string>>;
}

interface RemoteSnapshot {
  scriptText: string;
  takes: import("../../lib/self-tape").PersistedSelfTapeTake[];
  activeTool: ActiveTool;
  teleprompterSettings: TeleprompterSettings;
  exportSettings: ExportSettings;
  comparisonView: ComparisonView;
  notesTakeId: string | null;
}

// ─── File-level helpers ───

function applyRemoteSnapshot(
  snapshot: Partial<RemoteSnapshot>,
  setters: {
    setScriptText: (v: string) => void;
    setTakes: (v: Take[]) => void;
    setActiveTool: (v: ActiveTool) => void;
    setTeleprompterSettings: (v: TeleprompterSettings) => void;
    setExportSettings: (v: ExportSettings) => void;
    setComparisonView: React.Dispatch<React.SetStateAction<ComparisonView>>;
    setNotesTakeId: (v: string | null) => void;
  }
): void {
  if (snapshot.scriptText) {
    setters.setScriptText(snapshot.scriptText);
  }

  if (Array.isArray(snapshot.takes) && snapshot.takes.length > 0) {
    setters.setTakes(
      snapshot.takes.map((take) => ({
        ...take,
        notes: take.notes.map((note) => ({ ...note })),
      }))
    );
  }

  if (snapshot.activeTool) {
    setters.setActiveTool(snapshot.activeTool);
  }

  if (snapshot.teleprompterSettings) {
    setters.setTeleprompterSettings(snapshot.teleprompterSettings);
  }

  if (snapshot.exportSettings) {
    setters.setExportSettings(snapshot.exportSettings);
  }

  if (snapshot.comparisonView) {
    setters.setComparisonView(snapshot.comparisonView);
  }

  if (snapshot.notesTakeId !== undefined) {
    setters.setNotesTakeId(snapshot.notesTakeId);
  }
}

function resolveComparisonView(
  state: ComparisonView,
  availableTakes: Take[]
): ComparisonView {
  const takeIds = new Set(availableTakes.map((take) => take.id));
  const nextLeft =
    state.leftTakeId && takeIds.has(state.leftTakeId)
      ? state.leftTakeId
      : (availableTakes[0]?.id ?? null);
  const nextRight =
    state.rightTakeId && takeIds.has(state.rightTakeId)
      ? state.rightTakeId
      : (availableTakes.find((take) => take.id !== nextLeft)?.id ?? null);

  return { ...state, leftTakeId: nextLeft, rightTakeId: nextRight };
}

function resolveCurrentPromptLine(
  promptLines: string[],
  teleprompterPosition: number
): string {
  if (promptLines.length === 0) {
    return "أدخل نصاً لعرضه على التلقين.";
  }

  const lineIndex = Math.min(
    Math.max(Math.floor((teleprompterPosition / 100) * promptLines.length), 0),
    promptLines.length - 1
  );
  return promptLines[lineIndex] ?? promptLines[0] ?? "";
}

function buildExportDetails(
  take: Take,
  blob: Blob,
  exportSettings: ExportSettings
): { fileName: string; finalExtension: string } {
  const recordedExtension = inferExtensionFromMimeType(
    take.mimeType ?? blob.type
  );
  const selectedExtension = exportSettings.format;
  const finalExtension =
    selectedExtension === recordedExtension
      ? selectedExtension
      : recordedExtension;
  const fileName = buildExportFileName({
    actorName: exportSettings.actorName || "actor",
    projectName: exportSettings.projectName || "self-tape",
    roleName: exportSettings.roleName || "scene",
    takeName: take.name,
    extension: finalExtension,
  });
  return { fileName, finalExtension };
}

function buildExportSuccessMessage(
  take: Take,
  selectedExtension: string,
  finalExtension: string,
  includeSlate: boolean
): string {
  const exportSummary =
    selectedExtension === finalExtension
      ? `تم تنزيل ${take.name} بنجاح.`
      : `تم تنزيل ${take.name} بصيغة ${finalExtension} لأن الملف الأصلي سُجِّل بهذه الصيغة.`;
  const slateNotice = includeSlate
    ? " تم تضمين بيانات السليت داخل اسم الملف وإعدادات التصدير، لا داخل الصورة نفسها."
    : "";
  return `${exportSummary}${slateNotice}`;
}

// ─── Hook ───

export function useSelfTapeSuite(options: UseSelfTapeSuiteOptions) {
  const { blobRegistryRef, sessionUrlRegistryRef } = options;

  const [activeTool, setActiveTool] = useState<ActiveTool>("teleprompter");
  const [scriptText, setScriptText] = useState(SAMPLE_SCRIPT);
  const [takes, setTakes] = useState<Take[]>(loadInitialTakes);
  const [isRemoteStateReady, setIsRemoteStateReady] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const [teleprompterSettings, setTeleprompterSettings] =
    useState<TeleprompterSettings>({
      speed: 50,
      fontSize: 32,
      mirrorMode: false,
      highlightCurrentLine: true,
      autoScroll: true,
      countdownSeconds: 5,
    });
  const [teleprompterRunning, setTeleprompterRunning] = useState(false);
  const [teleprompterPosition, setTeleprompterPosition] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [comparisonViewState, setComparisonView] = useState<ComparisonView>({
    leftTakeId: null,
    rightTakeId: null,
    syncPlayback: true,
  });
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    quality: "casting",
    format: "webm",
    includeSlate: true,
    slateDuration: 5,
    actorName: "",
    projectName: "",
    roleName: "",
    agencyName: "",
  });
  const [exportingTakeId, setExportingTakeId] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [notesTakeIdState, setNotesTakeId] = useState<string | null>(null);
  const [manualNoteDrafts, setManualNoteDrafts] = useState<
    Record<string, string>
  >({});
  const [manualNoteTypes, setManualNoteTypes] = useState<
    Record<string, NoteType>
  >({});
  const [exportableTakeIds, setExportableTakeIds] = useState<Set<string>>(
    () => new Set()
  );

  const teleprompterIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );

  // ─── Derived state ───

  const availableTakes = useMemo(
    () => takes.filter((take) => take.status !== "recording"),
    [takes]
  );

  const notesTakeId = useMemo(() => {
    if (availableTakes.length === 0) return null;
    if (
      notesTakeIdState &&
      availableTakes.some((take) => take.id === notesTakeIdState)
    ) {
      return notesTakeIdState;
    }
    return availableTakes[0]?.id ?? null;
  }, [availableTakes, notesTakeIdState]);

  const comparisonView = useMemo<ComparisonView>(
    () => resolveComparisonView(comparisonViewState, availableTakes),
    [availableTakes, comparisonViewState]
  );

  const totalDuration = useMemo(
    () => availableTakes.reduce((sum, take) => sum + take.duration, 0),
    [availableTakes]
  );

  const bestScore = useMemo(
    () => Math.max(...availableTakes.map((take) => take.score ?? 0), 0),
    [availableTakes]
  );

  const bestExportableTake = useMemo(() => {
    return [...availableTakes]
      .filter((take) => exportableTakeIds.has(take.id))
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))[0];
  }, [availableTakes, exportableTakeIds]);

  const promptLines = useMemo(
    () =>
      scriptText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    [scriptText]
  );

  const currentPromptLine = useMemo(
    () => resolveCurrentPromptLine(promptLines, teleprompterPosition),
    [promptLines, teleprompterPosition]
  );

  // ─── Effects ───

  useEffect(() => {
    let cancelled = false;

    void loadRemoteAppState<RemoteSnapshot>("actorai-arabic-self-tape")
      .then((snapshot) => {
        if (cancelled || !snapshot) return;
        applyRemoteSnapshot(snapshot, {
          setScriptText,
          setTakes,
          setActiveTool,
          setTeleprompterSettings,
          setExportSettings,
          setComparisonView,
          setNotesTakeId,
        });
      })
      .catch(() => {
        /* empty */
      })
      .finally(() => {
        if (!cancelled) setIsRemoteStateReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    writeStoredSelfTapeTakes(takes.map(toPersistedTake));
  }, [takes]);

  useEffect(() => {
    if (!isRemoteStateReady) return;

    const timeoutId = window.setTimeout(() => {
      void persistRemoteAppState<import("./types").SelfTapeSuiteSnapshot>(
        "actorai-arabic-self-tape",
        {
          scriptText,
          takes: takes.map(toPersistedTake),
          activeTool,
          teleprompterSettings,
          exportSettings,
          comparisonView,
          notesTakeId,
        }
      ).catch(() => {
        /* empty */
      });
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTool,
    comparisonView,
    exportSettings,
    isRemoteStateReady,
    notesTakeId,
    scriptText,
    takes,
    teleprompterSettings,
  ]);

  useEffect(() => {
    if (!notification) return undefined;
    const timeoutId = setTimeout(() => setNotification(null), 4500);
    return () => clearTimeout(timeoutId);
  }, [notification]);

  useEffect(() => {
    if (!teleprompterRunning || !teleprompterSettings.autoScroll) {
      if (teleprompterIntervalRef.current) {
        clearInterval(teleprompterIntervalRef.current);
        teleprompterIntervalRef.current = null;
      }
      return undefined;
    }

    teleprompterIntervalRef.current = setInterval(() => {
      setTeleprompterPosition((previous) => {
        const nextPosition = previous + teleprompterSettings.speed / 500;
        if (nextPosition >= 100) {
          setTeleprompterRunning(false);
          return 100;
        }
        return nextPosition;
      });
    }, 100);

    return () => {
      if (teleprompterIntervalRef.current) {
        clearInterval(teleprompterIntervalRef.current);
        teleprompterIntervalRef.current = null;
      }
    };
  }, [
    teleprompterRunning,
    teleprompterSettings.autoScroll,
    teleprompterSettings.speed,
  ]);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (teleprompterIntervalRef.current) {
        clearInterval(teleprompterIntervalRef.current);
      }
    };
  }, []);

  // ─── Callbacks ───

  const showNotification = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      setNotification({ type, message });
    },
    []
  );

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const markTakeExportable = useCallback((takeId: string) => {
    setExportableTakeIds((previous) => {
      if (previous.has(takeId)) return previous;
      const next = new Set(previous);
      next.add(takeId);
      return next;
    });
  }, []);

  const markTakeNotExportable = useCallback((takeId: string) => {
    setExportableTakeIds((previous) => {
      if (!previous.has(takeId)) return previous;
      const next = new Set(previous);
      next.delete(takeId);
      return next;
    });
  }, []);

  const revokeTakeResources = useCallback(
    (takeId: string) => {
      const sessionUrl = sessionUrlRegistryRef.current.get(takeId);
      if (sessionUrl) {
        URL.revokeObjectURL(sessionUrl);
        sessionUrlRegistryRef.current.delete(takeId);
      }
      blobRegistryRef.current.delete(takeId);
      markTakeNotExportable(takeId);
    },
    [markTakeNotExportable, blobRegistryRef, sessionUrlRegistryRef]
  );

  const stopTeleprompter = useCallback(() => {
    clearCountdownInterval();
    setCountdown(0);
    setTeleprompterRunning(false);
    if (teleprompterIntervalRef.current) {
      clearInterval(teleprompterIntervalRef.current);
      teleprompterIntervalRef.current = null;
    }
  }, [clearCountdownInterval]);

  const resetTeleprompter = useCallback(() => {
    stopTeleprompter();
    setTeleprompterPosition(0);
  }, [stopTeleprompter]);

  const startTeleprompter = useCallback(() => {
    clearCountdownInterval();

    if (teleprompterSettings.countdownSeconds <= 0) {
      setCountdown(0);
      setTeleprompterRunning(true);
      return;
    }

    setTeleprompterRunning(false);
    setCountdown(teleprompterSettings.countdownSeconds);
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearCountdownInterval();
          setTeleprompterRunning(true);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  }, [clearCountdownInterval, teleprompterSettings.countdownSeconds]);

  const deleteTake = useCallback(
    (takeId: string) => {
      revokeTakeResources(takeId);
      setTakes((previous) => previous.filter((take) => take.id !== takeId));
      showNotification("info", "تم حذف التسجيل المختار.");
    },
    [revokeTakeResources, showNotification]
  );

  const addManualNote = useCallback(
    (takeId: string) => {
      const draft = manualNoteDrafts[takeId]?.trim();
      if (!draft) {
        showNotification("error", "اكتب الملاحظة أولاً قبل إضافتها.");
        return;
      }

      const noteType = manualNoteTypes[takeId] ?? "improvement";

      setTakes((previous) =>
        previous.map((take) => {
          if (take.id !== takeId) return take;

          const manualNote: TakeNote = {
            id: `manual-${Date.now()}`,
            timestamp: Math.round(take.duration / 2),
            type: noteType,
            severity: "neutral",
            content: draft,
            autoGenerated: false,
          };

          return { ...take, notes: [manualNote, ...take.notes] };
        })
      );

      setManualNoteDrafts((previous) => ({ ...previous, [takeId]: "" }));
      showNotification("success", "تمت إضافة الملاحظة اليدوية.");
    },
    [manualNoteDrafts, manualNoteTypes, showNotification]
  );

  const exportTake = useCallback(
    async (takeId: string) => {
      const take = takes.find((currentTake) => currentTake.id === takeId);
      const blob = blobRegistryRef.current.get(takeId);

      if (!take || !blob) {
        showNotification(
          "error",
          "هذا التسجيل متاح كبيانات وصفية فقط. أعد التسجيل للحصول على ملف قابل للتنزيل."
        );
        return;
      }

      setExportingTakeId(takeId);
      setExportProgress(15);
      await delay(80);

      const { fileName, finalExtension } = buildExportDetails(
        take,
        blob,
        exportSettings
      );

      setExportProgress(55);
      await delay(80);

      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = fileName;
      anchor.rel = "noopener";
      anchor.style.display = "none";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setExportProgress(100);
      setTakes((previous) =>
        previous.map((currentTake) =>
          currentTake.id === takeId
            ? { ...currentTake, status: "exported" }
            : currentTake
        )
      );

      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
      showNotification(
        "success",
        buildExportSuccessMessage(
          take,
          exportSettings.format,
          finalExtension,
          exportSettings.includeSlate
        )
      );
      await delay(120);
      setExportingTakeId(null);
      setExportProgress(0);
    },
    [exportSettings, showNotification, takes, blobRegistryRef]
  );

  return {
    activeTool,
    setActiveTool,
    scriptText,
    setScriptText,
    takes,
    setTakes,
    isRemoteStateReady,
    notification,
    teleprompterSettings,
    setTeleprompterSettings,
    teleprompterRunning,
    teleprompterPosition,
    countdown,
    comparisonViewState,
    setComparisonView,
    exportSettings,
    setExportSettings,
    exportingTakeId,
    exportProgress,
    notesTakeIdState,
    setNotesTakeId,
    manualNoteDrafts,
    setManualNoteDrafts,
    manualNoteTypes,
    setManualNoteTypes,
    exportableTakeIds,
    setExportableTakeIds,
    availableTakes,
    notesTakeId,
    comparisonView,
    totalDuration,
    bestScore,
    bestExportableTake,
    currentPromptLine,
    showNotification,
    startTeleprompter,
    stopTeleprompter,
    resetTeleprompter,
    markTakeExportable,
    markTakeNotExportable,
    revokeTakeResources,
    deleteTake,
    addManualNote,
    exportTake,
  };
}

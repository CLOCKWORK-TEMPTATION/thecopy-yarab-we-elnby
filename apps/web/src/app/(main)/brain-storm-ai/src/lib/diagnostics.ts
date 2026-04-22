/**
 * @module diagnostics
 * @description تشخيصات وقياسات جلسات العصف الذهني
 */

/** سجل تشخيصي لوكيل فردي */
export interface AgentDiagnosticEntry {
  agentId: string;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  status: "pending" | "completed" | "error";
  errorMessage?: string;
}

/** توقيت مرحلة واحدة */
export interface PhaseTiming {
  startedAt: string;
  completedAt?: string;
  agentCount: number;
  respondedCount?: number;
}

/** سجل خطأ */
export interface DiagnosticError {
  phase: number;
  error: string;
  retryable: boolean;
  timestamp: string;
}

/** تشخيصات الجلسة الكاملة */
export interface SessionDiagnostics {
  sessionId: string;
  startedAt: string;
  agentEntries: AgentDiagnosticEntry[];
  phaseTimings: Record<number, PhaseTiming>;
  errors: DiagnosticError[];
}

/** إنشاء كائن تشخيصات جلسة جديد */
export function createSessionDiagnostics(
  sessionId: string
): SessionDiagnostics {
  return {
    sessionId,
    startedAt: new Date().toISOString(),
    agentEntries: [],
    phaseTimings: {},
    errors: [],
  };
}

/** إنشاء سجل تشخيصي لوكيل */
export function createAgentDiagnosticEntry(
  agentId: string
): AgentDiagnosticEntry {
  return {
    agentId,
    startedAt: new Date().toISOString(),
    status: "pending",
  };
}

/** إنهاء سجل تشخيصي لوكيل */
export function finalizeAgentDiagnostic(
  entry: AgentDiagnosticEntry,
  status: "completed" | "error",
  errorMessage?: string
): void {
  entry.completedAt = new Date().toISOString();
  entry.durationMs =
    new Date(entry.completedAt).getTime() - new Date(entry.startedAt).getTime();
  entry.status = status;
  if (errorMessage) {
    entry.errorMessage = errorMessage;
  }
}

/** ملخص تشخيصي قابل للعرض */
export interface DiagnosticsSummary {
  totalAgentRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalErrors: number;
  avgDurationMs: number;
  phasesCompleted: number;
}

/** بناء ملخص تشخيصي من بيانات الجلسة */
export function buildDiagnosticsSummary(
  diag: SessionDiagnostics
): DiagnosticsSummary {
  const completed = diag.agentEntries.filter((e) => e.status === "completed");
  const failed = diag.agentEntries.filter((e) => e.status === "error");
  const durations = diag.agentEntries
    .filter((e) => typeof e.durationMs === "number")
    .map((e) => e.durationMs!);

  return {
    totalAgentRuns: diag.agentEntries.length,
    successfulRuns: completed.length,
    failedRuns: failed.length,
    totalErrors: diag.errors.length,
    avgDurationMs:
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
    phasesCompleted: Object.keys(diag.phaseTimings).length,
  };
}

"use client";

/**
 * @fileoverview مكوّن عرض خالص (presentational) لطبقة تشخيص الاستوديو.
 *
 * يستقبل props فقط. لا يقرأ سياقًا ولا hooks خاصة بالصفحة.
 * يُعرَض في الزاوية السفلى اليمنى بخط mono صغير، ويلتزم بـ `aria-live="polite"`
 * و `role="status"` ليُعلَن للقارئ الصوتي عند تغير الحالة.
 */

import * as React from "react";

export interface DiagnosticCameraView {
  permission: string;
  previewType: string | null;
  msSinceLastFrame: number | null;
}

export interface DiagnosticSessionView {
  storageKey: string;
  payloadBytes: number;
  savedAt: string | null;
}

export interface DiagnosticAssistantView {
  isLoading: boolean;
  lastQuestion: string | null;
  answerLength: number;
  error: string | null;
}

export interface DiagnosticViewportView {
  width: number;
  height: number;
}

export interface DiagnosticRenderCountsView {
  studio: number;
  production: number;
}

export interface DiagnosticOverlayProps {
  /** هل الـ overlay ظاهر للمستخدم. */
  visible: boolean;
  camera: DiagnosticCameraView;
  session: DiagnosticSessionView;
  assistant: DiagnosticAssistantView;
  viewport: DiagnosticViewportView;
  renderCounts: DiagnosticRenderCountsView;
}

const labelClass = "text-[#7f7b71]";
const valueClass = "text-[#f6cf72]";
const sectionClass = "border-b border-white/10 pb-2 last:border-b-0 last:pb-0";

/**
 * مكوّن العرض الخالص. لا يحتوي تحديث حالة، يعرض فقط ما يصله من props.
 */
function DiagnosticOverlayInner(props: DiagnosticOverlayProps): React.ReactElement | null {
  if (!props.visible) {
    return null;
  }

  const { camera, session, assistant, viewport, renderCounts } = props;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="cine-diagnostic-overlay"
      className="pointer-events-none fixed bottom-4 right-4 z-[9999] max-w-xs space-y-2 rounded-md border border-white/15 bg-black/70 p-3 font-mono text-[11px] leading-5 text-white shadow-lg backdrop-blur"
    >
      <div className={sectionClass}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e5b54f]">
          Camera
        </p>
        <p>
          <span className={labelClass}>permission </span>
          <span className={valueClass}>{camera.permission}</span>
        </p>
        <p>
          <span className={labelClass}>preview </span>
          <span className={valueClass}>{camera.previewType ?? "—"}</span>
        </p>
        <p>
          <span className={labelClass}>last frame </span>
          <span className={valueClass}>
            {camera.msSinceLastFrame != null
              ? `${camera.msSinceLastFrame} ms`
              : "—"}
          </span>
        </p>
      </div>

      <div className={sectionClass}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e5b54f]">
          Session
        </p>
        <p>
          <span className={labelClass}>key </span>
          <span className="break-all text-[#cdbf99]">{session.storageKey}</span>
        </p>
        <p>
          <span className={labelClass}>payload </span>
          <span className={valueClass}>{session.payloadBytes} B</span>
        </p>
        <p>
          <span className={labelClass}>saved </span>
          <span className={valueClass}>
            {session.savedAt
              ? new Date(session.savedAt).toLocaleTimeString()
              : "—"}
          </span>
        </p>
      </div>

      <div className={sectionClass}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e5b54f]">
          Assistant
        </p>
        <p>
          <span className={labelClass}>loading </span>
          <span className={valueClass}>
            {assistant.isLoading ? "true" : "false"}
          </span>
        </p>
        <p>
          <span className={labelClass}>last Q </span>
          <span className="text-[#cdbf99]">
            {assistant.lastQuestion
              ? truncate(assistant.lastQuestion, 32)
              : "—"}
          </span>
        </p>
        <p>
          <span className={labelClass}>answer </span>
          <span className={valueClass}>{assistant.answerLength} chars</span>
        </p>
        {assistant.error ? (
          <p>
            <span className={labelClass}>error </span>
            <span className="text-[#f3b4b4]">
              {truncate(assistant.error, 40)}
            </span>
          </p>
        ) : null}
      </div>

      <div className={sectionClass}>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e5b54f]">
          Viewport
        </p>
        <p>
          <span className={labelClass}>size </span>
          <span className={valueClass}>
            {viewport.width}×{viewport.height}
          </span>
        </p>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-[#e5b54f]">
          Renders
        </p>
        <p>
          <span className={labelClass}>studio </span>
          <span className={valueClass}>{renderCounts.studio}</span>
          <span className="mx-2 text-[#7f7b71]">|</span>
          <span className={labelClass}>production </span>
          <span className={valueClass}>{renderCounts.production}</span>
        </p>
      </div>
    </div>
  );
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * نسخة مُذكَّرة من المكوّن — تتجنب re-render إذا لم تتغير الـ props بصريًا.
 */
export const DiagnosticOverlay = React.memo(DiagnosticOverlayInner);

export default DiagnosticOverlay;

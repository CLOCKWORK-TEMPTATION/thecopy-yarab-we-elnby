"use client";

import React from "react";

import {
  TYPING_MODE_OPTIONS,
  toLiveIdleMinutesLabel,
} from "../../constants/format-mappings";

import type { TypingSystemSettings } from "../../types";

interface SettingsPanelProps {
  typingSystemSettings: TypingSystemSettings;
  onTypingModeChange: (
    nextMode: TypingSystemSettings["typingSystemMode"]
  ) => void;
  onLiveIdleMinutesChange: (nextMinutes: number) => void;
  onRunExportClassified: () => void;
  onRunProcessNow: () => void;
  lockedEditorFontLabel: string;
  lockedEditorSizeLabel: string;
  supportedLegacyFormatCount: number;
  classifierOptionCount: number;
  actionBlockSpacing: string;
  hasFileImportBackend: boolean;
}

/**
 * لوحة الإعدادات الفرعية داخل الشريط الجانبي.
 *
 * إعادة تصميم بصري فقط: تحولت الألوان من داكن/نيون إلى "بطاقة داخل بطاقة"
 * بيضاء دافئة. جميع callbacks (onTypingModeChange، onLiveIdleMinutesChange،
 * onRunExportClassified، onRunProcessNow) والقيم وترتيب العناصر محفوظة
 * بالكامل كما كانت.
 */
export function SettingsPanel({
  typingSystemSettings,
  onTypingModeChange,
  onLiveIdleMinutesChange,
  onRunExportClassified,
  onRunProcessNow,
  lockedEditorFontLabel,
  lockedEditorSizeLabel,
  supportedLegacyFormatCount,
  classifierOptionCount,
  actionBlockSpacing,
  hasFileImportBackend,
}: SettingsPanelProps): React.JSX.Element {
  const activeTypingMode = TYPING_MODE_OPTIONS.find(
    (option) => option.value === typingSystemSettings.typingSystemMode
  );

  return (
    <div className="app-settings-panel mt-3 space-y-4 p-4 text-right">
      <div className="space-y-1.5">
        <label
          className="block text-xs font-semibold text-[color:var(--mf-text-strong)]"
          htmlFor="typing-system-mode"
        >
          وضع نظام الكتابة
        </label>
        <select
          id="typing-system-mode"
          className="app-settings-select w-full px-3 py-2 text-xs outline-none focus:border-[color:var(--mf-accent)]"
          value={typingSystemSettings.typingSystemMode}
          onChange={(event) =>
            onTypingModeChange(
              event.target.value as TypingSystemSettings["typingSystemMode"]
            )
          }
        >
          {TYPING_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-[color:var(--mf-text-muted)]">
          {activeTypingMode?.description ?? ""}
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-[color:var(--mf-text)]">
          <span className="font-semibold">
            {toLiveIdleMinutesLabel(typingSystemSettings.liveIdleMinutes)}
          </span>
          <span className="text-[color:var(--mf-text-muted)]">
            مهلة المعالجة الحية
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={15}
          step={1}
          value={typingSystemSettings.liveIdleMinutes}
          onChange={(event) =>
            onLiveIdleMinutesChange(Number(event.target.value))
          }
          className="w-full accent-[color:var(--mf-accent)]"
        />
        <div className="flex items-center justify-between text-[10px] text-[color:var(--mf-text-faint)]">
          <span>1</span>
          <span>15</span>
        </div>
      </div>

      <button
        type="button"
        className="app-settings-primary w-full px-3 py-2.5 text-xs font-bold focus-visible:ring-2 focus-visible:ring-[color:var(--mf-accent)]/60 focus-visible:outline-none"
        onClick={onRunExportClassified}
      >
        موافقة واعتماد النص (تصدير)
      </button>

      <button
        type="button"
        className="app-settings-secondary w-full px-3 py-2.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[color:var(--mf-accent)]/60 focus-visible:outline-none"
        onClick={onRunProcessNow}
      >
        تشغيل المعالجة الآن
      </button>

      <div className="app-settings-info space-y-1.5 px-3 py-2.5 text-[10px]">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[color:var(--mf-text)]">
            {lockedEditorFontLabel}
          </span>
          <span className="text-[color:var(--mf-text-muted)]">الخط النشط</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[color:var(--mf-text)]">
            {lockedEditorSizeLabel}pt
          </span>
          <span className="text-[color:var(--mf-text-muted)]">الحجم النشط</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[color:var(--mf-text)]">
            {supportedLegacyFormatCount}
          </span>
          <span className="text-[color:var(--mf-text-muted)]">
            تنسيقات مدعومة
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[color:var(--mf-text)]">
            {classifierOptionCount}
          </span>
          <span className="text-[color:var(--mf-text-muted)]">
            خيارات التصنيف
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold text-[color:var(--mf-text)]">
            {actionBlockSpacing}
          </span>
          <span className="text-[color:var(--mf-text-muted)]">
            تباعد الحدث→الحدث
          </span>
        </div>
      </div>

      <div className="space-y-1 text-[10px] text-[color:var(--mf-text-muted)]">
        <div className="flex items-center justify-between">
          <span
            className={`h-2 w-2 rounded-full ${hasFileImportBackend ? "bg-[color:var(--mf-success)]" : "bg-[color:var(--mf-warning)]"}`}
            aria-hidden="true"
          />
          <span>
            Backend File Extract:{" "}
            {hasFileImportBackend ? "Configured" : "Not configured"}
          </span>
        </div>
      </div>
    </div>
  );
}

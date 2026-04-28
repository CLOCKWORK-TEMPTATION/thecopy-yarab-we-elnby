"use client";

import type { ErrorAlertProps } from "./types";

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div
      className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100"
      style={{ marginTop: "12px" }}
      role="alert"
    >
      {message}
    </div>
  );
}

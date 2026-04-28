interface StatusAlertProps {
  tone: "error" | "success";
  message: string;
}

export function StatusAlert({ tone, message }: StatusAlertProps) {
  if (!message) {
    return null;
  }

  if (tone === "error") {
    return (
      <div
        className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-7 text-red-100"
        style={{ marginBottom: "24px" }}
        role="alert"
      >
        {message}
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-100"
      style={{ marginBottom: "24px" }}
      role="status"
    >
      {message}
    </div>
  );
}

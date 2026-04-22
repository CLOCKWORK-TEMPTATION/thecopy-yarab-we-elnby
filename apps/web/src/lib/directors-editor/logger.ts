type DirectorsEditorLogLevel = "info" | "warn" | "error";

interface DirectorsEditorLogContext {
  event: string;
  message: string;
  data?: Record<string, unknown>;
}

const LOG_SCOPE = "directors-editor-flow";

const emit = (
  level: DirectorsEditorLogLevel,
  context: DirectorsEditorLogContext
): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    scope: LOG_SCOPE,
    level,
    event: context.event,
    message: context.message,
    ...(context.data ? { data: context.data } : {}),
  };

  const serializedPayload = JSON.stringify(payload);

  if (level === "warn") {
    console.warn(serializedPayload);
    return;
  }

  if (level === "error") {
    console.error(serializedPayload);
    return;
  }

  console.info(serializedPayload);
};

export const directorsEditorLogger = {
  info(context: DirectorsEditorLogContext): void {
    emit("info", context);
  },

  warn(context: DirectorsEditorLogContext): void {
    emit("warn", context);
  },

  error(context: DirectorsEditorLogContext): void {
    emit("error", context);
  },
};

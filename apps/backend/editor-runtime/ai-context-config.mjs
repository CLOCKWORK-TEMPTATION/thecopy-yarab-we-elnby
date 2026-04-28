// AI Context Gemini Configuration

const DEFAULT_MODEL = "gemini-3.1-pro-preview";
const MAX_LINES_PER_REQUEST = 500;
const _REQUEST_TIMEOUT_MS = 60_000;

const resolveGeminiConfig = (env = process.env) => {
  const apiKey = (env.GEMINI_API_KEY ?? env.GOOGLE_GENAI_API_KEY ?? "").trim();
  const model = (env.AI_CONTEXT_MODEL ?? DEFAULT_MODEL).trim();
  const enabled =
    (env.AI_CONTEXT_ENABLED ?? "true").trim().toLowerCase() !== "false";

  return { apiKey, model, enabled };
};

export {
  DEFAULT_MODEL,
  MAX_LINES_PER_REQUEST,
  _REQUEST_TIMEOUT_MS,
  resolveGeminiConfig,
};

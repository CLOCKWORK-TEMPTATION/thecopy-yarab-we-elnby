/**
 * @description وسيط CORS للخادم الخلفي
 */

const DEFAULT_ALLOWED_ORIGIN_PATTERNS = [
  /^http:\/\/localhost(?::\d+)?$/iu,
  /^http:\/\/127\.0\.0\.1(?::\d+)?$/iu,
];

const getConfiguredAllowedOrigins = () =>
  (process.env.FILE_IMPORT_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  const configuredOrigins = getConfiguredAllowedOrigins();
  if (configuredOrigins.includes("*")) {
    return true;
  }

  if (configuredOrigins.includes(origin)) {
    return true;
  }

  return DEFAULT_ALLOWED_ORIGIN_PATTERNS.some((pattern) =>
    pattern.test(origin)
  );
};

export const corsMiddleware = (req, res, next) => {
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
    }
  } else if (req.method === "OPTIONS") {
    res.sendStatus(403);
    return;
  }

  res.header("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
  } else {
    next();
  }
};

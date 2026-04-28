import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

export function createTestApp(): express.Application {
  const app = express();
  const allowedOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5000";

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      credentials: true,
      methods: ["GET", "POST", "OPTIONS"],
      origin(origin, callback) {
        if (!origin || origin === allowedOrigin) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin not allowed"));
      },
    }),
  );

  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  const authLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(express.json());
  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (error instanceof SyntaxError) {
        res.status(400).json({ success: false, error: "Malformed JSON" });
        return;
      }

      next(error);
    },
  );

  app.get("/api/health", (_req, res) => {
    res.json({ success: true, status: "ok" });
  });

  app.post("/api/auth/login", authLimiter, (_req, res) => {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  });

  app.post("/api/auth/signup", (_req, res) => {
    res.cookie("session", "test-session", {
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    res.json({
      success: true,
      accessToken: "header.payload.signature",
      user: { id: "user-test", email: "user@example.com" },
    });
  });

  app.get("/api/protected", (_req, res) => {
    res.status(401).json({ success: false, error: "Unauthorized" });
  });

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Request rejected",
      });
    },
  );

  return app;
}

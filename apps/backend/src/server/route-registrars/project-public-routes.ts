import { brainstormController } from "@/controllers/brainstorm.controller";
import { budgetController } from "@/controllers/budget.controller";
import { cineAIController } from "@/controllers/cineai.controller";
import { critiqueController } from "@/controllers/critique.controller";
import {
  createEncryptedDocument,
  deleteEncryptedDocument,
  getEncryptedDocument,
  listEncryptedDocuments,
  updateEncryptedDocument,
} from "@/controllers/encryptedDocs.controller";
import { projectsController } from "@/controllers/projects.controller";
import { styleistController } from "@/controllers/styleist.controller";
import { perUserAiLimiter } from "@/middleware";
import { authMiddleware } from "@/middleware/auth.middleware";
import { csrfProtection } from "@/middleware/csrf.middleware";
import { artDirectorRouter } from "@/modules/art-director/routes";
import { breakappRouter } from "@/modules/breakapp/routes";
import { styleistRouter } from "@/modules/styleist/routes";

import type { Application } from "express";

export function registerProjectAndPublicRoutes(app: Application): void {
  registerCritiqueRoutes(app);
  registerProjectRoutes(app);
  registerEncryptedDocumentRoutes(app);
  registerOperationalRouters(app);
  registerPublicComputeRoutes(app);
}

function registerCritiqueRoutes(app: Application): void {
  app.get(
    "/api/critique/config",
    authMiddleware,
    critiqueController.getAllCritiqueConfigs.bind(critiqueController),
  );
  app.get(
    "/api/critique/config/:taskType",
    authMiddleware,
    critiqueController.getCritiqueConfig.bind(critiqueController),
  );
  app.get(
    "/api/critique/dimensions/:taskType",
    authMiddleware,
    critiqueController.getDimensionDetails.bind(critiqueController),
  );
  app.post(
    "/api/critique/summary",
    authMiddleware,
    csrfProtection,
    critiqueController.getCritiqueSummary.bind(critiqueController),
  );
}

function registerProjectRoutes(app: Application): void {
  app.get(
    "/api/projects",
    authMiddleware,
    projectsController.getProjects.bind(projectsController),
  );
  app.get(
    "/api/projects/:id",
    authMiddleware,
    projectsController.getProject.bind(projectsController),
  );
  app.post(
    "/api/projects",
    authMiddleware,
    csrfProtection,
    projectsController.createProject.bind(projectsController),
  );
  app.put(
    "/api/projects/:id",
    authMiddleware,
    csrfProtection,
    projectsController.updateProject.bind(projectsController),
  );
  app.delete(
    "/api/projects/:id",
    authMiddleware,
    csrfProtection,
    projectsController.deleteProject.bind(projectsController),
  );
  app.post(
    "/api/projects/:id/analyze",
    authMiddleware,
    perUserAiLimiter,
    csrfProtection,
    projectsController.analyzeScript.bind(projectsController),
  );
}

function registerEncryptedDocumentRoutes(app: Application): void {
  app.post(
    "/api/docs",
    authMiddleware,
    csrfProtection,
    createEncryptedDocument,
  );
  app.get("/api/docs/:id", authMiddleware, getEncryptedDocument);
  app.put(
    "/api/docs/:id",
    authMiddleware,
    csrfProtection,
    updateEncryptedDocument,
  );
  app.delete(
    "/api/docs/:id",
    authMiddleware,
    csrfProtection,
    deleteEncryptedDocument,
  );
  app.get("/api/docs", authMiddleware, listEncryptedDocuments);
}

function registerOperationalRouters(app: Application): void {
  app.use("/api/breakapp", breakappRouter);
  app.use("/api/art-director", artDirectorRouter);
}

function registerPublicComputeRoutes(app: Application): void {
  app.post(
    "/api/budget/generate",
    budgetController.generate.bind(budgetController),
  );
  app.post(
    "/api/budget/analyze",
    budgetController.analyze.bind(budgetController),
  );
  app.post(
    "/api/budget/export",
    budgetController.export.bind(budgetController),
  );
  app.get(
    "/api/brainstorm",
    brainstormController.getCatalog.bind(brainstormController),
  );
  app.post(
    "/api/brainstorm",
    brainstormController.conduct.bind(brainstormController),
  );
  app.get(
    "/api/public/brainstorm",
    brainstormController.getCatalog.bind(brainstormController),
  );
  app.post(
    "/api/public/brainstorm",
    brainstormController.conductDebate.bind(brainstormController),
  );
  app.post(
    "/api/styleist/execute",
    styleistController.execute.bind(styleistController),
  );
  app.post(
    "/api/cineai/validate-shot",
    cineAIController.validateShot.bind(cineAIController),
  );
  app.post(
    "/api/cineai/color-grading",
    cineAIController.colorGrading.bind(cineAIController),
  );
  app.use("/api/styleist", authMiddleware, styleistRouter);
}

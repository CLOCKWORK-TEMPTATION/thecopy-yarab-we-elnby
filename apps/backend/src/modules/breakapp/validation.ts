import type { Response } from "express";
import type { ZodError } from "zod";

export function handleValidationError(res: Response, error: ZodError): void {
  res.status(400).json({
    success: false,
    error: "بيانات غير صالحة",
    details: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

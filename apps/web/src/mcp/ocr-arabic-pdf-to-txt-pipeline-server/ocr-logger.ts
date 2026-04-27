/**
 * @description نظام التسجيل لمحول OCR
 */

import util from "node:util";

import { logger } from "@/lib/logger";

const APP_NAME = "MistralOCRPDFConverter";

export function log(
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL",
  message: string,
  ...args: unknown[]
): void {
  const ts = new Date().toISOString();
  const line = `${ts} - ${APP_NAME} - ${level} - ${util.format(message, ...args)}`;
  if (level === "ERROR" || level === "CRITICAL") {
    logger.error(line);
  } else {
    logger.info(line);
  }
}

export { APP_NAME };

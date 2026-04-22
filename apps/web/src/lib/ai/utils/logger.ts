export interface LogLevel {
  ERROR: "error";
  WARN: "warn";
  INFO: "info";
  DEBUG: "debug";
}

export class Logger {
  private logLevel: keyof LogLevel = "INFO";

  setLevel(level: keyof LogLevel) {
    this.logLevel = level;
  }

  private shouldLog(level: keyof LogLevel): boolean {
    const levels = ["DEBUG", "INFO", "WARN", "ERROR"];
    return levels.indexOf(level) >= levels.indexOf(this.logLevel);
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  error(message: string, meta?: any) {
    if (this.shouldLog("ERROR")) {
      console.error(this.formatMessage("error", message, meta));
    }
  }

  warn(message: string, meta?: any) {
    if (this.shouldLog("WARN")) {
      console.warn(this.formatMessage("warn", message, meta));
    }
  }

  info(message: string, meta?: any) {
    if (this.shouldLog("INFO")) {
      console.info(this.formatMessage("info", message, meta));
    }
  }

  debug(message: string, meta?: any) {
    if (this.shouldLog("DEBUG")) {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }
}

export const logger = new Logger();
export default logger;

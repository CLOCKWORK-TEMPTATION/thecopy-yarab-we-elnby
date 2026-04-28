/**
 * fileExtractor.test.ts
 * Tests for the gutted fileExtractor module
 * All functions must throw errors as import is disabled in directors-studio
 */

import { describe, it, expect } from "vitest";

import {
  extractTextFromFile,
  getSupportedFileTypes,
  validateFile,
  FileExtractionError,
  ExtractionErrorType,
} from "../fileExtractor";

function expectExtractionDisabled(error: unknown) {
  expect(error).toBeInstanceOf(FileExtractionError);
  expect((error as FileExtractionError).type).toBe(
    ExtractionErrorType.EXTRACTION_DISABLED
  );
}

async function captureError(action: () => void | Promise<void>) {
  try {
    await action();
  } catch (error) {
    return error;
  }

  throw new Error("Should have thrown");
}

describe("fileExtractor (gutted implementation)", () => {
  describe("extractTextFromFile", () => {
    it("should throw EXTRACTION_DISABLED error", async () => {
      const file = new File(["content"], "script.txt", { type: "text/plain" });

      await expect(extractTextFromFile(file)).rejects.toThrow(
        FileExtractionError
      );
      await expect(extractTextFromFile(file)).rejects.toThrow(/معطّل/);
    });

    it("should throw with correct error type", async () => {
      const file = new File(["content"], "script.pdf", {
        type: "application/pdf",
      });

      const error = await captureError(() => extractTextFromFile(file));
      expect(error).toBeDefined();
      expectExtractionDisabled(error);
    });
  });

  describe("getSupportedFileTypes", () => {
    it("should throw EXTRACTION_DISABLED error", () => {
      expect(() => getSupportedFileTypes()).toThrow(FileExtractionError);
      expect(() => getSupportedFileTypes()).toThrow(/معطّل/);
    });

    it("should throw with correct error type", () => {
      const error = await captureError(() => getSupportedFileTypes());
      expect(error).toBeDefined();
      expectExtractionDisabled(error);
    });
  });

  describe("validateFile", () => {
    it("should throw EXTRACTION_DISABLED error", () => {
      const file = new File(["content"], "script.txt", { type: "text/plain" });

      expect(() => validateFile(file)).toThrow(FileExtractionError);
      expect(() => validateFile(file)).toThrow(/معطّل/);
    });

    it("should throw with correct error type", () => {
      const file = new File(["content"], "script.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const error = await captureError(() => validateFile(file));
      expect(error).toBeDefined();
      expectExtractionDisabled(error);
    });
  });

  describe("FileExtractionError", () => {
    it("should create error with correct type and message", () => {
      const error = new FileExtractionError(
        ExtractionErrorType.EXTRACTION_DISABLED,
        "Test message"
      );

      expect(error.type).toBe(ExtractionErrorType.EXTRACTION_DISABLED);
      expect(error.message).toContain("معطّل");
      expect(error.name).toBe("FileExtractionError");
    });

    it("should create error without details", () => {
      const error = new FileExtractionError(
        ExtractionErrorType.EXTRACTION_DISABLED
      );

      expect(error.type).toBe(ExtractionErrorType.EXTRACTION_DISABLED);
      expect(error.message).toContain("معطّل");
    });
  });
});

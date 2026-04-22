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

      try {
        await extractTextFromFile(file);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(FileExtractionError);
        expect((error as FileExtractionError).type).toBe(
          ExtractionErrorType.EXTRACTION_DISABLED
        );
      }
    });
  });

  describe("getSupportedFileTypes", () => {
    it("should throw EXTRACTION_DISABLED error", () => {
      expect(() => getSupportedFileTypes()).toThrow(FileExtractionError);
      expect(() => getSupportedFileTypes()).toThrow(/معطّل/);
    });

    it("should throw with correct error type", () => {
      try {
        getSupportedFileTypes();
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(FileExtractionError);
        expect((error as FileExtractionError).type).toBe(
          ExtractionErrorType.EXTRACTION_DISABLED
        );
      }
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

      try {
        validateFile(file);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(FileExtractionError);
        expect((error as FileExtractionError).type).toBe(
          ExtractionErrorType.EXTRACTION_DISABLED
        );
      }
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

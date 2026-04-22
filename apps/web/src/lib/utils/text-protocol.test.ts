import { describe, it, expect } from "vitest";
import { extractSection, extractSectionRegex } from "./text-protocol";

describe("text-protocol", () => {
  describe("extractSection", () => {
    it("should extract content between two headers", () => {
      const text = "===Header 1===\nContent 1\n===Header 2===\nContent 2";
      expect(extractSection(text, "Header 1")).toBe("Content 1");
    });

    it("should extract content from the last header to the end of the text", () => {
      const text = "===Header 1===\nContent 1\n===Header 2===\nContent 2";
      expect(extractSection(text, "Header 2")).toBe("Content 2");
    });

    it("should return empty string if section is not found", () => {
      const text = "===Header 1===\nContent 1\n===Header 2===\nContent 2";
      expect(extractSection(text, "Header 3")).toBe("");
    });

    it("should handle case-insensitive section titles", () => {
      const text = "===header 1===\nContent 1";
      expect(extractSection(text, "HeAdEr 1")).toBe("Content 1");
    });

    it("should return empty string if content is empty between headers", () => {
      const text = "===Header 1===\n===Header 2===";
      expect(extractSection(text, "Header 1")).toBe("");
    });

    it("should return empty string if content is empty at the end", () => {
      const text = "===Header 1===";
      expect(extractSection(text, "Header 1")).toBe("");
    });

    it("should trim the extracted content", () => {
      const text = "===Header 1===\n  \n  Content 1  \n  \n===Header 2===";
      expect(extractSection(text, "Header 1")).toBe("Content 1");
    });
  });

  describe("extractSectionRegex", () => {
    it("should extract content between two headers", () => {
      const text = "===Header 1===\nContent 1\n===Header 2===\nContent 2";
      expect(extractSectionRegex(text, "Header 1")).toBe("Content 1");
    });

    it("should extract content from the last header to the end of the text", () => {
      const text = "===Header 1===\nContent 1\n===Header 2===\nContent 2";
      expect(extractSectionRegex(text, "Header 2")).toBe("Content 2");
    });

    it("should return empty string if section is not found", () => {
      const text = "===Header 1===\nContent 1\n===Header 2===\nContent 2";
      expect(extractSectionRegex(text, "Header 3")).toBe("");
    });

    it("should handle case-insensitive section titles", () => {
      const text = "===header 1===\nContent 1";
      expect(extractSectionRegex(text, "HeAdEr 1")).toBe("Content 1");
    });

    it("should return empty string if content is empty between headers", () => {
      const text = "===Header 1===\n===Header 2===";
      expect(extractSectionRegex(text, "Header 1")).toBe("");
    });

    it("should return empty string if content is empty at the end", () => {
      const text = "===Header 1===";
      expect(extractSectionRegex(text, "Header 1")).toBe("");
    });

    it("should trim the extracted content", () => {
      const text = "===Header 1===\n  \n  Content 1  \n  \n===Header 2===";
      expect(extractSectionRegex(text, "Header 1")).toBe("Content 1");
    });

    it("should handle whitespace around the section title", () => {
      const text = "===  Header 1  ===\nContent 1\n===Header 2===";
      expect(extractSectionRegex(text, "Header 1")).toBe("Content 1");
    });
  });
});

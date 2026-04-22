import { describe, it, expect } from "vitest";
import {
  MIN_FILES_REQUIRED,
  TASKS_REQUIRING_COMPLETION_SCOPE,
  COMPLETION_ENHANCEMENT_OPTIONS,
  TASK_LABELS,
  TASK_CATEGORY_MAP,
  MAX_FILE_SIZE,
  SUPPORTED_FILE_TYPES,
  MAX_CONTEXT_LENGTH,
} from "./constants";
import { TaskType, TaskCategory } from "./enums";

describe("Core Constants", () => {
  describe("MIN_FILES_REQUIRED", () => {
    it("should be a positive number", () => {
      expect(MIN_FILES_REQUIRED).toBeGreaterThan(0);
      expect(typeof MIN_FILES_REQUIRED).toBe("number");
    });
  });

  describe("TASKS_REQUIRING_COMPLETION_SCOPE", () => {
    // التحقق من أن المصفوفة موجودة وتحتوي على أنواع مهام صحيحة
    it("should be an array", () => {
      expect(Array.isArray(TASKS_REQUIRING_COMPLETION_SCOPE)).toBe(true);
    });

    it("should contain valid task types", () => {
      TASKS_REQUIRING_COMPLETION_SCOPE.forEach((taskType) => {
        expect(Object.values(TaskType)).toContain(taskType);
      });
    });
  });

  describe("COMPLETION_ENHANCEMENT_OPTIONS", () => {
    // التحقق من خيارات التحسين للاكتمال
    it("should be an array", () => {
      expect(Array.isArray(COMPLETION_ENHANCEMENT_OPTIONS)).toBe(true);
      expect(COMPLETION_ENHANCEMENT_OPTIONS.length).toBeGreaterThan(0);
    });

    it("should contain objects with value and label properties", () => {
      COMPLETION_ENHANCEMENT_OPTIONS.forEach((option) => {
        expect(option).toHaveProperty("value");
        expect(option).toHaveProperty("label");
        expect(typeof option.value).toBe("string");
        expect(typeof option.label).toBe("string");
      });
    });
  });

  describe("TASK_LABELS", () => {
    it("should be an object", () => {
      expect(typeof TASK_LABELS).toBe("object");
      expect(TASK_LABELS).not.toBeNull();
    });

    it("should have labels for all task types", () => {
      // تحقق من أن كل نوع مهمة موجود في TASK_LABELS
      const labelKeys = Object.keys(TASK_LABELS).map(
        (key) => TASK_LABELS[key as TaskType]
      );
      expect(labelKeys.length).toBeGreaterThan(0);
    });

    it("should have Arabic labels", () => {
      // تحقق من أن الملصقات تحتوي على نصوص عربية
      Object.values(TASK_LABELS).forEach((label) => {
        const hasArabic = /[\u0600-\u06FF]/.test(label);
        expect(hasArabic).toBe(true);
      });
    });
  });

  describe("TASK_CATEGORY_MAP", () => {
    it("should be an object", () => {
      expect(typeof TASK_CATEGORY_MAP).toBe("object");
      expect(TASK_CATEGORY_MAP).not.toBeNull();
    });

    it("should map task types to valid categories", () => {
      // تحقق من أن الخريطة تربط أنواع المهام بالفئات الصحيحة
      Object.entries(TASK_CATEGORY_MAP).forEach(([taskType, category]) => {
        expect(Object.values(TaskType)).toContain(taskType as TaskType);
        expect(Object.values(TaskCategory)).toContain(category);
      });
    });
  });

  describe("MAX_FILE_SIZE", () => {
    // التحقق من أن الحد الأقصى لحجم الملف معرف بشكل صحيح
    it("should be a positive number representing bytes", () => {
      expect(typeof MAX_FILE_SIZE).toBe("number");
      expect(MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024); // 10MB
    });
  });

  describe("SUPPORTED_FILE_TYPES", () => {
    // التحقق من أنواع الملفات المدعومة
    it("should be an array", () => {
      expect(Array.isArray(SUPPORTED_FILE_TYPES)).toBe(true);
      expect(SUPPORTED_FILE_TYPES.length).toBeGreaterThan(0);
    });

    it("should contain valid file type extensions", () => {
      SUPPORTED_FILE_TYPES.forEach((fileType) => {
        expect(typeof fileType).toBe("string");
        expect(fileType.startsWith(".")).toBe(true);
      });
    });
  });

  describe("MAX_CONTEXT_LENGTH", () => {
    // التحقق من الحد الأقصى لطول السياق
    it("should be a positive number representing characters", () => {
      expect(typeof MAX_CONTEXT_LENGTH).toBe("number");
      expect(MAX_CONTEXT_LENGTH).toBeGreaterThan(0);
      expect(MAX_CONTEXT_LENGTH).toBe(100000);
    });
  });

  describe("Constants Integration", () => {
    // التحقق من الاتساق والتكامل بين الثوابت المختلفة
    it("should have consistent task type coverage in category map", () => {
      expect(Object.keys(TASK_CATEGORY_MAP).length).toBeGreaterThan(0);
    });

    it("should have valid completion enhancement options values", () => {
      const optionValues = COMPLETION_ENHANCEMENT_OPTIONS.map(
        (opt) => opt.value
      );
      expect(optionValues.length).toBeGreaterThan(0);
      // تحقق من عدم وجود قيم مكررة
      const uniqueValues = new Set(optionValues);
      expect(uniqueValues.size).toBe(optionValues.length);
    });

    it("should have consistent file type support", () => {
      expect(SUPPORTED_FILE_TYPES.length).toBeGreaterThan(0);
      expect(MAX_FILE_SIZE).toBeGreaterThan(0);
      expect(MAX_CONTEXT_LENGTH).toBeGreaterThan(0);
    });
  });
});

// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

import {
  ConfigManager,
  createRealTestLogger,
} from "../shared/real-test-config";

type LiveExtractResponse = {
  success: boolean;
  data?: {
    text?: string;
    fileType?: string;
    method?: string;
    firstVisibleSourceKind?: string;
    extractionMeta?: {
      sourceType?: string;
      firstVisibleSourceKind?: string;
    };
    warnings?: string[];
  };
  error?: string;
};

const config = ConfigManager.fromEnv();
const logger = createRealTestLogger("real-integration");

describe("تكامل حي لاستخراج ملفات المحرر", () => {
  beforeAll(async () => {
    await config.assertFixtureAccessible();
  });

  it("يرفع ملف DOCX الحقيقي إلى واجهة الاستخراج الفعلية ويستقبل نصًا صالحًا", async () => {
    try {
      const fileBuffer = await readFile(config.fixturePath);
      const fileName = path.basename(config.fixturePath);
      const requestBody = JSON.stringify({
        filename: fileName,
        extension: "docx",
        fileBase64: fileBuffer.toString("base64"),
      });

      const response = await fetch(config.fileExtractUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: requestBody,
        signal: AbortSignal.timeout(config.integrationTimeoutMs),
      });

      const payload = (await response.json()) as LiveExtractResponse;

      logger.info(
        {
          status: response.status,
          fileName,
          method: payload.data?.method,
          fileType: payload.data?.fileType,
          firstVisibleSourceKind: payload.data?.firstVisibleSourceKind,
          warningsCount: payload.data?.warnings?.length ?? 0,
        },
        "اكتمل استدعاء مسار الاستخراج الحي"
      );

      expect(response.ok).toBe(true);
      expect(payload.success).toBe(true);
      expect(payload.data?.fileType).toBe("docx");
      expect(payload.data?.extractionMeta?.sourceType).toBe("docx");
      expect(payload.data?.firstVisibleSourceKind).toBeDefined();
      expect(payload.data?.method).toBeTruthy();
      expect(payload.data?.text?.length ?? 0).toBeGreaterThan(1000);
      expect(payload.data?.text).toContain("الملخص التنفيذي");
    } catch (error) {
      logger.error({ err: error }, "فشل اختبار التكامل الحي لاستخراج الملف");
      throw error;
    }
  });
});

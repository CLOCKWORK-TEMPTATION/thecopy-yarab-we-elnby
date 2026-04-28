/**
 * @description متحكم استخراج النصوص من الملفات
 */

import {
  sendJson,
  readRawBody,
  RequestValidationError,
  isHttpTypedError,
  extractErrorCode,
} from "../utils/http-helpers.mjs";
import { ExecFileClassifiedError } from "../exec-file-error-classifier.mjs";
import { parseExtractRequest } from "../services/request-parser.mjs";
import { normalizeExtractionResponseData } from "../services/response-normalizer.mjs";
import {
  extractByType,
  ANTIWORD_PREFLIGHT,
} from "../services/import-pipeline.mjs";

export { ANTIWORD_PREFLIGHT };

export const handleExtract = async (req, res) => {
  try {
    const { filename, extension, buffer } = await parseExtractRequest(
      req,
      readRawBody,
    );
    const extracted = await extractByType(buffer, extension, filename);
    const normalizedData = normalizeExtractionResponseData(
      extracted,
      extension,
    );

    sendJson(res, 200, {
      success: true,
      data: normalizedData,
      meta: {
        filename,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";
    const statusCode = isHttpTypedError(error)
      ? error.statusCode
      : error instanceof RequestValidationError
        ? error.statusCode
        : 500;
    const errorCode = extractErrorCode(error, message);
    const payload = {
      success: false,
      error: message,
      ...(errorCode ? { errorCode } : {}),
    };
    if (error instanceof ExecFileClassifiedError) {
      payload.classifiedError = error.classifiedError;
    }
    sendJson(res, statusCode, payload);
  }
};

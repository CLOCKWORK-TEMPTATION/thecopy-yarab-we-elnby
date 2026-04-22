/**
 * @description خدمات تحليل طلبات الاستخراج (JSON + multipart)
 */

import { extname } from "node:path";
import { RequestValidationError } from "../utils/http-helpers.mjs";
import { normalizeIncomingText, isObjectRecord } from "./text-normalizer.mjs";

const SUPPORTED_EXTENSIONS = new Set([
  "pdf",
  "txt",
  "fountain",
  "fdx",
  "doc",
  "docx",
]);

export const decodeBase64 = (input) => {
  if (!input || typeof input !== "string") {
    throw new Error("Missing fileBase64.");
  }

  const normalized = input.replace(/\s+/g, "");
  if (!normalized) {
    throw new Error("fileBase64 is empty.");
  }

  return Buffer.from(normalized, "base64");
};

export const getRequestContentType = (req) => {
  const header = req.headers["content-type"];
  if (Array.isArray(header)) {
    return header[0] ?? "";
  }
  return header ?? "";
};

export const validateExtractRequestBody = (rawBody) => {
  if (!isObjectRecord(rawBody)) {
    throw new RequestValidationError("Invalid extract request body.");
  }

  const filename = normalizeIncomingText(rawBody.filename, 512) || "document";
  const extension =
    typeof rawBody.extension === "string"
      ? rawBody.extension.trim().toLowerCase()
      : "";
  const fileBase64 =
    typeof rawBody.fileBase64 === "string" ? rawBody.fileBase64.trim() : "";

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new RequestValidationError(
      `Unsupported extension: ${extension || "unknown"}`
    );
  }
  if (!fileBase64) {
    throw new RequestValidationError("Missing fileBase64.");
  }

  return {
    filename,
    extension,
    fileBase64,
  };
};

const parseMultipartBoundary = (contentType) => {
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  const boundary = match?.[1] ?? match?.[2] ?? "";
  if (!boundary) {
    throw new RequestValidationError(
      "Invalid multipart request: boundary is missing."
    );
  }
  return boundary;
};

const decodeMultipartFilename = (rawFilename) =>
  normalizeIncomingText(rawFilename, 512)
    .replace(/^["']|["']$/g, "")
    .replace(/\\/g, "/")
    .split("/")
    .pop();

const parseMultipartContentDisposition = (headerLine) => {
  const line = String(headerLine || "");
  const nameMatch = line.match(/\bname="([^"]+)"/i);
  const filenameMatch = line.match(/\bfilename="([^"]*)"/i);
  return {
    fieldName: nameMatch?.[1] ?? "",
    filename: filenameMatch?.[1] ?? "",
  };
};

const CRLF_BUFFER = Buffer.from("\r\n");
const HEADER_SEPARATOR_BUFFER = Buffer.from("\r\n\r\n");

const trimTrailingCrlf = (buffer) => {
  if (
    buffer.length >= 2 &&
    buffer[buffer.length - 2] === 13 &&
    buffer[buffer.length - 1] === 10
  ) {
    return buffer.subarray(0, -2);
  }
  return buffer;
};

const parseMultipartExtractRequestBody = (rawBody, contentType) => {
  const boundary = parseMultipartBoundary(contentType);
  const boundaryBuffer = Buffer.from(`--${boundary}`, "utf8");
  let searchIndex = 0;

  while (searchIndex < rawBody.length) {
    const boundaryIndex = rawBody.indexOf(boundaryBuffer, searchIndex);
    if (boundaryIndex < 0) {
      break;
    }

    let partStart = boundaryIndex + boundaryBuffer.length;
    const boundarySuffix = rawBody.subarray(partStart, partStart + 2);
    if (boundarySuffix[0] === 45 && boundarySuffix[1] === 45) {
      break;
    }
    if (boundarySuffix[0] === 13 && boundarySuffix[1] === 10) {
      partStart += 2;
    }

    const nextBoundaryIndex = rawBody.indexOf(boundaryBuffer, partStart);
    if (nextBoundaryIndex < 0) {
      break;
    }

    const partBuffer = trimTrailingCrlf(
      rawBody.subarray(partStart, nextBoundaryIndex)
    );
    searchIndex = nextBoundaryIndex;

    if (!partBuffer.length) {
      continue;
    }

    const headerSeparatorIndex = partBuffer.indexOf(HEADER_SEPARATOR_BUFFER);
    if (headerSeparatorIndex < 0) {
      continue;
    }

    const headersRaw = partBuffer
      .subarray(0, headerSeparatorIndex)
      .toString("utf8");
    const bodyBuffer = partBuffer.subarray(
      headerSeparatorIndex + HEADER_SEPARATOR_BUFFER.length
    );
    const headerLines = headersRaw.split(CRLF_BUFFER.toString("utf8"));
    const dispositionHeader = headerLines.find((line) =>
      line.toLowerCase().startsWith("content-disposition:")
    );
    if (!dispositionHeader) {
      continue;
    }

    const { fieldName, filename } =
      parseMultipartContentDisposition(dispositionHeader);
    if (fieldName !== "file") {
      continue;
    }

    const resolvedFilename = decodeMultipartFilename(filename);
    if (!resolvedFilename) {
      throw new RequestValidationError(
        "Invalid multipart request: uploaded file has no filename."
      );
    }

    const extension = extname(resolvedFilename)
      .replace(/^\./, "")
      .toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
      throw new RequestValidationError(
        `Unsupported extension: ${extension || "unknown"}`
      );
    }

    if (!bodyBuffer.length) {
      throw new RequestValidationError("Uploaded file is empty.");
    }

    return {
      filename: resolvedFilename,
      extension,
      buffer: bodyBuffer,
    };
  }

  throw new RequestValidationError(
    "Invalid multipart request: missing file field."
  );
};

export const parseExtractRequest = async (req, readRawBody) => {
  const contentType = getRequestContentType(req);
  const rawBody = await readRawBody(req);

  if (contentType.toLowerCase().includes("multipart/form-data")) {
    return parseMultipartExtractRequestBody(rawBody, contentType);
  }

  const bodyText = rawBody.toString("utf8");
  let parsedBody;
  try {
    parsedBody = JSON.parse(bodyText);
  } catch {
    throw new RequestValidationError("Invalid JSON body.");
  }

  const { filename, extension, fileBase64 } =
    validateExtractRequestBody(parsedBody);
  return {
    filename,
    extension,
    buffer: decodeBase64(fileBase64),
  };
};

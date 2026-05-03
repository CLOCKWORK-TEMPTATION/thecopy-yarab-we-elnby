// واجهة عامة لحزمة @the-copy/api-client
// عميل HTTP موحد يفرض ApiResponse<T> ويمنع الفشل الصامت.

export type {
  ApiErrorCode,
  ApiFailure,
  ApiMeta,
  ApiRequestOptions,
  ApiResponse,
  ApiSuccess,
} from "./types.js";

export {
  ApiError,
  defaultArabicMessage,
  isAbortError,
  isApiError,
  statusToErrorCode,
} from "./errors.js";

export { api, apiFetch } from "./client.js";

export {
  apiFailure,
  apiSuccess,
  errorToFailure,
  generateRequestId,
  statusForCode,
} from "./server.js";

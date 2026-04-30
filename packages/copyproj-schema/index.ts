/**
 * @the-copy/copyproj-schema — نقطة الدخول الموحدة
 */
export {
  CopyprojSchema,
  SUPPORTED_SCHEMA_VERSION,
  validateCopyproj,
  createEmptyCopyproj,
} from "./validate";

export type {
  CopyprojFile,
  ValidateResult,
  ValidateError,
} from "./validate";

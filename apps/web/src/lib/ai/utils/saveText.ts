import { promises as fs } from "fs";
import * as path from "path";

/**
 * حفظ محتوى نصي إلى ملف
 * @param filePath المسار النسبي للملف
 * @param content المحتوى النصي
 */
export async function saveText(
  filePath: string,
  content: string
): Promise<void> {
  // SECURITY FIX: Enhanced path validation to prevent traversal attacks
  if (!filePath || typeof filePath !== "string") {
    throw new Error("SECURITY: File path must be a non-empty string");
  }

  // Check for path traversal attempts
  if (
    filePath.includes("..") ||
    filePath.startsWith("/") ||
    filePath.includes("\\..")
  ) {
    throw new Error("SECURITY: Path traversal attempt detected");
  }

  // Ensure path is relative and within project
  const normalizedPath = path.normalize(filePath);
  if (normalizedPath.startsWith("..") || path.isAbsolute(normalizedPath)) {
    throw new Error(
      "SECURITY: Path must be relative and within project directory"
    );
  }

  const projectRoot = process.cwd();
  const fullPath = path.resolve(projectRoot, normalizedPath);

  // Final security check: ensure resolved path is within project
  if (!fullPath.startsWith(projectRoot + path.sep)) {
    throw new Error("SECURITY: Resolved path is outside project directory");
  }
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf-8");
}

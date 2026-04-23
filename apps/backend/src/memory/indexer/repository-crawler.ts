/* eslint-disable no-console, complexity -- experimental memory module */
/**
 * Repository Crawler
 * زاحف الملفات للمستودع
 */

import { glob } from "glob";
import { open } from "fs/promises";
import path from "path";
import type { FileInfo, CrawlOptions } from "../types";

export class RepositoryCrawler {
  private defaultInclude = [
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "**/*.json",
    "**/*.md",
    "**/*.yaml",
    "**/*.yml",
    "**/*.css",
    "**/*.scss",
  ];

  private defaultExclude = [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/*.min.js",
    "**/*.map",
    "**/coverage/**",
    "**/*.log",
    "**/target/**",
    "**/out/**",
  ];

  private languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    css: "css",
    scss: "scss",
    py: "python",
    go: "go",
    rs: "rust",
    java: "java",
    php: "php",
    rb: "ruby",
  };

  async crawl(options: CrawlOptions): Promise<FileInfo[]> {
    const include = options.include || this.defaultInclude;
    const exclude = options.exclude || this.defaultExclude;
    const maxFileSize = options.maxFileSize || 5 * 1024 * 1024;
    const maxFiles = options.maxFiles || 10000;

    const files: FileInfo[] = [];

    for (const pattern of include) {
      if (files.length >= maxFiles) break;

      try {
        const matches = await glob(pattern, {
          cwd: options.rootPath,
          ignore: exclude,
          absolute: true,
          nodir: true,
        });

        for (const filePath of matches) {
          if (files.length >= maxFiles) break;

          // Skip if already processed
          if (files.some((f) => f.path === filePath)) continue;

          try {
            const handle = await open(filePath, "r");
            try {
              const fileStat = await handle.stat();

              if (fileStat.size > maxFileSize) {
                console.warn(
                  `Skipping large file: ${filePath} (${(fileStat.size / 1024 / 1024).toFixed(2)} MB)`
                );
                continue;
              }

              const content = await handle.readFile("utf-8");
              const extension = path.extname(filePath).slice(1);

              files.push({
                path: filePath,
                relativePath: path.relative(options.rootPath, filePath),
                content,
                size: fileStat.size,
                lastModified: fileStat.mtime,
                language: this.languageMap[extension] || "unknown",
                extension,
              });
            } finally {
              await handle.close();
            }
          } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error processing pattern ${pattern}:`, error);
      }
    }

    return files;
  }

  /**
   * Crawl specific files only
   */
  async crawlSpecific(
    rootPath: string,
    filePaths: string[]
  ): Promise<FileInfo[]> {
    const files: FileInfo[] = [];

    for (const filePath of filePaths) {
      try {
        const absolutePath = path.isAbsolute(filePath)
          ? filePath
          : path.join(rootPath, filePath);

        const handle = await open(absolutePath, "r");
        try {
          const fileStat = await handle.stat();
          const content = await handle.readFile("utf-8");
          const extension = path.extname(absolutePath).slice(1);

          files.push({
            path: absolutePath,
            relativePath: path.relative(rootPath, absolutePath),
            content,
            size: fileStat.size,
            lastModified: fileStat.mtime,
            language: this.languageMap[extension] || "unknown",
            extension,
          });
        } finally {
          await handle.close();
        }
      } catch (error) {
        console.error(`Error reading specific file ${filePath}:`, error);
      }
    }

    return files;
  }

  /**
   * التحقق مما إذا كان الملف يحتاج إلى إعادة فهرسة
   */
  async shouldReindex(
    _lastIndexedCommit: string  ): Promise<boolean> {
    // TODO: استخدام git diff للتحقق من التغييرات
    return true;
  }

  /**
   * تجميع الملفات حسب النوع
   */
  groupByType(files: FileInfo[]): Record<string, FileInfo[]> {
    return files.reduce((acc, file) => {
      const type = this.getFileType(file);
      if (!acc[type]) acc[type] = [];
      acc[type].push(file);
      return acc;
    }, {} as Record<string, FileInfo[]>);
  }

  /**
   * استخراج الواردات (imports) من الكود
   */
  extractImports(content: string, language: string): string[] {
    const imports: string[] = [];

    if (language === "typescript" || language === "javascript") {
      // ES6 imports
      const es6Matches = content.matchAll(
        /import\s+(?:(?:{[^}]*}|[^'"]*)\s+from\s+)?['"]([^'"]+)['"];?/g
      );
      for (const match of es6Matches) {
        const importPath = match[1];
        if (importPath) {
          imports.push(importPath);
        }
      }

      // CommonJS requires
      const cjsMatches = content.matchAll(/require\(['"]([^'"]+)['"]\)/g);
      for (const match of cjsMatches) {
        const importPath = match[1];
        if (importPath) {
          imports.push(importPath);
        }
      }
    }

    return [...new Set(imports)];
  }

  /**
   * استخراج الصادرات (exports)
   */
  extractExports(content: string, language: string): string[] {
    const exports: string[] = [];

    if (language === "typescript" || language === "javascript") {
      // Named exports
      const namedMatches = content.matchAll(
        /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g
      );
      for (const match of namedMatches) {
        const exportName = match[1];
        if (exportName) {
          exports.push(exportName);
        }
      }

      // Default exports
      const defaultMatches = content.matchAll(
        /export\s+default\s+(?:class|function)?\s*(\w+)?/g
      );
      for (const match of defaultMatches) {
        if (match[1]) exports.push(match[1]);
      }
    }

    return [...new Set(exports)];
  }

  /**
   * استخراج أسماء الدوال
   */
  extractFunctions(content: string, language: string): string[] {
    const functions: string[] = [];

    if (language === "typescript" || language === "javascript") {
      const matches = content.matchAll(
        /(?:function|const|let|var)\s+(\w+)\s*[=:]*\s*(?:\([^)]*\)|.*?=>)/g
      );
      for (const match of matches) {
        const functionName = match[1];
        if (functionName) {
          functions.push(functionName);
        }
      }
    }

    return [...new Set(functions)];
  }

  /**
   * استخراج أسماء الكلاسات
   */
  extractClasses(content: string, language: string): string[] {
    const classes: string[] = [];

    if (language === "typescript" || language === "javascript") {
      const matches = content.matchAll(/class\s+(\w+)(?:\s+extends|\s+implements|\s*{)/g);
      for (const match of matches) {
        const className = match[1];
        if (className) {
          classes.push(className);
        }
      }
    }

    return [...new Set(classes)];
  }

  private getFileType(file: FileInfo): string {
    if (file.extension === "md") return "documentation";
    if (["ts", "tsx", "js", "jsx"].includes(file.extension)) return "code";
    if (["json", "yaml", "yml"].includes(file.extension)) return "config";
    return "other";
  }
}

export const repositoryCrawler = new RepositoryCrawler();

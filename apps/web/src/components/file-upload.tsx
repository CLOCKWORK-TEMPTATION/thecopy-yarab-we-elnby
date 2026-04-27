"use client";

import { Upload, File, X, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useCallback } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createModuleLogger } from "@/lib/logger";
import { isUnknownRecord } from "@/lib/utils/unknown-values";

const logger = createModuleLogger("components.file-upload");

interface FileUploadProps {
  onFileContent: (content: string, filename: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
}

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  status: "uploading" | "success" | "error";
  progress: number;
}

interface PdfTextItem {
  str: string;
}

const isPdfTextItem = (item: unknown): item is PdfTextItem =>
  typeof item === "object" &&
  item !== null &&
  "str" in item &&
  typeof (item as { str?: unknown }).str === "string";

export default function FileUpload({
  onFileContent,
  accept = ".pdf,.docx,.txt",
  maxSize = 10,
  className = "",
}: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;

          if (!arrayBuffer) {
            reject(new Error("فشل في قراءة الملف"));
            return;
          }

          if (file.type === "text/plain") {
            // Handle TXT files
            const text = new TextDecoder().decode(arrayBuffer);
            resolve(text);
          } else if (file.type === "application/pdf") {
            // Handle PDF files using PDF.js with proper worker setup
            const pdfjsLib = await import("pdfjs-dist");

            // Use CDN worker that works in production
            pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer })
              .promise;
            let fullText = "";

            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const textItems: unknown[] = Array.isArray(textContent.items)
                ? textContent.items
                : [];
              const pageText = textItems
                .filter(isPdfTextItem)
                .map((item) => item.str)
                .join(" ");
              fullText += pageText + "\n";
            }

            resolve(fullText);
          } else if (
            file.type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          ) {
            // Handle DOCX files using mammoth
            const mammoth = await import("mammoth");
            const result: unknown = await mammoth.extractRawText({
              arrayBuffer,
            });
            if (
              isUnknownRecord(result) &&
              typeof result["value"] === "string"
            ) {
              resolve(result["value"]);
              return;
            }
            reject(new Error("فشل في استخراج نص الملف"));
          } else {
            reject(new Error("نوع الملف غير مدعوم"));
          }
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      };

      reader.onerror = () => reject(new Error("فشل في قراءة الملف"));
      reader.readAsArrayBuffer(file);
    });
  };

  const processFile = useCallback(
    async (file: File) => {
      // Add file to state with uploading status
      const newFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        content: "",
        status: "uploading",
        progress: 0,
      };

      setFiles((prev) => [...prev, newFile]);

      try {
        // Simulate progress
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.name === file.name
                ? { ...f, progress: Math.min(f.progress + 10, 90) }
                : f
            )
          );
        }, 100);

        // Extract text content
        const content = await extractTextFromFile(file);

        clearInterval(progressInterval);

        // Update file status
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name
              ? { ...f, content, status: "success", progress: 100 }
              : f
          )
        );

        // Call callback with content
        onFileContent(content, file.name);
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f.name === file.name ? { ...f, status: "error", progress: 0 } : f
          )
        );
        logger.error(
          { err: error, fileName: file.name },
          "خطأ في معالجة الملف"
        );
      }
    },
    [onFileContent]
  );

  const handleFileSelect = useCallback(
    (selectedFiles: FileList | null) => {
      if (!selectedFiles) return;

      Array.from(selectedFiles).forEach((file) => {
        // Check file size
        if (file.size > maxSize * 1024 * 1024) {
          alert(`الملف ${file.name} كبير جداً. الحد الأقصى ${maxSize}MB`);
          return;
        }

        // Check file type
        const allowedTypes = [
          "text/plain",
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];

        if (!allowedTypes.includes(file.type)) {
          alert(
            `نوع الملف ${file.name} غير مدعوم. الأنواع المدعومة: PDF, DOCX, TXT`
          );
          return;
        }

        processFile(file).catch((error: unknown) => {
          logger.error(
            { err: error, fileName: file.name },
            "خطأ غير متوقع في معالجة الملف"
          );
        });
      });
    },
    [maxSize, processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="p-8 text-center">
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">تحميل الملفات</h3>
          <p className="text-gray-600 mb-4">
            اسحب الملفات هنا أو انقر للاختيار
          </p>
          <p className="text-sm text-gray-500 mb-4">
            الأنواع المدعومة: PDF, DOCX, TXT (حتى {maxSize}MB)
          </p>

          <input
            type="file"
            multiple
            accept={accept}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="file-upload"
          />

          <Button asChild>
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="w-4 h-4 mr-2" />
              اختيار الملفات
            </label>
          </Button>
        </CardContent>
      </Card>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">الملفات المحملة:</h4>
          {files.map((file, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <File className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 space-x-reverse">
                  {file.status === "uploading" && (
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Progress value={file.progress} className="w-20" />
                      <span className="text-xs text-gray-500">
                        {file.progress}%
                      </span>
                    </div>
                  )}

                  {file.status === "success" && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}

                  {file.status === "error" && (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.name)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {file.status === "uploading" && (
                <Progress value={file.progress} className="mt-2" />
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

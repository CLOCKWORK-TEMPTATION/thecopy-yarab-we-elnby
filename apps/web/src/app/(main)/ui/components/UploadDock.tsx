import React from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface UploadDockProps {
  onUpload?: (file: File) => void;
  onFileUpload?: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function UploadDock({
  onUpload,
  onFileUpload,
  accept,
}: UploadDockProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload?.(file);
      onFileUpload?.(file);
    }
  };

  return (
    <div className="border-2 border-dashed rounded-lg p-8 text-center">
      <Upload className="mx-auto h-12 w-12 text-white/55 mb-4" />
      <h3 className="text-lg font-semibold mb-2">رفع ملف</h3>
      <p className="text-sm text-white/55 mb-4">
        اسحب الملف هنا أو اضغط للاختيار
      </p>
      <input
        type="file"
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
        id="file-upload"
      />
      <Button asChild>
        <label htmlFor="file-upload" className="cursor-pointer">
          اختر ملف
        </label>
      </Button>
    </div>
  );
}

import { logger } from "@/lib/ai/utils/logger";

import { useState } from "react";
import { ExportHub } from "@/app/(main)/ui/components/ExportHub";
import { UploadDock } from "@/app/(main)/ui/components/UploadDock";
import { AssetsShelf } from "@/app/(main)/ui/components/AssetsShelf";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FolderOpen } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

export function AssetsPage() {
  const notifications = useNotifications();
  const [hasAssets, setHasAssets] = useState(true);

  const handleUpload = (file: File) => {
    setHasAssets(true);
    notifications.success(`تم رفع ${file.name} بنجاح`);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b border-[var(--color-surface)] bg-[var(--color-panel)] px-6 py-4">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-6 h-6 text-[var(--color-accent)]" />
          <div>
            <h1 className="text-[var(--color-text)]" dir="rtl">
              مكتبة الأصول
            </h1>
            <p className="text-[var(--color-muted)]" dir="rtl">
              إدارة ملفات ومراجع المشروع
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Tabs defaultValue={hasAssets ? "library" : "upload"} dir="rtl">
            <TabsList className="grid w-full grid-cols-2 bg-[var(--color-surface)]">
              <TabsTrigger
                value="upload"
                className="data-[state=active]:bg-[var(--color-accent)] data-[state=active]:text-[var(--color-bg)]"
              >
                <Upload className="w-4 h-4 ml-2" />
                رفع ملفات
              </TabsTrigger>
              <TabsTrigger
                value="library"
                className="data-[state=active]:bg-[var(--color-accent)] data-[state=active]:text-[var(--color-bg)]"
              >
                <FolderOpen className="w-4 h-4 ml-2" />
                المكتبة
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-6">
              <UploadDock onUpload={handleUpload} />
            </TabsContent>

            <TabsContent value="library" className="mt-6">
              <AssetsShelf
                viewMode="grid"
                onAssetSelect={(assetId) => {
                  logger.info("Selected asset:", assetId);
                }}
                onAssetDownload={() => {
                  notifications.success("جاري تحميل الملف...");
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ExportHub scope="full_project" />
    </div>
  );
}
